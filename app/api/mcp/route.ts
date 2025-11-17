import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import fs from "fs"
import fsPromises from "fs/promises"
import path from "path"
import { queryVectors, generateWithGroq, buildContextFromProfile, loadProfileFromAppData } from "../../../lib/rag"
import { enhanceQuery, formatForInterview } from "@/lib/ai"
import Groq from "groq-sdk"

// 1. Initialize Groq LLM
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

// Load .env.local explicitly if present. Next normally loads .env.local at startup,
// but being explicit here helps when running the dev server from different CWDs
// or when testing the API in isolation.
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
      console.debug("[api/rag] Loaded env from", p)
      break
    }
  }
} catch (e) {
  // ignore if dotenv not available
}

// In-memory cache for the profile file to avoid repeated disk reads in development.
let cachedProfile: any = null
let cachedProfileMtime = 0

function debugLog(...args: any[]) {
  if (process.env.DEBUG === "1" || process.env.DEBUG === "true") console.debug("[api/rag]", ...args)
}

// POST /api/rag
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}))

    // Handle enhanced query method
    if (payload.method === "enhancedQuery") {
      const userQuestion = payload.params?.question
      if (!userQuestion || typeof userQuestion !== "string") {
        return NextResponse.json({ error: "params.question required" }, { status: 400 })
      }

      try {
        const answer = await enhancedRAGQuery(userQuestion)
        return NextResponse.json({
          jsonrpc: "2.0",
          id: payload.id,
          result: answer,
        })
      } catch (err) {
        console.error("Error in enhancedQuery method:", err)
        return NextResponse.json({
          jsonrpc: "2.0",
          id: payload.id,
          error: { message: String(err), code: -32603 },
        }, { status: 500 })
      }
    }

    // Handle MCP-style "ask" method with LLM enhancement and interview formatting
    if (payload.method === "ask") {
      const userQuestion = payload.params?.question
      if (!userQuestion || typeof userQuestion !== "string") {
        return NextResponse.json({ error: "params.question required" }, { status: 400 })
      }

      try {
        // 1. Enhance query (LLM)
        const enhanced = await enhanceQuery(userQuestion)
        debugLog("Enhanced query:", enhanced)

        // 2. Do RAG search using enhanced query
        // Load the latest profile from app data (falls back to cachedProfile)
        let profileForQuery: any = {}
        try {
          profileForQuery = loadProfileFromAppData()
          // update local cache
          cachedProfile = profileForQuery
        } catch (pfErr) {
          debugLog("Could not load profile from app data, using cached or empty profile:", String(pfErr))
          profileForQuery = cachedProfile || {}
        }

        const chunks = buildContextFromProfile(profileForQuery)
        let topDocs: string[] = []
        try {
          const res = await queryVectors(enhanced, 3)
          for (const r of res ?? []) {
            const meta = (r as any).metadata ?? {}
            if (meta.content) topDocs.push(meta.content)
            else if ((r as any).content) topDocs.push((r as any).content)
          }
          debugLog("Vector search returned docs:", topDocs.length)
        } catch (err) {
          debugLog("Vector search failed, falling back to local search:", String(err))
          const qTokens = enhanced.toLowerCase().split(/\s+/).filter(Boolean)
          const scored = chunks.map((c) => {
            const content = c.content.toLowerCase()
            let score = 0
            for (const t of qTokens) {
              if (!t) continue
              score += (content.split(t).length - 1)
            }
            return { score, content: c.content }
          }).sort((a, b) => b.score - a.score)
          topDocs = scored.filter(s => s.score > 0).slice(0, 3).map(s => s.content)
        }

        if (topDocs.length === 0 && chunks.length > 0) {
          topDocs = chunks.slice(0, Math.min(3, chunks.length)).map(c => c.content)
        }

        // Convert to format expected by formatForInterview
        const ragResults = topDocs.map(doc => ({ text: doc }))

        // 3. Reformat the answer for interview coaching
        const finalResponse = await formatForInterview(ragResults, userQuestion)

        return NextResponse.json({
          id: payload.id,
          result: finalResponse,
          jsonrpc: "2.0",
        })
      } catch (err) {
        console.error("Error in ask method:", err)
        return NextResponse.json({
          id: payload.id,
          error: { message: String(err), code: -32603 },
          jsonrpc: "2.0",
        }, { status: 500 })
      }
    }

    // Existing RAG endpoint behavior
    const question = typeof payload?.question === "string" ? payload.question.trim() : ""
    let topK = Number(payload?.topK ?? 3)
    if (!question) return NextResponse.json({ error: "question required" }, { status: 400 })
    topK = Math.max(1, Math.min(10, isNaN(topK) ? 3 : Math.floor(topK)))

    debugLog("Incoming question:", question, "topK:", topK)

    // Load the profile JSON from disk. Check several likely locations so the
    // API works whether digitaltwin.json is inside the app folder or at repo root.
    const projectRoot = process.cwd()
    const candidates = [
      path.join(projectRoot, "data", "digitaltwin.json"),           // mydigitaltwin/data/digitaltwin.json
      path.join(projectRoot, "digitaltwin.json"),                   // mydigitaltwin/digitaltwin.json
      path.join(projectRoot, "..", "data", "digitaltwin.json"), // repo-root data/digitaltwin.json
      path.join(projectRoot, "..", "digitaltwin.json"),           // repo-root digitaltwin.json
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
      } else {
        debugLog("Profile file not found at", profilePath)
        profile = {}
      }
    } catch (pfErr) {
      console.error("Error reading profile JSON:", pfErr)
      return NextResponse.json({ error: "Failed to load profile data" }, { status: 500 })
    }

    // Build context chunks
    const chunks = buildContextFromProfile(profile)

    // Query Upstash; on error fallback to local search
    let topDocs: string[] = []
    try {
      const res = await queryVectors(question, topK)
      // SDK shape may vary; prefer metadata.content
      for (const r of res ?? []) {
        const meta = (r as any).metadata ?? {}
        if (meta.content) topDocs.push(meta.content)
        else if ((r as any).content) topDocs.push((r as any).content)
      }
      debugLog("Upstash returned docs:", topDocs.length)
    } catch (err) {
      debugLog("Upstash query failed, falling back to local search:", String(err))
      // Efficient local scoring: count token overlaps (lowercase)
      const qTokens = question.toLowerCase().split(/\s+/).filter(Boolean)
      const scored = chunks.map((c) => {
        const content = c.content.toLowerCase()
        let score = 0
        for (const t of qTokens) {
          if (!t) continue
          // count occurrences (cheap) — could be improved with proper vector similarity
          score += (content.split(t).length - 1)
        }
        return { score, content: c.content }
      }).sort((a, b) => b.score - a.score)
      topDocs = scored.filter(s => s.score > 0).slice(0, topK).map(s => s.content)
      debugLog("Local search returned docs:", topDocs.length)
    }

    // If nothing found, provide a few chunks as context for Groq to use
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
      return NextResponse.json({ error: `Groq error: ${String(gerr)}`, context }, { status: 500 })
    }

    // Return structured response with context for debugging and optional sources
    return NextResponse.json({ answer, context, sourcesCount: topDocs.length })
  } catch (e) {
    console.error("Unhandled error in /api/rag:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ============================================================
// 2. Enhanced RAG Query Pattern
// ============================================================
export async function enhancedRAGQuery(userQuestion: string) {
  // Step 1 — Query Preprocessing
  const enhancedQueryText = await preprocessQuery(userQuestion)

  // Step 2 — Vector Search (your existing function)
  const vectorResults = await queryVectors(enhancedQueryText, 3)

  // Step 3 — LLM Post-processing for Interview Context
  const improvedAnswer = await postprocessForInterview(vectorResults, userQuestion)

  return improvedAnswer
}

// ============================================================
// PREPROCESS QUERY — LLM expands & improves search
// ============================================================
async function preprocessQuery(originalQuery: string): Promise<string> {
  const prompt = `
You are an interview preparation assistant. Improve this query for searching
professional experience data.

Original query: ${originalQuery}

Enhanced query must:
- Include synonyms
- Use broader interview-based phrasing
- Expand context for better vector recall
- Stay short (1–2 sentences)

Return ONLY the enhanced query.
  `

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
  })

  return response.choices[0].message.content?.trim() ?? originalQuery
}

// ============================================================
// POST-PROCESS FOR INTERVIEW — Turn raw text into STAR
// ============================================================
async function postprocessForInterview(results: any, originalQuestion: string): Promise<string> {
  const contextText = (results ?? [])
    .map((item: any) => {
      // Handle different result shapes from Upstash
      if (typeof item === "string") return item
      if (item.metadata?.content) return item.metadata.content
      if (item.content) return item.content
      if (item.text) return item.text
      return ""
    })
    .filter(Boolean)
    .join("\n")

  const prompt = `
You are an interview coach.  
Use this professional experience data to answer the interview question.

Interview Question:
${originalQuestion}

Professional Data:
${contextText}

Write a response that:
- Uses STAR framework if appropriate
- Is confident and natural
- Uses specific measurable achievements
- Sounds professional

Final Answer:
  `

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
  })

  return response.choices[0].message.content?.trim() ?? "Unable to generate response"
}
