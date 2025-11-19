import { NextRequest, NextResponse } from 'next/server'

interface ConversationMemory {
  conversationId: string
  summary: string
  messages: Array<{ role: string; content: string; timestamp: number }>
  lastUpdated: number
  messageCount: number
  learnings: string[]
}

const conversationMemory = new Map<string, ConversationMemory>()

export async function GET(request: NextRequest) {
  try {
    const conversationId = request.nextUrl.searchParams.get('id')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      )
    }

    const memory = conversationMemory.get(conversationId)

    if (memory) {
      return NextResponse.json({
        conversationId,
        summary: memory.summary,
        messageCount: memory.messageCount,
        lastUpdated: memory.lastUpdated,
        learnings: memory.learnings,
      })
    }

    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('[v0] Memory API error:', error)
    return NextResponse.json({ error: 'Failed to retrieve memory' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { conversationId, summary, messageCount, messages, learnings } = await request.json()

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      )
    }

    conversationMemory.set(conversationId, {
      conversationId,
      summary: summary || 'Conversation',
      messages: messages || [],
      lastUpdated: Date.now(),
      messageCount: messageCount || 0,
      learnings: learnings || [],
    })

    return NextResponse.json({ success: true, conversationId })
  } catch (error) {
    console.error('[v0] Memory API error:', error)
    return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const conversationId = request.nextUrl.searchParams.get('id')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      )
    }

    conversationMemory.delete(conversationId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Memory API error:', error)
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
  }
}
