import { Index } from "@upstash/vector"

// Attempt to load `.env.local` or `.env` from the app folder or repo root at runtime.
// Next.js normally loads environment variables at process start, but when running
// routes locally (or when started in different working directories) being explicit
// helps make the behavior deterministic. This will not overwrite existing env vars.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv")
  const path = require("path")
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
    path.join(cwd, "../", ".env.local"),
    path.join(cwd, "../", "data", ".env.local"),
  ]
  for (const p of candidates) {
    try {
      // safe: only load if file exists
      const fs = require("fs")
      if (fs.existsSync(p)) {
        dotenv.config({ path: p })
        // stop after first successful load
        break
      }
    } catch (e) {
      // continue
    }
  }
} catch (e) {
  // ignore if dotenv is not available
}

/**
 * Simple logger utility. Controlled by `DEBUG` env var.
 */
const DEBUG = process.env.DEBUG === "1" || process.env.DEBUG === "true"
function log(level: "info" | "warn" | "error" | "debug", ...args: any[]) {
  if (level === "debug" && !DEBUG) return
  const prefix = `[rag:${level}]`
  console[level === "info" ? "log" : level](prefix, ...args)
}

// Cache for the Index instance so we don't recreate clients repeatedly.
let cachedIndex: any | null = null

/**
 * Create or return a cached Upstash Index instance.
 * Throws a descriptive error if environment variables are missing.
 */
function getIndex(): any {
  if (cachedIndex) return cachedIndex
  // Accept several env var names used across examples and hosting platforms.
  const url =
    process.env.UPSTASH_VECTOR_REST_URL ||
    process.env.NEXT_PUBLIC_UPSTASH_VECTOR_REST_URL ||
    process.env.UPSTASH_VECTOR_URL ||
    process.env.NEXT_PUBLIC_UPSTASH_VECTOR_URL
  const token =
    process.env.UPSTASH_VECTOR_REST_TOKEN ||
    process.env.NEXT_PUBLIC_UPSTASH_VECTOR_REST_TOKEN ||
    process.env.UPSTASH_VECTOR_TOKEN ||
    process.env.NEXT_PUBLIC_UPSTASH_VECTOR_TOKEN
  if (!url || !token) {
    throw new Error("UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN must be set in environment")
  }
  // The SDK constructor signature may vary; treat instance as any to avoid strict typing issues here.
  cachedIndex = new Index({ url, token }) as any
  return cachedIndex
}

/**
 * Query the Upstash Vector index with a timeout and robust error handling.
 * Returns the raw SDK response or throws an Error.
 */
export async function queryVectors(queryText: string, topK = 3, timeoutMs = 8000): Promise<any> {
  const index = getIndex()
  // Wrap SDK promise with a timeout to avoid hanging requests
  const p = index.query({ data: queryText, topK, includeMetadata: true })
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Upstash query timeout")), timeoutMs))
  try {
    const t0 = Date.now()
    const res = await Promise.race([p, timeout])
    const ms = Date.now() - t0
    log("debug", `Upstash query time: ${ms}ms (topK=${topK})`)
    return res
  } catch (err: any) {
    const em = err?.message ?? String(err)
    // Common situation: index not created with an embedding model
    if (em.includes("Embedding data for this index is not allowed") || em.includes("embedding")) {
      log("warn", "Upstash query failed - index does not support embeddings. Create the Upstash Vector index with an embedding model (e.g. groq-embed-1) or re-create the index via the Upstash console/API. Error:", em)
      // rethrow with actionable hint
      throw new Error("Upstash index not configured for embeddings. Create index with an embedding model (e.g. groq-embed-1) or set up embeddings before upserting/querying. Original: " + em)
    }

    log("warn", "Upstash query failed", em)
    throw err
  }
}

/**
 * Call Groq chat completions API. If `GROQ_API_KEY` is missing we return a safe
 * debug preview so callers can continue testing without secrets.
 */
