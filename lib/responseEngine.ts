/**
 * ResponseEngine: Core chat logic combining memory + persona + LLM.
 * - Loads relevant memory context
 * - Builds persona-aware prompts
 * - Calls Groq API for response generation
 * - Saves interaction to memory
 */

import ChatMemory from "./chatMemory"
import Persona from "./persona"
import type { ChatbotResponse, ResponseContext, LLMResponse } from "@/types/chat"

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const MODEL = "mixtral-8x7b-32768"

export class ResponseEngine {
  private memory: ChatMemory
  private persona: Persona

  constructor(memory?: ChatMemory, persona?: Persona) {
    this.memory = memory || new ChatMemory()
    this.persona = persona || new Persona()
  }

  /**
   * Initialize the engine (load memory, etc.)
   */
  async initialize(): Promise<void> {
    await this.memory.initialize()
  }

  /**
   * Build response context (user input + recent memory + persona).
   */
  private buildResponseContext(userMessage: string): ResponseContext {
    const recentMessages = this.memory.getRecentMessages(10)
    const relevantMemory = this.memory.searchMemory(userMessage, 3)

    return {
      userMessage,
      recentMessages,
      relevantMemory,
      persona: this.persona.getConfig(),
      timestamp: Date.now(),
    }
  }

  /**
   * Build the full prompt for LLM, incorporating memory and persona.
   */
  private buildPrompt(context: ResponseContext): string {
    const parts: string[] = []

    // System prompt with persona
    const systemPrompt = this.persona.buildSystemPrompt(
      "You are having a conversation with a user. Be helpful, empathetic, and human-like."
    )
    parts.push(`System:\n${systemPrompt}\n`)

    // Relevant memory context
    if (context.relevantMemory.length > 0) {
      parts.push(`Relevant previous conversation:\n`)
      context.relevantMemory.forEach((msg) => {
        parts.push(`- (${msg.role}) ${msg.content}`)
      })
      parts.push("")
    }

    // Recent conversation for context
    if (context.recentMessages.length > 0) {
      parts.push(`Recent conversation:\n`)
      context.recentMessages.slice(-5).forEach((msg) => {
        const role = msg.role === "assistant" ? "Assistant" : "User"
        parts.push(`${role}: ${msg.content}`)
      })
      parts.push("")
    }

    // Current user message
    parts.push(`User: ${context.userMessage}`)
    parts.push(`Assistant:`)

    return parts.join("\n")
  }

  /**
   * Call Groq API to generate response.
   */
  private async callGroqAPI(prompt: string): Promise<string> {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable not set")
    }

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 1,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Groq API error: ${response.status} ${errorData}`)
      }

      const data: LLMResponse = await response.json()
      return data.choices[0].message.content
    } catch (err) {
      console.error("Error calling Groq API:", err)
      throw err
    }
  }

  /**
   * Generate a chatbot response to user message.
   */
  async generateResponse(userMessage: string): Promise<ChatbotResponse> {
    try {
      // Build context
      const context = this.buildResponseContext(userMessage)

      // Add user message to memory
      await this.memory.addMessage("user", userMessage)

      // Build and send prompt to LLM
      const prompt = this.buildPrompt(context)
      const assistantContent = await this.callGroqAPI(prompt)

      // Add assistant response to memory
      await this.memory.addMessage("assistant", assistantContent)

      // Save memory to disk
      await this.memory.saveMemory()

      return {
        userMessage,
        assistantMessage: assistantContent,
        context,
        timestamp: Date.now(),
        success: true,
      }
    } catch (err) {
      console.error("Error generating response:", err)
      return {
        userMessage,
        assistantMessage: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}`,
        context: undefined,
        timestamp: Date.now(),
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  /**
   * Get conversation history for client.
   */
  getConversationHistory() {
    return this.memory.getAllSessionMessages()
  }

  /**
   * Start a new conversation session.
   */
  startNewSession(): void {
    this.memory.startNewSession()
  }
}

export default ResponseEngine
