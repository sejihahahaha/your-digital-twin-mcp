import fs from "fs"
import path from "path"

// Attempt to load .env.local in development (but not in Vercel where env vars are provided directly)
const isProduction = process.env.NODE_ENV === "production"
const isVercel = process.env.VERCEL === "1"

if (!isProduction && !isVercel) {
  try {
    // Prefer .env.local then .env
    const cwd = process.cwd()
    const candidates = [
      path.join(cwd, ".env.local"),
      path.join(cwd, ".env"),
      path.join(cwd, "../", ".env.local"),
    ]
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require("dotenv")
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          dotenv.config({ path: p })
          break
        }
      } catch (e) {
        // ignore and continue
      }
    }
  } catch (e) {
    // ignore if dotenv not installed
  }
}

// Expose canonical names for environment variables used across the app
export const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || ""
export const GROQ_API_URL = process.env.GROQ_API_URL || process.env.NEXT_PUBLIC_GROQ_API_URL || "https://api.groq.com/openai/v1"

export const UPSTASH_VECTOR_REST_URL =
  process.env.UPSTASH_VECTOR_REST_URL || process.env.NEXT_PUBLIC_UPSTASH_VECTOR_REST_URL || process.env.UPSTASH_VECTOR_URL || ""
export const UPSTASH_VECTOR_REST_TOKEN =
  process.env.UPSTASH_VECTOR_REST_TOKEN || process.env.NEXT_PUBLIC_UPSTASH_VECTOR_REST_TOKEN || process.env.UPSTASH_VECTOR_TOKEN || ""

/**
 * Validate required environment variables.
 * - In production (VERCEL=1 or NODE_ENV=production) this throws to fail fast.
 * - In development this will log warnings so local testing can continue.
 */
export function ensureEnv() {
  const inProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"

  const missing: string[] = []
  if (!GROQ_API_KEY) missing.push("GROQ_API_KEY")
  if (!UPSTASH_VECTOR_REST_URL) missing.push("UPSTASH_VECTOR_REST_URL")
  if (!UPSTASH_VECTOR_REST_TOKEN) missing.push("UPSTASH_VECTOR_REST_TOKEN")

  if (missing.length === 0) return

  const msg = `Missing environment variables: ${missing.join(", ")}`
  const guidance = missing.includes("GROQ_API_KEY")
    ? "\n  → Local dev: add GROQ_API_KEY to .env.local\n  → Vercel: set GROQ_API_KEY in Project Settings > Environment Variables"
    : ""

  if (inProd) {
    // Fail fast in production so Vercel deployment fails rather than running insecurely.
    throw new Error(`[ENV] ${msg}.${guidance}`)
  }

  // Development: print friendly debug message
  // eslint-disable-next-line no-console
  console.warn(`[ENV] Warning: ${msg}.${guidance}`)
}

export default {
  GROQ_API_KEY,
  GROQ_API_URL,
  UPSTASH_VECTOR_REST_URL,
  UPSTASH_VECTOR_REST_TOKEN,
  ensureEnv,
}
