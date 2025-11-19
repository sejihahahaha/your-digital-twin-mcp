'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, MessageSquare, Trash2, ChevronDown } from 'lucide-react'

interface ConversationHistoryProps {
  onSelectConversation: (id: string | null) => void
  onNewConversation: () => void
  currentConversation: string
}

export function ConversationHistory({
  onSelectConversation,
  onNewConversation,
  currentConversation,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<
    Array<{ id: string; title: string; timestamp: number }>
  >([])
  const [isOpen, setIsOpen] = useState(true)

  const handleNewConversation = () => {
    onNewConversation()
  }

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (id === currentConversation) {
      onSelectConversation(null)
    }
  }

  return (
    <div
      className={`flex flex-col border-r border-border bg-card transition-all ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        {isOpen && <h2 className="font-semibold text-card-foreground">History</h2>}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${!isOpen ? '-rotate-90' : ''}`}
          />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={handleNewConversation}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
        >
          <Plus className="h-4 w-4" />
          {isOpen && 'New Chat'}
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2">
        {conversations.length === 0 && isOpen && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No conversations yet
          </p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group mb-2 rounded-lg p-2 text-sm transition-colors ${
              conv.id === currentConversation
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted text-card-foreground cursor-pointer'
            }`}
            onClick={() => onSelectConversation(conv.id)}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              {isOpen && (
                <div className="flex-1 truncate">
                  <p className="truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.timestamp).toLocaleDateString()}
                  </p>
                </div>
              )}
              {isOpen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conv.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 text-center text-xs text-muted-foreground">
        {isOpen && 'Digital Twin v1.0'}
      </div>
    </div>
  )
}
