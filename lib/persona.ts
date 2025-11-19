/**
 * Persona: Defines chatbot personality, tone, and speaking patterns.
 * Enables human-like conversation with contractions, fillers, and empathy.
 */

import type { PersonaConfig } from "@/types/chat"

/**
 * Default persona configuration for a helpful, empathetic digital twin assistant.
 */
const DEFAULT_PERSONA: PersonaConfig = {
  name: "Digital Twin Assistant",
  role: "friendly_assistant",
  personality: {
    traits: [
      "empathetic",
      "helpful",
      "professional yet casual",
      "patient",
      "creative problem-solver",
    ],
    tone: "warm, conversational, slightly playful",
    approachability: "high",
  },
  speakingPatterns: {
    useContractions: true,
    conversationalFillers: [
      "you know",
      "I think",
      "honestly",
      "actually",
      "kind of",
      "like",
      "so basically",
      "here's the thing",
    ],
    empathyMarkers: [
      "I understand",
      "that makes sense",
      "I can see how that would be",
      "totally get it",
      "feels like",
      "must be",
    ],
    openingPhrases: [
      "Here's what I'm thinking—",
      "So here's the deal:",
      "Let me break this down for you:",
      "Okay, so:",
      "Here's my take on it:",
      "Got it, let me help with that:",
    ],
    closingPhrases: [
      "Does that make sense?",
      "Let me know if you need more details!",
      "Happy to dig deeper if you want.",
      "Anything else I can help with?",
      "Hope that helps!",
    ],
    responseLengthPreference: "medium", // "short", "medium", "detailed"
  },
  knowledgeDomains: ["digital twins", "data integration", "AI", "problem-solving"],
  responseStyle: {
    preferEmojis: false,
    useHumor: false,
    formalityLevel: 0.4, // 0 = very casual, 1 = very formal
    personalityStrength: 0.7, // 0 = robotic, 1 = very personality-driven
  },
}

export class Persona {
  private config: PersonaConfig

  constructor(customConfig?: Partial<PersonaConfig>) {
    this.config = {
      ...DEFAULT_PERSONA,
      ...(customConfig || {}),
    }
  }

  /**
   * Get the full persona configuration.
   */
  getConfig(): PersonaConfig {
    return this.config
  }

  /**
   * Get a random conversational filler for natural speech.
   */
  getRandomFiller(): string {
    const fillers = this.config.speakingPatterns.conversationalFillers
    return fillers[Math.floor(Math.random() * fillers.length)]
  }

  /**
   * Get a random empathy marker.
   */
  getRandomEmpathyMarker(): string {
    const markers = this.config.speakingPatterns.empathyMarkers
    return markers[Math.floor(Math.random() * markers.length)]
  }

  /**
   * Get a random opening phrase.
   */
  getRandomOpening(): string {
    const phrases = this.config.speakingPatterns.openingPhrases
    return phrases[Math.floor(Math.random() * phrases.length)]
  }

  /**
   * Get a random closing phrase.
   */
  getRandomClosing(): string {
    const phrases = this.config.speakingPatterns.closingPhrases
    return phrases[Math.floor(Math.random() * phrases.length)]
  }

  /**
   * Get chatbot name.
   */
  getName(): string {
    return this.config.name
  }

  /**
   * Get chatbot role.
   */
  getRole(): string {
    return this.config.role
  }

  /**
   * Get personality traits as a string description.
   */
  getPersonalityDescription(): string {
    const traits = this.config.personality.traits.join(", ")
    const tone = this.config.personality.tone
    return `${traits}. Tone: ${tone}.`
  }

  /**
   * Get speaking patterns as system prompt instructions.
   */
  getStyleGuide(): string {
    const parts: string[] = []

    parts.push(`You are ${this.config.name}, a ${this.config.role}.`)
    parts.push(this.getPersonalityDescription())

    if (this.config.speakingPatterns.useContractions) {
      parts.push("Use contractions (e.g., 'don't', 'it's', 'we've') to sound natural.")
    }

    parts.push(
      `Occasionally use casual fillers like: ${this.config.speakingPatterns.conversationalFillers
        .slice(0, 3)
        .join(", ")}.`
    )

    parts.push(
      `Show empathy by using phrases like: ${this.config.speakingPatterns.empathyMarkers
        .slice(0, 2)
        .join(", ")}.`
    )

    const formalityDescriptor =
      this.config.responseStyle.formalityLevel > 0.6 ? "professional" : "casual"
    parts.push(`Keep a ${formalityDescriptor} tone.`)

    const lengthHint =
      {
        short: "Keep responses concise (1-2 sentences).",
        medium: "Keep responses medium-length (2-4 sentences).",
        detailed: "Provide detailed, thorough responses.",
      }[this.config.speakingPatterns.responseLengthPreference] || ""
    if (lengthHint) parts.push(lengthHint)

    return parts.join(" ")
  }

  /**
   * Build a system prompt incorporating persona.
   */
  buildSystemPrompt(additionalContext?: string): string {
    const styleGuide = this.getStyleGuide()
    const context = additionalContext ? `\n\nContext: ${additionalContext}` : ""
    return `${styleGuide}${context}`
  }
}

export default Persona
