'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Send } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; timestamp: number }>>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialize welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: '0',
        role: 'assistant',
        content: "Hey there! I'm Krystel's Digital Twin. I'm here to chat about my experience, projects, skills, or anything you're curious about. Feel free to ask me anything!",
        timestamp: Date.now(),
      }
      setMessages([welcomeMessage])
    }
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
          conversationId: currentConversationId || 'default',
          messageHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Save conversation
      if (!currentConversationId) {
        const newId = Date.now().toString()
        setCurrentConversationId(newId)
        setConversations((prev) => [
          { id: newId, title: input.substring(0, 50), timestamp: Date.now() },
          ...prev,
        ])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    const welcomeMessage: Message = {
      id: '0',
      role: 'assistant',
      content: "Hey there! I'm Krystel's Digital Twin. I'm here to chat about my experience, projects, skills, or anything you're curious about. Feel free to ask me anything!",
      timestamp: Date.now(),
    }
    setMessages([welcomeMessage])
    setCurrentConversationId(null)
  }

  return (
    <div className="w-full bg-black text-white min-h-screen flex flex-col">
      <Navigation />

      <div className="flex flex-1 pt-20">
        {/* Sidebar - Conversation History */}
        <div className="hidden md:flex w-64 border-r border-red-900/30 bg-black/50 flex-col p-4 gap-4">
          <Button
            onClick={handleClearChat}
            className="w-full bg-red-600 hover:bg-red-700 justify-between"
          >
            New Chat <span>+</span>
          </Button>

          {conversations.length > 0 && (
            <div className="space-y-2 flex-1 overflow-y-auto">
              <p className="text-xs text-gray-500 px-2">Conversations</p>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setCurrentConversationId(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm truncate transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-red-600/20 text-red-400'
                      : 'text-gray-400 hover:bg-gray-800/50'
                  }`}
                >
                  {conv.title}
                </button>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleClearChat}
            size="sm"
            className="w-full border-red-600/30 text-gray-400 hover:bg-red-900/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Memory
          </Button>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-6 py-3 ${
                      message.role === 'user'
                        ? 'bg-red-600 text-white'
                        : 'bg-gradient-to-r from-red-900/40 to-red-950/40 border border-red-900/50 text-gray-100'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <p className="text-xs text-red-400 font-semibold mb-1">Krystel</p>
                    )}
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-red-900/40 to-red-950/40 border border-red-900/50 rounded-2xl px-6 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-red-900/30 p-6 bg-black">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Krystel something..."
                className="bg-gray-900/50 border-red-900/30 text-white placeholder-gray-500 focus:border-red-600"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
