/**
 * Quick Start Example: Using the Chatbot System
 * 
 * This file shows how to integrate the chatbot into your application.
 * Run this from a test script or Node.js REPL.
 */

import ResponseEngine from "@/lib/responseEngine"
import ChatMemory from "@/lib/chatMemory"
import Persona from "@/lib/persona"

/**
 * Example 1: Basic Chat Interaction
 */
export async function basicChatExample() {
  console.log("=== Basic Chat Example ===\n")

  const engine = new ResponseEngine()
  await engine.initialize()

  const userMessage = "What is a digital twin?"
  console.log(`User: ${userMessage}\n`)

  const response = await engine.generateResponse(userMessage)

  if (response.success) {
    console.log(`Assistant: ${response.assistantMessage}\n`)
  } else {
    console.log(`Error: ${response.error}\n`)
  }
}

/**
 * Example 2: Custom Persona
 */
export async function customPersonaExample() {
  console.log("=== Custom Persona Example ===\n")

  const customPersona = new Persona({
    name: "Dr. Twin",
    role: "digital_twin_expert",
    personality: {
      traits: ["expert", "technical", "thorough"],
      tone: "professional and knowledgeable",
      approachability: "medium",
    },
    speakingPatterns: {
      useContractions: false,
      conversationalFillers: ["in fact", "notably", "specifically"],
      empathyMarkers: ["I understand your concern", "that is an important question"],
      openingPhrases: [
        "Based on my expertise—",
        "Let me provide a technical perspective:",
      ],
      closingPhrases: [
        "Does this clarify the technical aspects?",
        "I hope this technical explanation is helpful.",
      ],
      responseLengthPreference: "detailed",
    },
    knowledgeDomains: ["digital twins", "IoT", "simulation", "data modeling"],
    responseStyle: {
      preferEmojis: false,
      useHumor: false,
      formalityLevel: 0.8, // More formal
      personalityStrength: 0.6,
    },
  })

  const memory = new ChatMemory()
  const engine = new ResponseEngine(memory, customPersona)
  await engine.initialize()

  const userMessage = "Explain digital twin architecture"
  console.log(`User: ${userMessage}\n`)

  const response = await engine.generateResponse(userMessage)

  if (response.success) {
    console.log(`${customPersona.getName()}: ${response.assistantMessage}\n`)
  }
}

/**
 * Example 3: Multi-turn Conversation with Memory
 */
export async function multiTurnConversationExample() {
  console.log("=== Multi-turn Conversation Example ===\n")

  const engine = new ResponseEngine()
  await engine.initialize()

  const messages = [
    "My name is Alex",
    "What did I just tell you?",
    "Can you remember that?",
  ]

  for (const userMessage of messages) {
    console.log(`User: ${userMessage}`)

    const response = await engine.generateResponse(userMessage)

    if (response.success) {
      console.log(`Assistant: ${response.assistantMessage}\n`)
    } else {
      console.log(`Error: ${response.error}\n`)
    }
  }

  // Show conversation history
  const history = engine.getConversationHistory()
  console.log(`\nTotal messages in memory: ${history.length}`)
}

/**
 * Example 4: Memory Search and Retrieval
 */
export async function memorySearchExample() {
  console.log("=== Memory Search Example ===\n")

  const memory = new ChatMemory()
  await memory.initialize()

  // Add some sample messages
  await memory.addMessage("user", "I work in manufacturing and need digital twin solutions")
  await memory.addMessage(
    "assistant",
    "Digital twins can help you monitor equipment and predict maintenance needs"
  )
  await memory.addMessage("user", "What about real-time monitoring?")
  await memory.addMessage(
    "assistant",
    "Real-time monitoring is a key feature of modern digital twin platforms"
  )

  await memory.saveMemory()

  // Search for relevant messages
  const query = "equipment monitoring"
  console.log(`Searching for: "${query}"\n`)

  const results = memory.searchMemory(query, topK=3)

  console.log(`Found ${results.length} relevant messages:\n`)
  results.forEach((msg) => {
    console.log(`[${msg.role}] ${msg.content}\n`)
  })
}

/**
 * Example 5: Persona Style Guide
 */
export function personaStyleGuideExample() {
  console.log("=== Persona Style Guide Example ===\n")

  const persona = new Persona()

  console.log("Default Persona:")
  console.log(`Name: ${persona.getName()}`)
  console.log(`Role: ${persona.getRole()}`)
  console.log(`\nPersonality Description:\n${persona.getPersonalityDescription()}`)
  console.log(`\nStyle Guide:\n${persona.getStyleGuide()}`)
  console.log(`\nRandom conversational filler: "${persona.getRandomFiller()}"`)
  console.log(`Random empathy marker: "${persona.getRandomEmpathyMarker()}"`)
  console.log(`Random opening: "${persona.getRandomOpening()}"`)
  console.log(`Random closing: "${persona.getRandomClosing()}"`)
}

/**
 * Example 6: Full Conversation Loop (like API endpoint)
 */
export async function fullConversationLoopExample() {
  console.log("=== Full Conversation Loop Example ===\n")

  const engine = new ResponseEngine()
  await engine.initialize()

  // Simulate a series of user messages
  const userInputs = [
    "Hey, can you help me understand what digital twins are?",
    "How are they different from regular simulations?",
    "What industries use digital twins?",
  ]

  for (const input of userInputs) {
    console.log(`\n${"=".repeat(60)}`)
    console.log(`📝 User: ${input}`)
    console.log("=".repeat(60))

    try {
      const response = await engine.generateResponse(input)

      if (response.success) {
        console.log(`\n🤖 Assistant: ${response.assistantMessage}`)
        console.log(`\n⏱️  Response time: ${Date.now() - response.timestamp}ms`)
      } else {
        console.log(`\n❌ Error: ${response.error}`)
      }
    } catch (err) {
      console.error("Exception:", err)
    }
  }

  // Show final conversation history
  console.log(`\n${"=".repeat(60)}`)
  console.log("📚 Final Conversation History:")
  console.log("=".repeat(60))

  const history = engine.getConversationHistory()
  history.forEach((msg, idx) => {
    const role = msg.role === "user" ? "👤" : "🤖"
    console.log(`${idx + 1}. ${role} ${msg.role.toUpperCase()}: ${msg.content.substring(0, 100)}...`)
  })
}

/**
 * Run examples (uncomment to test)
 */
async function runExamples() {
  try {
    // await basicChatExample()
    // await customPersonaExample()
    // await multiTurnConversationExample()
    // await memorySearchExample()
    personaStyleGuideExample()
    // await fullConversationLoopExample()
  } catch (err) {
    console.error("Example error:", err)
  }
}

// Export all examples for use in tests
export { runExamples }

/**
 * To run these examples:
 * 
 * 1. Make sure environment variables are set:
 *    - GROQ_API_KEY should be in .env.local
 * 
 * 2. Run individual example in Node.js:
 *    import { basicChatExample } from '@/scripts/chatbot-examples'
 *    await basicChatExample()
 * 
 * 3. Or modify this file and run:
 *    node -r ts-node/register scripts/chatbot-examples.ts
 */