export async function generateWithGroq(prompt: string, model = "llama-3.1-8b-instant", timeoutMs = 10000): Promise<string> {
  // Accept both server and NEXT_PUBLIC forms.
  const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  // Use Groq's OpenAI-compatible endpoint by default. Allow overriding via env.
  const apiUrl = process.env.GROQ_API_URL || process.env.NEXT_PUBLIC_GROQ_API_URL || "https://api.groq.com/openai/v1"

  if (!apiKey) {
    log("debug", "GROQ_API_KEY not set — returning debug preview")
    return `[DEBUG MODE] Groq key not set. Prompt preview:\n${prompt.slice(0, 2000)}`
  }

  const body = {
    model,
    messages: [
      { role: "system", content: "You are an AI digital twin. Answer questions as if you are the person, speaking in first person about your background, skills, and experience." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const t0 = Date.now()
    const resp = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const text = await resp.text()
      log("error", "Groq API returned non-OK status", resp.status, text.slice(0, 200))
      throw new Error(`Groq API error: ${resp.status} ${text}`)
    }

    const j = await resp.json()
    const ms = Date.now() - t0
    log("debug", `Groq request time: ${ms}ms, model=${model}`)
    // Best-effort parse for several possible response shapes
    return j.choices?.[0]?.message?.content ?? j.choices?.[0]?.text ?? JSON.stringify(j)
  } catch (err: any) {
    // Helpful diagnostics for common network/DNS issues
    const msg = err?.message ?? String(err)
    if (msg.includes("getaddrinfo ENOTFOUND") || msg.includes("ENOTFOUND") || msg.includes("fetch failed")) {
      log("error", "Groq request failed (network/DNS). Ensure GROQ_API_URL is set to 'https://api.groq.com/openai/v1' and network can reach api.groq.com. Error:", msg)
      throw new Error("Groq request failed (network/DNS). Check GROQ_API_URL and network connectivity: " + msg)
    }

    log("error", "Groq request failed", msg)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Build small context chunks from a profile object. This mirrors the Python implementation
 * and is intentionally simple and deterministic.
 */
export function buildContextFromProfile(profile: any) {
  const chunks: { id: string; title: string; content: string; type: string; metadata?: any }[] = []

  const personal = profile?.personal ?? {}
  const salaryLoc = profile?.salary_location ?? {}
  const personalText = `${personal?.name ?? ""}, ${personal?.title ?? ""}. From ${personal?.location ?? "No location"}. ${personal?.summary ?? ""}`.trim()
  if (personalText) chunks.push({ id: "personal", title: "Personal Info", content: personalText, type: "personal" })

  // Add location context as separate chunk for better matches
  const locText = `Based in ${personal?.location ?? ""}. Work preferences: ${(salaryLoc?.location_preferences ?? []).join(", ")}. ${salaryLoc?.work_authorization ?? ""}`.trim()
  if (locText && locText.length > 10) chunks.push({ id: "location", title: "Location Info", content: locText, type: "location" })

  const experiences = profile?.experience ?? []
  for (let i = 0; i < experiences.length; i++) {
    const exp = experiences[i]
    let expText = `${exp?.title ?? ""} at ${exp?.company ?? ""} (${exp?.duration ?? ""}). `
    for (const ach of (exp?.achievements_star ?? [])) {
      expText += `Situation: ${ach?.situation ?? ""}. Task: ${ach?.task ?? ""}. Action: ${ach?.action ?? ""}. Result: ${ach?.result ?? ""}. `
    }
    chunks.push({ id: `exp_${i}`, title: exp?.title ?? "", content: expText.trim(), type: "experience" })
  }

  const skills = profile?.skills ?? {}
  const tech = skills?.technical ?? {}
  const techStr = Object.entries(tech).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")
  const soft = (skills?.soft_skills ?? []).join(", ")
  const skillText = `Technical skills: ${techStr}. Soft skills: ${soft}`.trim()
  if (skillText) chunks.push({ id: "skills", title: "Skills", content: skillText, type: "skills" })

  const projects = profile?.projects_portfolio ?? []
  for (let i = 0; i < projects.length; i++) {
    const proj = projects[i]
    const projText = `${proj?.name ?? ""}: ${proj?.description ?? ""}. Technologies: ${(proj?.technologies ?? []).join(", ")}. Impact: ${proj?.impact ?? ""}.`.trim()
    chunks.push({ id: `proj_${i}`, title: proj?.name ?? "", content: projText, type: "project" })
  }

  return chunks
}

/**
 * Load `digitaltwin.json` from the app's `data/` folder or common fallbacks.
 * Returns parsed JSON or throws.
 */
export function loadProfileFromAppData(): any {
  const fs = require("fs")
  const path = require("path")
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, "data", "digitaltwin.json"),
    path.join(cwd, "digitaltwin.json"),
    path.join(cwd, "mydigitaltwin", "data", "digitaltwin.json"),
    path.join(cwd, "mydigitaltwin", "digitaltwin.json"),
    path.join(__dirname, "..", "data", "digitaltwin.json"),
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf8")
        return JSON.parse(raw)
      }
    } catch (e) {
      // continue to next candidate
    }
  }
  throw new Error("digitaltwin.json not found in app data locations")
}

export type ContextChunk = { id: string; title: string; content: string; type: string }
