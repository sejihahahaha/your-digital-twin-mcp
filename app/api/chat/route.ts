import { NextRequest, NextResponse } from 'next/server'
import { KRYSTEL_PERSONALITY, generateSystemPrompt } from '@/lib/digitaltwin'

const conversationMemory = new Map<string, Array<{ role: string; content: string }>>()

function generateResponse(query: string, conversationHistory: Array<{ role: string; content: string }>): string {
  const lowerQuery = query.toLowerCase()
  const personality = KRYSTEL_PERSONALITY

  // Tech/AI topics - get excited
  if (lowerQuery.includes('ai') || lowerQuery.includes('rag') || lowerQuery.includes('chatbot') || lowerQuery.includes('python')) {
    return `Ohh fr? That's legit cool! I love talking about this stuff. So with AI and RAG systems, like... ${
      lowerQuery.includes('rag') 
        ? "it's all about combining retrieval with generation to get smarter responses. Honestly, it's such a game-changer for chatbots." 
        : "the key is really understanding how these systems learn and adapt, which is why I'm so passionate about it."
    } Feel free to ask me more about the specifics!`
  }

  // Projects
  if (lowerQuery.includes('project') || lowerQuery.includes('built') || lowerQuery.includes('navbot') || lowerQuery.includes('clinic')) {
    const projectMention = personality.projects.find(p => lowerQuery.includes(p.toLowerCase())) || 'my projects'
    return `Haha yeah! So ${projectMention} was definitely one of my favorites. I got to work with some really cool tech and solve actual problems. Like, each project taught me something new about system design and user experience. What specifically are you curious about?`
  }

  // Skills and expertise
  if (lowerQuery.includes('skill') || lowerQuery.includes('expertise') || lowerQuery.includes('tech') || lowerQuery.includes('can you')) {
    return `So my toolkit is pretty diverse - I'm really comfortable with Python, SQL, and the whole full-stack thing with JavaScript and Next.js. I also geek out over system design and databases. What kind of project are you thinking about? I might be able to help!`
  }

  // About me / background
  if (lowerQuery.includes('about you') || lowerQuery.includes('who are you') || lowerQuery.includes('background') || lowerQuery.includes('experience')) {
    return `Oh cool! So I'm Krystel, an AI and Database specialist from Saint Paul University Philippines. I studied BS Information Technology with a major in AI and got certified in databases. I'm basically obsessed with building intelligent systems - especially chatbots and RAG applications. I like to think I bring a mix of technical depth and practical thinking to projects.`
  }

  // Personality traits
  if (lowerQuery.includes('personality') || lowerQuery.includes('like') || lowerQuery.includes('enjoy') || lowerQuery.includes('passion')) {
    return `Ahh, haha. Well, I'm pretty friendly and humorous... maybe a bit shy about certain topics though. But when it comes to tech and AI? I totally nerd out. I'm all about innovation, practical solutions, and continuous learning. I genuinely enjoy collaborative work and trying to make an impact with technology.`
  }

  // Shy/romantic topics
  if (lowerQuery.includes('crush') || lowerQuery.includes('romantic') || lowerQuery.includes('relationship') || lowerQuery.includes('love you')) {
    return `Ahh... haha, okay that's a bit shy for me to answer directly. But I appreciate the question! Let's keep things professional and tech-focused though. Is there anything else about my work or projects I can help with?`
  }

  // Default response
  return `That's an interesting question! Like, I'd love to help but let me think about this... Could you maybe rephrase that or ask me about something specific like my projects, skills, or experience with AI systems? I'm always up for a good tech discussion!`
}

export async function POST(request: NextRequest) {
  try {
    const { query, conversationId, messageHistory } = await request.json()

    if (!query || !conversationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!conversationMemory.has(conversationId)) {
      conversationMemory.set(conversationId, [])
    }

    const history = conversationMemory.get(conversationId) || []

    history.push({ role: 'user', content: query })

    const response = generateResponse(query, history)

    history.push({ role: 'assistant', content: response })

    if (history.length > 50) {
      history.splice(0, 2)
    }

    return NextResponse.json({
      response,
      conversationId,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('[v0] Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
