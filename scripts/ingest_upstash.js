#!/usr/bin/env node
/*
  ingest_upstash.js

  CLI to create an Upstash Vector index (optionally) and ingest a flattened
  `digitaltwin.json` profile into it. Prompts for embedding provider and model.

  Usage (PowerShell):
    node .\mydigitaltwin\scripts\ingest_upstash.js

  Env vars expected (one of the patterns):
    UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN
    or NEXT_PUBLIC_UPSTASH_VECTOR_REST_URL, NEXT_PUBLIC_UPSTASH_VECTOR_REST_TOKEN

  Embedding providers supported:
    - openai: requires OPENAI_API_KEY
    - groq: requires GROQ_API_KEY and optional GROQ_API_URL

  Notes:
    - The script will attempt to create an index via the Upstash REST `indexes`
      endpoint if you choose to. If creation fails, you'll be prompted to create
      the index manually in the Upstash console (or run this script again after fixing credentials).
    - Upstash may reject upserts if the index was not created with an embedding model.
*/

const fs = require("fs")
const path = require("path")
const readline = require("readline")

// Try to load dotenv from common locations without overwriting existing envs
try {
  // Use dynamic require to avoid bundlers attempting to resolve dotenv at build time
  const dynamicRequire = eval("require")
  const dotenv = dynamicRequire ? dynamicRequire("dotenv") : null
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
    path.join(cwd, "../.env.local"),
    path.join(cwd, "../.env"),
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        if (dotenv && typeof dotenv.config === "function") dotenv.config({ path: p })
        break
      }
    } catch (e) {}
  }
} catch (e) {}

const { Index } = (() => {
  try {
    return require("@upstash/vector")
  } catch (e) {
    return { Index: null }
  }
})()

function log(...args) {
  console.log("[ingest]", ...args)
}
function error(...args) {
  console.error("[ingest][error]", ...args)
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans) }))
}

function findProfile() {
  const candidates = [
    path.join(process.cwd(), "data", "digitaltwin.json"),
    path.join(process.cwd(), "digitaltwin.json"),
    path.join(process.cwd(), "mydigitaltwin", "data", "digitaltwin.json"),
    path.join(process.cwd(), "mydigitaltwin", "digitaltwin.json"),
    path.join(__dirname, "..", "data", "digitaltwin.json"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function buildContextFromProfile(profile) {
  const chunks = []
  const personal = profile?.personal ?? {}
  const personalText = `${personal?.name ?? ""}, ${personal?.title ?? ""}. ${personal?.summary ?? ""}`.trim()
  if (personalText) chunks.push({ id: "personal", title: "Personal Info", content: personalText, type: "personal" })

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

async function embedTextOpenAI(model, texts) {
  const key = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY not set in environment")
  const url = "https://api.openai.com/v1/embeddings"
  const body = { model, input: texts }
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`OpenAI embeddings request failed: ${resp.status} ${await resp.text()}`)
  const j = await resp.json()
  // j.data is array of { embedding }
  return j.data.map((d) => d.embedding)
}

async function embedTextGroq(model, texts) {
  const key = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  const apiUrl = process.env.GROQ_API_URL || process.env.NEXT_PUBLIC_GROQ_API_URL || "https://api.groq.ai/v1"
  if (!key) throw new Error("GROQ_API_KEY not set in environment")
  const url = `${apiUrl}/embeddings`
  // attempt batching
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, input: texts }),
  })
  if (!resp.ok) throw new Error(`Groq embeddings request failed: ${resp.status} ${await resp.text()}`)
  const j = await resp.json()
  // assume j.data array like OpenAI
  return j.data.map((d) => d.embedding)
}

async function ensureIndexExists(restUrl, token, indexName, modelName) {
  // Ask user if they want us to try creating index automatically
  const yn = (await prompt(`Attempt to create index "${indexName}" on Upstash automatically? (y/N): `)).trim().toLowerCase()
  if (yn !== "y") return { created: false }

  const createUrl = `${restUrl.replace(/\/$/, "")}/indexes`
  const body = { name: indexName, embedding: { model: modelName } }
  log(`Creating index via ${createUrl} ...`)
  try {
    const resp = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const text = await resp.text()
    if (!resp.ok) {
      error("Index creation failed:", resp.status, text)
      return { created: false, error: text }
    }
    log("Index created (response):", text.substring(0, 1000))
    return { created: true }
  } catch (err) {
    error("Index creation request failed:", err?.message ?? err)
    return { created: false, error: String(err) }
  }
}

