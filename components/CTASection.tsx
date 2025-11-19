/**
 * CTASection Component
 * 
 * FIX: Marked as "use client" because it contains interactive elements (ActionButton with onClick).
 * This separates the interactive logic from the Server Component, preventing serialization errors.
 * 
 * ERROR PATTERN THAT FAILED:
 * - Server Component directly passes onClick to Client Component
 * - Next.js tries to serialize the function at build time (not allowed)
 * 
 * SOLUTION:
 * - Move interactive elements into their own Client Component
 * - Client Component handles all onClick logic internally
 * - Server Component imports and renders the Client Component
 */
"use client"

import ActionButton from "@/components/ActionButton"

export default function CTASection() {
  return (
    <section className="bg-red-600 dark:bg-red-700 rounded-lg p-12 text-center">
      <h2 className="text-3xl font-bold mb-4 text-white">
        Try the Digital Twin
      </h2>
      <p className="text-zinc-100 mb-6 max-w-xl mx-auto">
        Ask questions about the profile and experience the power of RAG with
        AI-generated responses.
      </p>
      <div className="flex gap-4 justify-center">
        <ActionButton
          variant="secondary"
          onClick={() => {
            window.location.href = "/"
          }}
        >
          Start Chatting
        </ActionButton>
        <ActionButton
          variant="outline"
          onClick={() => {
            const section = document.getElementById("features")
            if (section) {
              section.scrollIntoView({ behavior: "smooth" })
            }
          }}
        >
          Learn More
        </ActionButton>
      </div>
    </section>
  )
}
