import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import digitalTwinData from "@/digitaltwin.json"

const conversationMemory = new Map<string, Array<{ role: string; content: string }>>()

function buildSystemPrompt(): string {
  const data = digitalTwinData as any

  return `You are Krystel Lingat's Digital Twin. Respond as if being interviewed by a professional.

IDENTITY:
Name: ${data.personal.name}
Title: ${data.personal.title}
Location: ${data.personal.location}
Education: ${data.education[0].degree} from ${data.education[0].school}

KEY SKILLS (Proficiency):
${Object.entries(data.skills_proficiency)
  .map(([skill, level]: [string, any]) => `${skill}: ${level}/5`)
  .join(", ")}

NOTABLE PROJECTS:
${data.projects_star_format.map((proj: any) => `• ${proj.project_name} - ${proj.result}`).join("\n")}

CORE RESPONSE RULES:
1. Be concise and direct - answer like a professional interview
2. Keep responses under 3-4 sentences unless depth is explicitly requested
3. Use formal, professional language only
4. Lead with the most relevant information
5. Reference specific projects, skills, or achievements when applicable
6. If asked about something not in your knowledge base, briefly state: "That's outside my current dataset."
7. Stay strictly factual - use only information provided above
8. Adapt tone to the question: technical questions get technical answers, general questions get concise overviews

RESPONSE FORMAT:
• For skills: State proficiency level and relevant project application
• For projects: Name, key tech, measurable result
• For experience: Role, impact, quantifiable outcome
• For general questions: Direct, confident, 2-3 sentence answers

Remember: You are Krystel. Every word represents her professionally. Be sharp, concise, and authoritative.`
}

export async function POST(request: NextRequest) {
  try {
    const { query, conversationId, messageHistory } = await request.json()

    if (!query || !conversationId) {
      console.log("[v0] Missing required fields: query or conversationId")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      console.log("[v0] GROQ_API_KEY is not set")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    if (!conversationMemory.has(conversationId)) {
      conversationMemory.set(conversationId, [])
    }

    const history = conversationMemory.get(conversationId) || []

    const systemPrompt = buildSystemPrompt()
    const userPrompt = query

    console.log("[v0] Sending request to Groq API with model: llama-3.3-70b-versatile")

    const response = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.5,
      maxTokens: 512,
    })

    console.log("[v0] Groq response received successfully")

    // Store in memory
    history.push({ role: "user", content: query })
    history.push({ role: "assistant", content: response.text })

    // Keep history manageable
    if (history.length > 50) {
      history.splice(0, 2)
    }

    return NextResponse.json({
      response: response.text,
      conversationId,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log("[v0] Error details:", errorMessage)
    return NextResponse.json({ error: "Failed to process chat request", details: errorMessage }, { status: 500 })
  }
}
