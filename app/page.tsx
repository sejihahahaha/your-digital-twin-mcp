"use client"

import { useState } from "react"

type Message = { role: "user" | "assistant"; text: string }

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  async function sendQuestion(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim()) return
    const question = input.trim()
    setMessages((m) => [...m, { role: "user", text: question }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, topK: 3 }),
      })
      const j = await res.json()
      const answer = j.answer ?? j.error ?? "No answer returned"
      setMessages((m) => [...m, { role: "assistant", text: String(answer) }])
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", text: `Error: ${String(err)}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <main className="mx-auto max-w-3xl bg-white dark:bg-zinc-900 p-8 rounded-lg shadow">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Digital Twin — MCP Chat</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Ask questions about the profile. Uses Upstash Vector + Groq.</p>

        <section className="mt-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div className={`inline-block rounded-lg px-4 py-2 ${m.role === "user" ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"}`}>
                {m.text}
              </div>
            </div>
          ))}
        </section>

        <form className="mt-6 flex gap-2" onSubmit={sendQuestion}>
          <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded border px-3 py-2 dark:bg-zinc-800 dark:text-zinc-50" placeholder="Ask about experience, skills, projects..." />
          <button type="submit" disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-white">{loading ? "Thinking…" : "Send"}</button>
        </form>
      </main>
    </div>
  )
}
