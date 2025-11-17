import { enhanceQuery } from './llm-enhanced-rag'
import { queryVectors, buildContextFromProfile, generateWithGroq } from './rag'

export const RAG_CONFIGS = {
  technical_interview: {
    queryModel: 'llama-3.1-8b-instant',
    responseModel: 'llama-3.1-70b-versatile',
    temperature: 0.3,
    focusAreas: ['technical skills', 'problem solving', 'architecture', 'code quality'],
    responseStyle: 'detailed technical examples with metrics',
  },

  behavioral_interview: {
    queryModel: 'llama-3.1-8b-instant',
    responseModel: 'llama-3.1-70b-versatile',
    temperature: 0.7,
    focusAreas: ['leadership', 'teamwork', 'communication', 'conflict resolution'],
    responseStyle: 'STAR format stories with emotional intelligence',
  },

  executive_interview: {
    queryModel: 'llama-3.1-70b-versatile',
    responseModel: 'llama-3.1-70b-versatile',
    temperature: 0.5,
    focusAreas: ['strategic thinking', 'business impact', 'vision', 'leadership'],
    responseStyle: 'high-level strategic responses with business metrics',
  },
} as const

export type InterviewType = keyof typeof RAG_CONFIGS

/**
 * Build a context-aware prompt and run the enhanced RAG flow using the
 * selected interview configuration. Returns a generated response string.
 */
export async function contextAwareRAG(question: string, interviewType: InterviewType) {
  const cfg = RAG_CONFIGS[interviewType]

  // Compose a contextualized question that nudges the enhancer and generator
  const contextualQuestion = `This is a ${interviewType.replace(/_/g, ' ')} question. Focus on: ${cfg.focusAreas.join(', ')}. Response style: ${cfg.responseStyle}.\n\nQuestion: ${question}`

  // Step 1: Enhance the question
  let enhancedQuery = question
  try {
    enhancedQuery = await enhanceQuery(contextualQuestion)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[rag-config] enhanceQuery failed, using contextual question:', String(err))
    enhancedQuery = contextualQuestion
  }

  // Step 2: Vector search
  let docs: string[] = []
  try {
    const res = await queryVectors(enhancedQuery, 5)
    for (const r of res ?? []) {
      const meta = (r as any).metadata ?? {}
      if (meta.content) docs.push(meta.content)
      else if ((r as any).content) docs.push((r as any).content)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[rag-config] queryVectors failed, falling back to empty docs:', String(err))
    docs = []
  }

  // Build context string
  const context = docs.join('\n') || ''

  // Step 3: Generate using Groq with configured model and temperature
  const prompt = `Q: ${question}

Context: ${context}

Style: ${cfg.responseStyle}`

  try {
    const response = await generateWithGroq(prompt, cfg.responseModel, 15000)
    return response
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[rag-config] generateWithGroq failed:', String(err))
    // Fallback: return combined context and original question
    return `Context:\n${context}\n\nQuestion:\n${question}`
  }
}