async function upsertVectors(index, vectors) {
  // Try a few likely SDK shapes
  try {
    if (!index) throw new Error("Index instance missing")
    if (typeof index.upsert === "function") {
      log("Using SDK upsert(items)")
      // SDK may expect { items: [...] }
      const tryBody = { items: vectors }
      const res = await index.upsert(tryBody)
      return res
    }
    if (typeof index.bulk === "function") {
      log("Using SDK bulk()")
      const res = await index.bulk(vectors)
      return res
    }
    // otherwise try a generic request
    if (typeof index.request === "function") {
      log("Using SDK request() to call upsert")
      const res = await index.request("/upsert", { method: "POST", json: { items: vectors } })
      return res
    }
    throw new Error("No known upsert method on Index SDK instance")
  } catch (err) {
    throw err
  }
}

async function main() {
  log("Starting ingestion script")

  const profilePath = findProfile()
  if (!profilePath) {
    error("digitaltwin.json not found. Put it in data/digitaltwin.json or repo root.")
    process.exit(1)
  }
  log("Using profile:", profilePath)
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"))
  const chunks = buildContextFromProfile(profile)
  if (!chunks.length) {
    error("No chunks created from profile — aborting")
    process.exit(1)
  }
  log(`Created ${chunks.length} chunks from profile`)

  const url = process.env.UPSTASH_VECTOR_REST_URL || process.env.NEXT_PUBLIC_UPSTASH_VECTOR_REST_URL
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN || process.env.NEXT_PUBLIC_UPSTASH_VECTOR_REST_TOKEN
  if (!url || !token) {
    error("UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN must be set in your environment")
    process.exit(1)
  }

  const indexName = (await prompt("Index name to use (default: digitaltwin): ")) || "digitaltwin"

  const provider = (await prompt("Embedding provider ('openai' or 'groq', default 'groq'): ")) || "groq"
  const model = (await prompt("Embedding model name (e.g. 'text-embedding-3-small' or 'groq-embed-1', enter model name): "))
  if (!model) {
    error("Embedding model required — aborting")
    process.exit(1)
  }

  // Optionally attempt to create the index via REST
  await ensureIndexExists(url, token, indexName, model)

  // Generate embeddings
  const texts = chunks.map((c) => c.content)
  log("Generating embeddings for chunks... provider=", provider, "model=", model)
  let embeddings = []
  try {
    if (provider === "openai") embeddings = await embedTextOpenAI(model, texts)
    else embeddings = await embedTextGroq(model, texts)
  } catch (err) {
    error("Embedding generation failed:", err?.message ?? err)
    process.exit(1)
  }

  if (!embeddings || embeddings.length !== texts.length) {
    error("Embedding length mismatch or empty embeddings returned")
    process.exit(1)
  }

  const vectors = chunks.map((c, i) => ({ id: `${indexName}:${c.id}`, vector: embeddings[i], metadata: { title: c.title, type: c.type, content: c.content } }))

  // Instantiate SDK Index and attempt upsert
  let indexInstance = null
  if (Index && Index !== null) {
    try {
      indexInstance = new Index({ url, token })
    } catch (e) {
      log("Failed to construct Index SDK; will try direct REST upsert", e?.message ?? e)
      indexInstance = null
    }
  }

  try {
    if (indexInstance) {
      const resp = await upsertVectors(indexInstance, vectors)
      log("Upsert SDK response:", JSON.stringify(resp).slice(0, 1000))
      log("Ingestion finished — vectors uploaded via SDK")
      return
    }

    // Fallback: try REST upsert endpoint. Upstash Vector REST APIs vary by deployment —
    // we try a best-effort pattern: POST { items: [...] } to `${url}/vectors` or `${url}/indexes/${indexName}/upsert`
    const candidates = [
      `${url.replace(/\/$/, "")}/vectors/upsert`,
      `${url.replace(/\/$/, "")}/indexes`,
      `${url.replace(/\/$/, "")}/indexes/${indexName}/upsert`,
      `${url.replace(/\/$/, "")}/upsert`,
    ]
    let done = false
    for (const c of candidates) {
      try {
        log("Trying REST upsert to", c)
        const r = await fetch(c, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items: vectors }),
        })
        const t = await r.text()
        if (r.ok) {
          log("REST upsert succeeded to", c, "response:", t.slice(0, 1000))
          done = true
          break
        } else {
          log("REST upsert returned non-OK for", c, r.status, t.slice(0, 400))
        }
      } catch (err) {
        log("REST upsert failed for", c, err?.message ?? err)
      }
    }
    if (!done) {
      error("All upsert attempts failed. Common cause: index must be created with an embedding model. Please create an index in the Upstash console with embeddings enabled, then re-run this script.")
      process.exit(1)
    }
    log("Ingestion finished (REST fallback)")
  } catch (err) {
    error("Upsert failed:", err?.message ?? err)
    process.exit(1)
  }
}

main().catch((err) => { error(err?.stack ?? err); process.exit(1) })
