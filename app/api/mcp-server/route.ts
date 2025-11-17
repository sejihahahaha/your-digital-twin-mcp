import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import fs from "fs"
import fsPromises from "fs/promises"
import path from "path"
import { queryVectors, generateWithGroq, buildContextFromProfile, enhanceQuery as enhanceQueryFetch, formatForInterview as formatForInterviewFetch } from "../../../lib/rag"
import enhanceQueryWithSdk, { formatForInterview as formatForInterviewSdk } from "../../../lib/llm-enhanced-rag"

// Load .env.local explicitly
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv")
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
    path.join(cwd, "../", ".env.local"),
    path.join(cwd, "../", ".env"),
  ]
  for (const p of candidates) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fsCheck = require("fs")
    if (fsCheck.existsSync(p)) {
      dotenv.config({ path: p })
      break
    }
  }
} catch (e) {
  // ignore
}

let cachedProfile: any = null
let cachedProfileMtime = 0

function debugLog(...args: any[]) {
  if (process.env.DEBUG === "1" || process.env.DEBUG === "true") console.debug("[api/mcp-server]", ...args)
}

// MCP Server implementation: responds to tool calls
// This endpoint is called by mcp-remote via HTTP POST with MCP protocol messages
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}))
    
    // Parse the MCP request
    const jsonrpc = payload?.jsonrpc
    const method = payload?.method
    const params = payload?.params ?? {}
    const id = payload?.id

    debugLog("MCP request:", { method, params, id })

    // Handle MCP lifecycle methods
    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: "digital-twin",
            version: "1.0.0",
          },
        },
      })
    }

    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "query_digital_twin",
              description: "Query your digital twin profile using RAG to answer questions about your skills, experience, and background.",
              inputSchema: {
                type: "object",
                properties: {
                  question: {
                    type: "string",
                    description: "The question to ask your digital twin",
                  },
                  topK: {
                    type: "number",
                    description: "Number of context chunks to retrieve (1-10, default 3)",
                    default: 3,
                  },
                },
                required: ["question"],
              },
            },
            {
              name: "compare_rag",
              description: "Compare basic RAG vs LLM-enhanced RAG for the same question and return both responses with timings.",
              inputSchema: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  topK: { type: "number", default: 3 },
                },
                required: ["question"],
              },
            },
          ],
        },
      })
    }

    if (method === "tools/call") {
      // Accept multiple common request shapes from different MCP clients
      // e.g. { params: { name, arguments } } or { params: { tool, input } }
      const toolName = params?.name ?? params?.tool ?? params?.toolName ?? params?.tool_id ?? params?.toolId
      const toolParams = params?.arguments ?? params?.input ?? params?.args ?? params?.parameters ?? {}

      if (toolName === "query_digital_twin") {
        const question = typeof toolParams?.question === "string" ? toolParams.question.trim() : ""
        const mode = typeof toolParams?.mode === "string" ? toolParams.mode : undefined // optional: 'sdk' or 'fetch'
        let topK = Number(toolParams.topK ?? 3)

        if (!question) {
          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Missing required parameter: question",
            },
          })
        }

        topK = Math.max(1, Math.min(10, isNaN(topK) ? 3 : Math.floor(topK)))

        // Step 1: Enhance the question for better vector search (prefer SDK, fallback to fetch-based)
        debugLog("Enhancing question:", question)
        let enhancedQuestion = question
        try {
          if (typeof enhanceQueryWithSdk === "function") {
            enhancedQuestion = await enhanceQueryWithSdk(question)
          } else {
            enhancedQuestion = await enhanceQueryFetch(question)
          }
          debugLog("Enhanced question:", enhancedQuestion)
        } catch (err) {
          debugLog("Query enhancement failed, continuing with original:", String(err))
          // Fall back to original question if enhancement fails
          enhancedQuestion = question
        }

        // Load profile
        const projectRoot = process.cwd()
        const candidates = [
          path.join(projectRoot, "data", "digitaltwin.json"),
          path.join(projectRoot, "digitaltwin.json"),
          path.join(projectRoot, "..", "data", "digitaltwin.json"),
          path.join(projectRoot, "..", "digitaltwin.json"),
        ]
        let profilePath: string | null = null
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            profilePath = p
            break
          }
        }

        let profile: any = {}
        try {
          if (profilePath && fs.existsSync(profilePath)) {
            const stat = await fsPromises.stat(profilePath)
            if (!cachedProfile || stat.mtimeMs > cachedProfileMtime) {
              const raw = await fsPromises.readFile(profilePath, "utf-8")
              cachedProfile = JSON.parse(raw)
              cachedProfileMtime = stat.mtimeMs
              debugLog("Loaded profile from disk", profilePath)
            }
            profile = cachedProfile
          }
        } catch (pfErr) {
          console.error("Error reading profile JSON:", pfErr)
          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32603,
              message: "Failed to load profile data",
            },
          })
        }

        // Build context chunks
        const chunks = buildContextFromProfile(profile)

        // Step 2: Query Upstash using the enhanced question
        let topDocs: { content: string; chunk: any }[] = []
        try {
          const res = await queryVectors(enhancedQuestion, topK)
          for (const r of res ?? []) {
            const meta = (r as any).metadata ?? {}
            const content = meta.content ?? (r as any).content
            if (content) {
              topDocs.push({ content, chunk: meta })
            }
          }
          debugLog("Upstash returned docs:", topDocs.length)
        } catch (err) {
          debugLog("Upstash query failed, falling back to local search:", String(err))
          const qTokens = enhancedQuestion.toLowerCase().split(/\s+/).filter(Boolean)
          const scored = chunks.map((c) => {
            const content = c.content.toLowerCase()
            let score = 0
            for (const t of qTokens) {
              if (!t) continue
              score += (content.split(t).length - 1)
            }
            return { score, content: c.content, chunk: c }
          }).sort((a, b) => b.score - a.score)
          topDocs = scored.filter(s => s.score > 0).slice(0, topK).map(s => ({ content: s.content, chunk: s.chunk }))
          debugLog("Local search returned docs:", topDocs.length)
        }

        if (topDocs.length === 0 && chunks.length > 0) {
          topDocs = chunks.slice(0, Math.min(3, chunks.length)).map(c => ({ content: c.content, chunk: c }))
          debugLog("No docs found; using fallback chunks count:", topDocs.length)
        }

        // Step 3: Format the answer using interview formatting
        debugLog("Formatting answer for interview")
        let answer: string
        try {
          // Convert topDocs back to context chunks format for formatForInterview
          const contextChunks = topDocs.map(doc => ({
            id: doc.chunk?.id ?? "unknown",
            title: doc.chunk?.title ?? "Context",
            content: doc.content,
            type: doc.chunk?.type ?? "general",
          }))

          // Prefer SDK formatting when available, otherwise use fetch-based formatter
          if (typeof formatForInterviewSdk === "function") {
            answer = await formatForInterviewSdk(contextChunks, question)
          } else {
            answer = await formatForInterviewFetch(question, contextChunks)
          }
          debugLog("Formatted answer length:", answer.length)
        } catch (err) {
          debugLog("Interview formatting failed, using standard generation:", String(err))
          // Fallback to standard Groq generation if formatting fails
          const context = topDocs.map(d => d.content).join("\n")
          const prompt = `Based on the following information about yourself, answer the question.\nSpeak in first person as if you are describing your own background.\n\nYour Information:\n${context}\n\nQuestion: ${question}\n\nProvide a helpful, professional response:`
          try {
            answer = await generateWithGroq(prompt)
          } catch (gerr) {
            console.error("Groq generation error:", gerr)
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32603,
                message: `Groq error: ${String(gerr)}`,
              },
            })
          }
        }

        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: answer,
              },
            ],
          },
        })
      }

      if (toolName === "compare_rag") {
        const question = typeof toolParams?.question === "string" ? toolParams.question.trim() : ""
        let topK = Number(toolParams.topK ?? 3)

        if (!question) {
          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing required parameter: question" },
          })
        }

        topK = Math.max(1, Math.min(10, isNaN(topK) ? 3 : Math.floor(topK)))

        // Load profile (reuse existing logic)
        const projectRoot = process.cwd()
        const candidates = [
          path.join(projectRoot, "data", "digitaltwin.json"),
          path.join(projectRoot, "digitaltwin.json"),
          path.join(projectRoot, "..", "data", "digitaltwin.json"),
          path.join(projectRoot, "..", "digitaltwin.json"),
        ]
        let profilePath: string | null = null
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            profilePath = p
            break
          }
        }

        let profile: any = {}
        try {
          if (profilePath && fs.existsSync(profilePath)) {
            const stat = await fsPromises.stat(profilePath)
            if (!cachedProfile || stat.mtimeMs > cachedProfileMtime) {
              const raw = await fsPromises.readFile(profilePath, "utf-8")
              cachedProfile = JSON.parse(raw)
              cachedProfileMtime = stat.mtimeMs
              debugLog("Loaded profile from disk", profilePath)
            }
            profile = cachedProfile
          }
        } catch (pfErr) {
          console.error("Error reading profile JSON:", pfErr)
          return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32603, message: "Failed to load profile data" } })
        }

        const chunks = buildContextFromProfile(profile)

        // Basic RAG (no LLM enhancement)
        const t0Basic = Date.now()
        let basicResponse = ""
        try {
          // Query Upstash with original question
          let basicDocs: string[] = []
          try {
            const res = await queryVectors(question, topK)
            for (const r of res ?? []) {
              const meta = (r as any).metadata ?? {}
              if (meta.content) basicDocs.push(meta.content)
              else if ((r as any).content) basicDocs.push((r as any).content)
            }
          } catch (e) {
            // fallback to local search
            const qTokens = question.toLowerCase().split(/\s+/).filter(Boolean)
            const scored = chunks.map((c) => {
              const content = c.content.toLowerCase()
              let score = 0
              for (const t of qTokens) {
                if (!t) continue
                score += (content.split(t).length - 1)
              }
              return { score, content: c.content }
            }).sort((a, b) => b.score - a.score)
            basicDocs = scored.filter(s => s.score > 0).slice(0, topK).map(s => s.content)
          }

          const basicContext = basicDocs.join("\n")
          const basicPrompt = `Based on the following information about yourself, answer the question.\nSpeak in first person as if you are describing your own background.\n\nYour Information:\n${basicContext}\n\nQuestion: ${question}\n\nProvide a helpful, professional response:`
          basicResponse = await generateWithGroq(basicPrompt)
        } catch (e) {
          basicResponse = `Basic RAG error: ${String(e)}`
        }
        const t1Basic = Date.now()

        // Enhanced RAG (LLM-enhanced query + LLM formatting)
        const t0Enh = Date.now()
        let enhancedResponse = ""
        let enhancedQuery = question
        try {
          try {
            // prefer SDK helper if available via import
            if (typeof (await Promise.resolve()).then === 'function') {
              // call the named enhanceQuery exported from llm-enhanced-rag
              // it's already imported as enhanceQueryWithSdk via other route code paths
            }
          } catch (_) {}

          // Use the fetch-based enhancer as fallback (enhanceQueryFetch exists)
          try {
            if (mode === 'fetch') {
              enhancedQuery = await enhanceQueryFetch(question)
            } else if (mode === 'sdk') {
              enhancedQuery = typeof enhanceQueryWithSdk === 'function' ? await enhanceQueryWithSdk(question) : question
            } else {
              // default: prefer SDK when available
              enhancedQuery = typeof enhanceQueryWithSdk === 'function' ? await enhanceQueryWithSdk(question) : await enhanceQueryFetch(question)
            }
          } catch (e) {
            enhancedQuery = question
          }

          // Query Upstash with enhanced question
          let enhancedDocs: string[] = []
          try {
            const res = await queryVectors(enhancedQuery, topK)
            for (const r of res ?? []) {
              const meta = (r as any).metadata ?? {}
              if (meta.content) enhancedDocs.push(meta.content)
              else if ((r as any).content) enhancedDocs.push((r as any).content)
            }
          } catch (e) {
            const qTokens = enhancedQuery.toLowerCase().split(/\s+/).filter(Boolean)
            const scored = chunks.map((c) => {
              const content = c.content.toLowerCase()
              let score = 0
              for (const t of qTokens) {
                if (!t) continue
                score += (content.split(t).length - 1)
              }
              return { score, content: c.content, chunk: c }
            }).sort((a, b) => b.score - a.score)
            enhancedDocs = scored.filter(s => s.score > 0).slice(0, topK).map(s => s.content)
          }

          const contextChunks = enhancedDocs.map((c, i) => ({ id: `doc_${i}`, title: `Doc ${i}`, content: c, type: 'retrieved' }))

          // Prefer SDK formatter when available
          try {
            if (typeof formatForInterviewSdk === 'function') {
              enhancedResponse = await formatForInterviewSdk(contextChunks, question)
            } else {
              enhancedResponse = await formatForInterviewFetch(question, contextChunks)
            }
          } catch (e) {
            // fallback to simple generation
            const prompt = `Based on the following information about yourself, answer the question.\nSpeak in first person as if you are describing your own background.\n\nYour Information:\n${enhancedDocs.join('\n')}\n\nQuestion: ${question}\n\nProvide a helpful, professional response:`
            enhancedResponse = await generateWithGroq(prompt)
          }
        } catch (e) {
          enhancedResponse = `Enhanced RAG error: ${String(e)}`
        }
        const t1Enh = Date.now()

        // Return both results with timings and metadata
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            question,
            totalComparisonTime: (t1Enh - t0Basic),
            results: {
              basic: { response: basicResponse, processingTime: t1Basic - t0Basic },
              enhanced: { response: enhancedResponse, processingTime: t1Enh - t0Enh, enhancedQuery },
            },
          },
        })
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Unknown tool: ${toolName}`,
        },
      })
    }

    // Unknown method
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Unknown method: ${method}`,
      },
    })
  } catch (e) {
    console.error("Unhandled error in /api/mcp-server:", e)
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: String(e),
      },
    })
  }
}
