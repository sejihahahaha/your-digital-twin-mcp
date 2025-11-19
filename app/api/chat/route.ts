/**
 * Next.js API route: POST /api/chat
 * Handles chat messages and returns AI-generated responses.
 */

import { NextRequest, NextResponse } from "next/server"
import ResponseEngine from "@/lib/responseEngine"

// Singleton for engine (preserved across requests in dev/prod)
let engineInstance: ResponseEngine | null = null

/**
 * Get or create the response engine instance.
 */
async function getEngine(): Promise<ResponseEngine> {
  if (!engineInstance) {
    engineInstance = new ResponseEngine()
    await engineInstance.initialize()
  }
  return engineInstance
}

/**
 * POST /api/chat
 * Request body: { message: string }
 * Response: { userMessage: string, assistantMessage: string, timestamp: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid message field" },
        { status: 400 }
      )
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      )
    }

    // Generate response using engine
    const engine = await getEngine()
    const response = await engine.generateResponse(message.trim())

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || "Failed to generate response" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      userMessage: response.userMessage,
      assistantMessage: response.assistantMessage,
      timestamp: response.timestamp,
    })
  } catch (err) {
    console.error("Chat API error:", err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/chat
 * Returns conversation history.
 */
export async function GET(request: NextRequest) {
  try {
    const engine = await getEngine()
    const history = engine.getConversationHistory()

    return NextResponse.json({
      messages: history,
      count: history.length,
    })
  } catch (err) {
    console.error("Chat history error:", err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to retrieve history",
      },
      { status: 500 }
    )
  }
}
