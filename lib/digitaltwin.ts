import fs from "fs/promises"
import path from "path"
import loadDotenvIfPresent from "./dotenvLoader"

/**
 * Minimal type for the digital twin data used by the app.
 * Extend this as needed for stricter typing.
 */
export interface DigitalTwin {
  personal: {
    name: string
    title?: string
    location?: string
    summary?: string
    elevator_pitch?: string
    contact?: {
      email?: string
      linkedin?: string
      github?: string
      portfolio?: string
    }
  }
  [key: string]: any
}

const CANDIDATE_PATHS = [
  // Prefer app-local copies first (typical with this project layout)
  path.join(process.cwd(), "mydigitaltwin", "data", "digitaltwin.json"),
  path.join(process.cwd(), "mydigitaltwin", "digitaltwin.json"),
  // Then project-level locations
  path.join(process.cwd(), "data", "digitaltwin.json"),
  path.join(process.cwd(), "digitaltwin.json"),
  // Fallbacks (one level up)
  path.join(process.cwd(), "..", "data", "digitaltwin.json"),
  path.join(process.cwd(), "..", "digitaltwin.json"),
]

/**
 * Find the first existing candidate path for digitaltwin.json
 */
async function findDigitalTwinPath(): Promise<string | null> {
  for (const p of CANDIDATE_PATHS) {
    try {
      await fs.access(p)
      return p
    } catch {
      // ignore, try next
    }
  }
  return null
}

/**
 * Validate the parsed JSON has minimal required keys.
 * Throws an Error if validation fails.
 */
function validateDigitalTwin(raw: any, sourcePath: string): asserts raw is DigitalTwin {
  if (!raw || typeof raw !== "object") {
    throw new Error(`digitaltwin.json at ${sourcePath} did not parse to an object`)
  }
  if (!raw.personal || typeof raw.personal !== "object") {
    throw new Error(`digitaltwin.json at ${sourcePath} is missing required key: personal`)
  }
  if (!raw.personal.name || typeof raw.personal.name !== "string") {
    throw new Error(`digitaltwin.json at ${sourcePath} is missing required key: personal.name`)
  }
}

/**
 * Read and return the latest Digital Twin JSON. This function:
 * - Loads `.env.local` (if present) at runtime (development only) via the ESM-safe loader
 * - Searches common candidate paths for `digitaltwin.json`
 * - Reads and parses the file every time it's called (no caching)
 * - Validates minimal required keys and throws helpful errors when missing
 */
export async function getDigitalTwinData(): Promise<DigitalTwin> {
  // Load dotenv *at runtime* if available (this is safe for Vercel builds)
  await loadDotenvIfPresent()

  const filePath = await findDigitalTwinPath()
  if (!filePath) {
    throw new Error(
      `digitaltwin.json not found in any candidate location. Checked: ${CANDIDATE_PATHS.join(", ")}`,
    )
  }

  let raw: string
  try {
    raw = await fs.readFile(filePath, "utf8")
  } catch (err) {
    throw new Error(`Failed to read digitaltwin.json at ${filePath}: ${String(err)}`)
  }

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(`Failed to parse JSON in ${filePath}: ${String(err)}`)
  }

  // Validate minimal structure / required keys
  validateDigitalTwin(parsed, filePath)

  return parsed as DigitalTwin
}

export default getDigitalTwinData
