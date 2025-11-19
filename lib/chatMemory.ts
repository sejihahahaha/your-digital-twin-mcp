/**
 * ChatMemory: Manages conversation history with persistence and retrieval.
 * - Stores messages in memory.json
 * - Supports semantic search via embedding similarity or string matching fallback
 * - Survives reloads/deployments via filesystem
 */

import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import type { Message, MemoryStore, ConversationContext } from "@/types/chat"

const MEMORY_FILE_PATH = path.join(process.cwd(), "data", "memory.json")
const DEFAULT_MEMORY_FILE = path.join(process.cwd(), "data", "memory.json")

/**
 * Simple string similarity score (0-1) for fallback memory search.
 * Uses token overlap as a basic similarity metric.
 */
function stringSimilarity(a: string, b: string): number {
  const tokensA = a.toLowerCase().split(/\s+/).filter(Boolean)
  const tokensB = b.toLowerCase().split(/\s+/).filter(Boolean)
  const intersection = tokensA.filter((t) => tokensB.includes(t)).length
  const union = Math.max(tokensA.length, tokensB.length)
  return union > 0 ? intersection / union : 0
}

/**
 * Generate a unique message ID.
 */
function generateMessageId(): string {
  return crypto.randomUUID()
}

export class ChatMemory {
  private memory: MemoryStore
  private sessionId: string
  private currentSession: ConversationContext | null = null
  private memoryFilePath: string

  constructor(memoryFilePath: string = DEFAULT_MEMORY_FILE) {
    this.memoryFilePath = memoryFilePath
    this.sessionId = generateMessageId()
    this.memory = {
      version: "1.0",
      sessionHistory: [],
      globalMessages: [],
      lastSaved: Date.now(),
      metadata: {
        totalConversations: 0,
        totalMessages: 0,
        createdAt: Date.now(),
      },
    }
  }

  /**
   * Initialize session and load existing memory from disk.
   */
  async initialize(): Promise<void> {
    await this.loadMemory()
    this.currentSession = {
      messages: [],
      sessionId: this.sessionId,
      startTime: Date.now(),
      lastUpdated: Date.now(),
      totalMessages: 0,
    }
  }

  /**
   * Add a message to current session and global memory.
   */
  async addMessage(role: "user" | "assistant" | "system", content: string): Promise<Message> {
    const message: Message = {
      id: generateMessageId(),
      role,
      content,
      timestamp: Date.now(),
      metadata: {
        source: "chat",
      },
    }

    if (!this.currentSession) {
      await this.initialize()
    }

    this.currentSession!.messages.push(message)
    this.currentSession!.totalMessages += 1
    this.currentSession!.lastUpdated = Date.now()

    this.memory.globalMessages.push(message)

    return message
  }

  /**
   * Get the most recent N messages from current session.
   */
  getRecentMessages(limit: number = 10): Message[] {
    if (!this.currentSession) return []
    return this.currentSession.messages.slice(-limit)
  }

  /**
   * Search memory using string similarity fallback (no embeddings required).
   * Returns top-K most relevant messages.
   */
  searchMemory(query: string, topK: number = 5): Message[] {
    if (this.memory.globalMessages.length === 0) return []

    const scored = this.memory.globalMessages.map((msg) => ({
      message: msg,
      score: stringSimilarity(query, msg.content),
    }))

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter((item) => item.score > 0.1) // Filter low-relevance matches
      .map((item) => item.message)
  }

  /**
   * Save current memory to disk.
   */
  async saveMemory(): Promise<void> {
    if (this.currentSession) {
      this.memory.sessionHistory.push(this.currentSession)
    }

    this.memory.lastSaved = Date.now()
    this.memory.metadata.totalMessages = this.memory.globalMessages.length
    this.memory.metadata.totalConversations = this.memory.sessionHistory.length

    try {
      // Ensure directory exists
      const dir = path.dirname(this.memoryFilePath)
      await fs.mkdir(dir, { recursive: true })

      await fs.writeFile(this.memoryFilePath, JSON.stringify(this.memory, null, 2), "utf8")
    } catch (err) {
      console.error("Error saving memory:", err)
      throw err
    }
  }

  /**
   * Load memory from disk (if it exists).
   */
  async loadMemory(): Promise<void> {
    try {
      const data = await fs.readFile(this.memoryFilePath, "utf8")
      const parsed = JSON.parse(data) as MemoryStore
      this.memory = parsed
    } catch (err) {
      // Memory file doesn't exist yet; initialize empty
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("Could not load memory file, starting fresh:", err)
      }
    }
  }

  /**
   * Get all messages for current session.
   */
  getAllSessionMessages(): Message[] {
    return this.currentSession?.messages ?? []
  }

  /**
   * Get full memory store (for debugging).
   */
  getMemoryStore(): MemoryStore {
    return this.memory
  }

  /**
   * Clear current session (but keep history).
   */
  startNewSession(): void {
    if (this.currentSession) {
      this.memory.sessionHistory.push(this.currentSession)
    }
    this.sessionId = generateMessageId()
    this.currentSession = {
      messages: [],
      sessionId: this.sessionId,
      startTime: Date.now(),
      lastUpdated: Date.now(),
      totalMessages: 0,
    }
  }
}

export default ChatMemory
