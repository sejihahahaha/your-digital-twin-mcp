import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import fs from "fs"
import fsPromises from "fs/promises"
import path from "path"
import { queryVectors, generateWithGroq, buildContextFromProfile } from "../../../lib/rag"

// Load .env.local explicitly if present in dev (Vercel provides env vars directly).
// This helps when running the dev server from different CWDs or testing in isolation.
const shouldLoadDotenv = process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1"
if (shouldLoadDotenv) {
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
    const question = typeof payload?.question === "string" ? payload.question.trim() : ""
    let topK = Number(payload?.topK ?? 3)
    if (!question) return NextResponse.json({ error: "question required" }, { status: 400 })
    topK = Math.max(1, Math.min(10, isNaN(topK) ? 3 : Math.floor(topK)))

    const startMs = Date.now()
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
      const tQueryStart = Date.now()
      const res = await queryVectors(question, topK)
      const tQueryMs = Date.now() - tQueryStart
      debugLog("Timing: upstash_ms", tQueryMs)
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
      const tGenStart = Date.now()
      answer = await generateWithGroq(prompt)
      const tGenMs = Date.now() - tGenStart
      debugLog("Timing: groq_ms", tGenMs, "total_ms", Date.now() - startMs)
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
