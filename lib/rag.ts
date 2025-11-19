import { Index } from "@upstash/vector"
import loadDotenvIfPresent from "./dotenvLoader"

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
  // Prefer canonical config module values when available
  let url =
    process.env.UPSTASH_VECTOR_REST_URL ||
    process.env.NEXT_PUBLIC_UPSTASH_VECTOR_REST_URL ||
    process.env.UPSTASH_VECTOR_URL ||
    process.env.NEXT_PUBLIC_UPSTASH_VECTOR_URL
  let token =
    process.env.UPSTASH_VECTOR_REST_TOKEN ||
    process.env.NEXT_PUBLIC_UPSTASH_VECTOR_REST_TOKEN ||
    process.env.UPSTASH_VECTOR_TOKEN ||
    process.env.NEXT_PUBLIC_UPSTASH_VECTOR_TOKEN
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require("./config")
    if (cfg) {
      url = url || cfg.UPSTASH_VECTOR_REST_URL
      token = token || cfg.UPSTASH_VECTOR_REST_TOKEN
    }
  } catch (e) {
    // ignore if config cannot be required
  }
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
  // Ensure local .env files are loaded in development, without breaking Vercel/Turbopack builds
  await loadDotenvIfPresent()

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
  } catch (err) {
    // bubble up
    throw err
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
  const locText = `Based in ${personal?.location ?? ""}. Work preferences: ${(salaryLoc?.location_preferences ?? []).join(", ")}. ${salaryLoc?.visa_work_authorization ?? salaryLoc?.work_authorization ?? ""}`.trim()
  if (locText && locText.length > 10) chunks.push({ id: "location", title: "Location Info", content: locText, type: "location" })

  const experiences = profile?.experience ?? []
  const skills = profile?.skills ?? []
  const skillText = Array.isArray(skills) ? (skills as string[]).join(", ") : String(skills ?? "")
  if (skillText) chunks.push({ id: "skills", title: "Skills", content: skillText, type: "skills" })

  // Support different project shapes: `projects_portfolio` or `projects_star_format` from digitaltwin.json
  const projects = profile?.projects_portfolio ?? profile?.projects_star_format ?? []
  for (let i = 0; i < projects.length; i++) {
    const proj = projects[i]
    // If project uses STAR fields, adapt accordingly
    const projText = proj?.project_name
      ? `${proj?.project_name}: Situation: ${proj?.situation ?? ""}. Task: ${proj?.task ?? ""}. Action: ${proj?.action ?? ""}. Result: ${proj?.result ?? ""}. Technologies: ${(proj?.technologies ?? []).join(", ")}.`.trim()
      : `${proj?.name ?? ""}: ${proj?.description ?? ""}. Technologies: ${(proj?.technologies ?? []).join(", ")}. Impact: ${proj?.impact ?? ""}.`.trim()
    chunks.push({ id: `proj_${i}`, title: proj?.project_name ?? proj?.name ?? `Project ${i + 1}`, content: projText, type: "project" })
  }

  // Quantifications and highlights
  const quants = profile?.quantifications ?? []
  for (let i = 0; i < quants.length; i++) {
    const q = quants[i]
    chunks.push({ id: `quant_${i}`, title: `Quantification ${i + 1}`, content: String(q), type: "quantification" })
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

/**
 * Make a chat completion call to Groq (or configured GROQ_API_URL) and return
 * the text content. This lazily loads dotenv if present so local .env files are
 * honored in development but the module won't break Vercel builds.
 */
export async function generateWithGroq(prompt: string, model = "llama-3.1-8b-instant", timeoutMs = 8000): Promise<string> {
  // ensure dotenv is loaded if available (local dev)
  await loadDotenvIfPresent()

  let apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  let apiUrl = process.env.GROQ_API_URL || process.env.NEXT_PUBLIC_GROQ_API_URL || "https://api.groq.com/openai/v1"
  try {
    // prefer canonical config if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require("./config")
    if (cfg) {
      apiKey = apiKey || cfg.GROQ_API_KEY
      apiUrl = apiUrl || cfg.GROQ_API_URL
    }
  } catch (e) {
    // ignore
  }

  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured. Add to .env.local or set in environment")
  }

  const body = {
    model,
    messages: [{ role: "user", content: prompt }],
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
    return (j.choices?.[0]?.message?.content ?? j.choices?.[0]?.text ?? JSON.stringify(j)).toString()
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    log("error", "Groq request failed", msg)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Enhance a user's question for better vector search by using Groq to:
 * - Add synonyms and related terms
 * - Expand with interview-specific context
 * - Improve keyword coverage
 *
 * Example: "Tell me about your leadership" → "Discuss your leadership experience, team management, 
 * mentoring, decision-making, conflict resolution, vision setting, and delegation skills"
 */
export async function enhanceQuery(userQuestion: string): Promise<string> {
  const prompt = `You are an interview preparation assistant. The candidate is preparing to answer interview questions.\n\nUser's original question/request: "${userQuestion}"\n\nImprove and expand this question to be more effective for searching a candidate's profile database. Add relevant synonyms, related terms, and interview-relevant context. Return ONLY the enhanced question, nothing else. Keep it under 150 words.`

  try {

/**
 * Make a chat completion call to Groq (or configured GROQ_API_URL) and return
 * the text content. This lazily loads dotenv if present so local .env files are
 * honored in development but the module won't break Vercel builds.
 */
    const enhanced = await generateWithGroq(prompt, "llama-3.1-8b-instant")
    log("debug", `Query enhanced: "${userQuestion}" → "${enhanced.slice(0, 100)}..."`)
    return enhanced.trim()
  } catch (err: any) {
    log("warn", `Failed to enhance query, using original: ${err?.message}`)
    return userQuestion
  }
}

/**
 * Format search results and original question into a structured interview response using STAR format.
 *
 * Takes the retrieved context chunks and formats them into a compelling, narrative response
 * that answers the original question. Emphasizes Situation, Task, Action, Result where applicable.
 *
 * Example input:
 *   - originalQuestion: "Tell me about your leadership experience"
 *   - contextChunks: [{ content: "Led team of 5..." }, ...]
 *
 * Example output:
 *   "In my role at [Company], I had the opportunity to lead a team of 5 engineers. The situation was...
 *    I took action by... and the result was..."
 */
export async function formatForInterview(
  originalQuestion: string,
  contextChunks: { id: string; title: string; content: string; type: string }[]
): Promise<string> {
  // Build context summary from chunks
  const contextSummary = contextChunks
    .map((chunk) => `[${chunk.type.toUpperCase()}] ${chunk.title}: ${chunk.content}`)
    .join("\n\n")

  const prompt = `You are an experienced interview coach. Your job is to help a candidate prepare a compelling, 
well-structured response to an interview question using provided profile data.

Original Interview Question: "${originalQuestion}"

Available Profile Data:
${contextSummary}

Using the profile data above, create a natural, conversational response to the interview question. 
Follow the STAR format (Situation, Task, Action, Result) where applicable. 
Make the response sound like the candidate speaking in first person about their experience.
Keep the response between 150-300 words. Be specific and use concrete examples from the data.

Return ONLY the formatted response, ready to be used as an interview answer.`

  try {
    const formatted = await generateWithGroq(prompt, "llama-3.1-8b-instant")
    log("debug", `Formatted response (${formatted.length} chars)`)
    return formatted.trim()
  } catch (err: any) {
    log("warn", `Failed to format response, returning raw context: ${err?.message}`)
    // Fallback: return raw context if formatting fails
    return contextSummary
  }
}
