import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import fs from "fs"
import fsPromises from "fs/promises"
import path from "path"
import { queryVectors, generateWithGroq, buildContextFromProfile } from "../../../lib/rag"

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

        // Query Upstash
        let topDocs: string[] = []
        try {
          const res = await queryVectors(question, topK)
          for (const r of res ?? []) {
            const meta = (r as any).metadata ?? {}
            if (meta.content) topDocs.push(meta.content)
            else if ((r as any).content) topDocs.push((r as any).content)
          }
          debugLog("Upstash returned docs:", topDocs.length)
        } catch (err) {
          debugLog("Upstash query failed, falling back to local search:", String(err))
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
          topDocs = scored.filter(s => s.score > 0).slice(0, topK).map(s => s.content)
          debugLog("Local search returned docs:", topDocs.length)
        }

        if (topDocs.length === 0 && chunks.length > 0) {
          topDocs = chunks.slice(0, Math.min(3, chunks.length)).map(c => c.content)
          debugLog("No docs found; using fallback chunks count:", topDocs.length)
        }

        const context = topDocs.join("\n")
        const prompt = `Based on the following information about yourself, answer the question.\nSpeak in first person as if you are describing your own background.\n\nYour Information:\n${context}\n\nQuestion: ${question}\n\nProvide a helpful, professional response:`

        let answer: string
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
