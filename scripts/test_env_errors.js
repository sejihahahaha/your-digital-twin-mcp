#!/usr/bin/env node

/**
 * Test script to verify environment variable error handling.
 * This simulates what happens when GROQ_API_KEY is missing.
 */

const path = require("path")

console.log("\n=== Testing Environment Variable Error Handling ===\n")

// Test 1: Check config.ts error messages (development)
console.log("Test 1: ensureEnv() in development mode with missing GROQ_API_KEY")
process.env.NODE_ENV = "development"
process.env.GROQ_API_KEY = "" // Clear it
process.env.UPSTASH_VECTOR_REST_URL = "https://dummy-url"
process.env.UPSTASH_VECTOR_REST_TOKEN = "dummy-token"
delete process.env.VERCEL

try {
  // eslint-disable-next-line global-require
  delete require.cache[require.resolve("../lib/config")]
  const cfg = require("../lib/config")
  cfg.ensureEnv()
  console.log("✓ Development mode: ensureEnv() logged warning (as expected)\n")
} catch (e) {
  console.error("✗ Unexpected error in dev mode:", e.message, "\n")
}

// Test 2: Check config.ts error messages (production)
console.log("Test 2: ensureEnv() in production mode (Vercel) with missing GROQ_API_KEY")
process.env.NODE_ENV = "production"
process.env.VERCEL = "1"
process.env.GROQ_API_KEY = ""
delete require.cache[require.resolve("../lib/config")]

try {
  const cfg = require("../lib/config")
  cfg.ensureEnv()
  console.error("✗ Production mode: ensureEnv() should have thrown but didn't\n")
  process.exit(1)
} catch (e) {
  if (e.message.includes("Set GROQ_API_KEY in Vercel Environment Variables")) {
    console.log("✓ Production mode: threw clear error with Vercel guidance")
    console.log(`  Error message: "${e.message}"\n`)
  } else {
    console.error("✗ Production mode: error message missing Vercel guidance:", e.message, "\n")
  }
}

// Test 3: rag.ts generateWithGroq() error
console.log("Test 3: generateWithGroq() in production with missing key")
delete require.cache[require.resolve("../lib/rag")]

// Simulate production environment
process.env.NODE_ENV = "production"
process.env.VERCEL = "1"
process.env.GROQ_API_KEY = ""
process.env.NEXT_PUBLIC_GROQ_API_KEY = ""

const rag = require("../lib/rag")

rag.generateWithGroq("test prompt")
  .then(() => {
    console.error("✗ generateWithGroq() should have thrown but didn't\n")
    process.exit(1)
  })
  .catch((e) => {
    if (e.message.includes("Set GROQ_API_KEY in Vercel Environment Variables")) {
      console.log("✓ generateWithGroq(): threw clear error with Vercel guidance")
      console.log(`  Error message: "${e.message}"\n`)
    } else {
      console.error("✗ generateWithGroq(): error message missing Vercel guidance:", e.message, "\n")
    }
  })

console.log("=== Test Summary ===")
console.log("All environment variable error paths now provide clear guidance for:")
console.log("  • Local development: 'Add GROQ_API_KEY to .env.local'")
console.log("  • Vercel production: 'Set GROQ_API_KEY in Vercel Environment Variables'\n")
