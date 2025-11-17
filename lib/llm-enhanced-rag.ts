// Lightweight Groq SDK wrapper with graceful fallback to fetch-based API.
// This file adds an SDK-based query-enhancement helper. The project already
// contains `generateWithGroq` in `lib/rag.ts`; this helper uses the SDK when
// available for lower boilerplate, and falls back to returning the original
// query on error.

type GroqClient = any

function createGroqClient(): GroqClient | null {
  try {
    // Try common package names. Consumers should run `pnpm add groq`.
    // Use require so this file can be loaded in environments without the SDK.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Groq = require('groq')
    // The SDK may export a default constructor or factory
    const Client = Groq && (Groq.default ?? Groq)
    if (!Client) return null
    return new Client({ apiKey: process.env.GROQ_API_KEY })
  } catch (e) {
    // SDK not installed or failed to initialize
    return null
  }
}

const groqClient = createGroqClient()

export async function enhanceQueryWithSdk(originalQuery: string): Promise<string> {
  if (!groqClient) return originalQuery

  const enhancementPrompt = `Enhance this query for better search: "${originalQuery}"
Add synonyms, variations, and related terms. Return ONLY the enhanced query.`

  try {
    // The SDK surface may vary; attempt common shapes
    if (typeof groqClient.chat?.completions?.create === 'function') {
      const completion = await groqClient.chat.completions.create({
        messages: [{ role: 'user', content: enhancementPrompt }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 150,
      })
      return (completion?.choices?.[0]?.message?.content || originalQuery).trim()
    }

    // Fallback: some SDKs expose a simple `create` method
    if (typeof groqClient.create === 'function') {
      const completion = await groqClient.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: enhancementPrompt }],
        temperature: 0.3,
        max_tokens: 150,
      })
      return (completion?.choices?.[0]?.message?.content || originalQuery).trim()
    }

    return originalQuery
  } catch (err) {
    // Log and return original query as a safe fallback
    // eslint-disable-next-line no-console
    console.warn('enhanceQueryWithSdk failed, falling back to original query:', err?.message ?? err)
    return originalQuery
  }
}

export default enhanceQueryWithSdk

// Named `enhanceQuery` export: prefer SDK implementation, otherwise attempt to
// call the fetch-based enhancer from `lib/rag` at runtime. This keeps the
// module import surface compatible with existing code that imports
// `{ enhanceQuery }` from here.
export async function enhanceQuery(originalQuery: string): Promise<string> {
  if (groqClient) return enhanceQueryWithSdk(originalQuery)

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fetchEnhancer = require('./rag').enhanceQuery
    if (typeof fetchEnhancer === 'function') return await fetchEnhancer(originalQuery)
  } catch (e) {
    // ignore and fallback to original
  }

  return originalQuery
}

/**
 * Format RAG results into an interview-ready response using Groq SDK when available.
 */
export async function formatForInterview(
  ragResults: any[],
  originalQuestion: string
): Promise<string> {
  // Normalize context pieces from common result shapes
  const context = (ragResults || [])
    .map((result) => result?.data ?? result?.text ?? JSON.stringify(result))
    .filter(Boolean)
    .join('\n\n')

  const formattingPrompt = `Q: "${originalQuestion}"

Data:
${context}

Respond in first person, using STAR format with examples and metrics.`

  if (!groqClient) return context || 'Unable to generate response'

  try {
    if (typeof groqClient.chat?.completions?.create === 'function') {
      const completion = await groqClient.chat.completions.create({
        messages: [{ role: 'user', content: formattingPrompt }],
        model: 'llama-3.1-70b-versatile',
        temperature: 0.7,
        max_tokens: 500,
      })
      return (completion?.choices?.[0]?.message?.content || context || 'Unable to generate response').trim()
    }

    if (typeof groqClient.create === 'function') {
      const completion = await groqClient.create({
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: formattingPrompt }],
        temperature: 0.7,
        max_tokens: 500,
      })
      return (completion?.choices?.[0]?.message?.content || context || 'Unable to generate response').trim()
    }

    return context || 'Unable to generate response'
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('formatForInterview failed, falling back to raw context:', err?.message ?? err)
    return context || 'Unable to generate response'
  }
}

