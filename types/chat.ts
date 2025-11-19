/**
 * Core TypeScript interfaces for the chatbot conversation system.
 * Defines types for messages, memory, and conversation context.
 */

export type MessageRole = "user" | "assistant" | "system"

/**
 * Single message in a conversation.
 */
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  metadata?: {
    source?: string
    confidence?: number
    [key: string]: any
  }
}

/**
 * Conversation context with recent messages and metadata.
 */
export interface ConversationContext {
  messages: Message[]
  sessionId: string
  startTime: number
  lastUpdated: number
  totalMessages: number
}

/**
 * Memory storage structure (JSON format).
 */
export interface MemoryStore {
  version: string
  sessionHistory: ConversationContext[]
  globalMessages: Message[]
  lastSaved: number
  metadata: {
    totalConversations: number
    totalMessages: number
    createdAt: number
  }
}

/**
 * Persona definition for the chatbot.
 */
export interface PersonaConfig {
  name: string
  role: string
  personality: {
    traits: string[]
    tone: string
    approachability: string
  }
  speakingPatterns: {
    useContractions: boolean
    conversationalFillers: string[]
    empathyMarkers: string[]
    openingPhrases: string[]
    closingPhrases: string[]
    responseLengthPreference: "short" | "medium" | "detailed"
  }
  knowledgeDomains: string[]
  responseStyle: {
    preferEmojis: boolean
    useHumor: boolean
    formalityLevel: number
    personalityStrength: number
  }
}

/**
 * Response generation context.
 */
export interface ResponseContext {
  userMessage: string
  recentMessages: Message[]
  relevantMemory: Message[]
  persona: PersonaConfig
  timestamp: number
}

/**
 * LLM API response structure.
 */
export interface LLMResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Full chatbot response with metadata.
 */
export interface ChatbotResponse {
  userMessage: string
  assistantMessage: string
  context?: ResponseContext
  timestamp: number
  success: boolean
  error?: string
}
