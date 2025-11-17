import { enhanceQuery, formatForInterview } from './llm-enhanced-rag'
import { queryVectors } from './rag'

export interface RAGMetrics {
  queryEnhancementTime: number
  vectorSearchTime: number
  responseFormattingTime: number
  totalTime: number
  tokensUsed: number
  cacheHitRate: number
}

// Simple in-memory cache for enhanced queries to demonstrate cache hit metrics.
const enhanceCache = new Map<string, { enhanced: string; ts: number }>()
let enhanceRequests = 0
let enhanceHits = 0

/**
 * Run a monitored RAG query and return both the response and performance metrics.
 * This is safe for server-side usage and uses simple in-memory caching for
 * demonstration; for production use, wire to a persistent cache (Redis/Upstash).
 */
export async function monitoredRAGQuery(
  question: string,
  opts?: { topK?: number }
): Promise<{ response: string; metrics: RAGMetrics }> {
  const topK = opts?.topK ?? 3
  const metrics: Partial<RAGMetrics> = {}
  const startTime = Date.now()

  // Query enhancement (with caching)
  const enhanceStart = Date.now()
  enhanceRequests += 1
  let enhancedQuery = question
  try {
    if (enhanceCache.has(question)) {
      const cached = enhanceCache.get(question)!
      enhancedQuery = cached.enhanced
      enhanceHits += 1
    } else {
      enhancedQuery = await enhanceQuery(question)
      try {
        enhanceCache.set(question, { enhanced: enhancedQuery, ts: Date.now() })
      } catch (e) {
        // ignore cache set failures
      }
    }
  } catch (e) {
    // fallback: use original question
    enhancedQuery = question
  }
  metrics.queryEnhancementTime = Date.now() - enhanceStart

  // Vector search
  const searchStart = Date.now()
  let vectorResults: any[] = []
  try {
    const res = await queryVectors(enhancedQuery, topK)
    vectorResults = res ?? []
  } catch (e) {
    // On error, return empty results and continue so formatting can still run
    vectorResults = []
  }
  metrics.vectorSearchTime = Date.now() - searchStart

  // Response formatting
  const formatStart = Date.now()
  let formattedResponse = ''
  try {
    // formatForInterview in `llm-enhanced-rag` accepts (ragResults, originalQuestion)
    formattedResponse = await formatForInterview(vectorResults, question)
  } catch (e) {
    // fallback to a simple concatenation of results
    formattedResponse = (vectorResults || []).map((r) => r?.metadata?.content ?? r?.content ?? JSON.stringify(r)).join('\n\n') || 'No results'
  }
  metrics.responseFormattingTime = Date.now() - formatStart

  metrics.totalTime = Date.now() - startTime
  // tokensUsed is not currently tracked (requires parsing LLM responses or SDK usage)
  metrics.tokensUsed = 0
  metrics.cacheHitRate = enhanceRequests > 0 ? enhanceHits / enhanceRequests : 0

  // Emit metrics to console for now. Production should push to monitoring/traces.
  // eslint-disable-next-line no-console
  console.log('[rag-monitoring] RAG Metrics:', metrics)

  return { response: formattedResponse, metrics: metrics as RAGMetrics }
}

export function clearEnhanceCache() {
  enhanceCache.clear()
  enhanceRequests = 0
  enhanceHits = 0
}
