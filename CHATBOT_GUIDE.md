# AI Chatbot System - Usage Guide

Complete implementation of a production-ready AI chatbot with memory persistence, persona configuration, and human-like conversation capabilities.

## Architecture

The chatbot system consists of 4 core modules:

### 1. **ChatMemory** (`lib/chatMemory.ts`)
Manages conversation history with persistent storage and semantic search.

**Key Features:**
- Stores messages in `data/memory.json`
- Session tracking with unique session IDs
- String similarity search (no external embeddings required)
- Automatic persistence to filesystem

**Usage:**
```typescript
import ChatMemory from "@/lib/chatMemory"

const memory = new ChatMemory()
await memory.initialize()

// Add messages
const msg = await memory.addMessage("user", "Hello!")
await memory.addMessage("assistant", "Hi there!")

// Search memory
const relevant = memory.searchMemory("hello", topK=5)

// Get recent messages
const recent = memory.getRecentMessages(10)

// Save to disk
await memory.saveMemory()
```

### 2. **Persona** (`lib/persona.ts`)
Defines chatbot personality, tone, and speaking patterns for human-like conversation.

**Personality Features:**
- Name and role configuration
- Personality traits (empathetic, helpful, professional yet casual)
- Speaking patterns with conversational fillers
- Empathy markers and opening/closing phrases
- Tone and formality level control

**Usage:**
```typescript
import Persona from "@/lib/persona"

// Use default persona
const persona = new Persona()

// Or customize
const customPersona = new Persona({
  name: "ChatBot Pro",
  personality: {
    traits: ["knowledgeable", "helpful", "professional"],
    tone: "professional yet approachable",
    approachability: "high"
  }
})

// Get random fillers for natural speech
const filler = persona.getRandomFiller() // "you know", "I think", etc.

// Build system prompt
const prompt = persona.buildSystemPrompt("Additional context here")
```

### 3. **ResponseEngine** (`lib/responseEngine.ts`)
Core chat logic that combines memory + persona + LLM API.

**Features:**
- Loads relevant memory for context
- Builds persona-aware prompts
- Calls Groq API (or compatible LLM)
- Persists conversations to memory
- Error handling and recovery

**Usage:**
```typescript
import ResponseEngine from "@/lib/responseEngine"

const engine = new ResponseEngine()
await engine.initialize()

// Generate response
const response = await engine.generateResponse("Tell me about digital twins")

// Response object
{
  userMessage: "Tell me about digital twins",
  assistantMessage: "Here's what I think about digital twins...",
  timestamp: 1234567890,
  success: true,
  context: { /* ResponseContext data */ }
}

// Get conversation history
const history = engine.getConversationHistory()

// Start fresh session
engine.startNewSession()
```

### 4. **Chat API Route** (`app/api/chat/route.ts`)
Next.js API handler for POST and GET requests.

## API Endpoints

### POST /api/chat
Generate a response to a user message.

**Request:**
```json
{
  "message": "What can you help me with?"
}
```

**Response:**
```json
{
  "userMessage": "What can you help me with?",
  "assistantMessage": "I can help you with digital twins, data integration, and more...",
  "timestamp": 1234567890
}
```

**Error Response:**
```json
{
  "error": "Message cannot be empty"
}
```

### GET /api/chat
Retrieve conversation history.

**Response:**
```json
{
  "messages": [
    { "id": "...", "role": "user", "content": "...", "timestamp": ... },
    { "id": "...", "role": "assistant", "content": "...", "timestamp": ... }
  ],
  "count": 2
}
```

## Frontend Integration Example

```typescript
// React/Next.js component
import { useState } from "react"

export default function ChatUI() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input, timestamp: Date.now() },
    ])

    setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("Error:", data.error)
        return
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.assistantMessage,
          timestamp: data.timestamp,
        },
      ])
    } finally {
      setLoading(false)
      setInput("")
    }
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button disabled={loading}>{loading ? "Thinking..." : "Send"}</button>
      </form>
    </div>
  )
}
```

## Memory File Structure

The `data/memory.json` file has this structure:

```json
{
  "version": "1.0",
  "sessionHistory": [
    {
      "messages": [
        {
          "id": "uuid",
          "role": "user",
          "content": "...",
          "timestamp": 1234567890,
          "metadata": { "source": "chat" }
        }
      ],
      "sessionId": "uuid",
      "startTime": 1234567890,
      "lastUpdated": 1234567890,
      "totalMessages": 1
    }
  ],
  "globalMessages": [
    /* all messages across all sessions */
  ],
  "lastSaved": 1234567890,
  "metadata": {
    "totalConversations": 1,
    "totalMessages": 10,
    "createdAt": 1234567890
  }
}
```

## Configuration

### Environment Variables

Required:
- `GROQ_API_KEY` - Your Groq API key for LLM calls

Optional:
- `NEXT_PUBLIC_CHAT_MAX_MESSAGES` - Max messages to include in prompts (default: 10)
- `NEXT_PUBLIC_SEARCH_TOP_K` - Memory search results limit (default: 5)

### Customizing Persona

Edit `lib/persona.ts` to modify the default persona or pass a custom config:

```typescript
const customPersona = new Persona({
  name: "Your Bot Name",
  personality: {
    traits: ["your", "traits"],
    tone: "your tone description",
    approachability: "high" // low, medium, high
  },
  speakingPatterns: {
    useContractions: true,
    conversationalFillers: ["like", "you know", "basically"],
    empathyMarkers: ["I understand", "that makes sense"],
    openingPhrases: ["Here's what I think—"],
    closingPhrases: ["Does that make sense?"],
    responseLengthPreference: "medium" // short, medium, detailed
  }
})
```

## Production Deployment

✅ **Vercel Compatible**
- All modules use ESM-safe patterns
- No static `require()` calls
- Runtime dotenv loading via `loadDotenvIfPresent()`
- Filesystem persistence works on Vercel (within `/tmp` limits)

⚠️ **Notes for Scale**
- For multi-instance deployments, consider migrating `data/memory.json` to a database (Upstash Redis, Supabase, etc.)
- Add rate limiting to `/api/chat` endpoint
- Implement message cleanup strategies for long-running deployments
- Consider vector embeddings (Pinecone, Weaviate) for better semantic search at scale

## Testing

### Manual API Test
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### Development Server
```bash
pnpm dev
# Visit http://localhost:3000/api/chat with a POST request
```

### Build Verification
```bash
pnpm build
# Verifies TypeScript compilation and route building
```

## Troubleshooting

**Error: "GROQ_API_KEY environment variable not set"**
- Add `GROQ_API_KEY` to `.env.local`
- Restart dev server

**Error: "Property 'success' does not exist on type 'ChatbotResponse'"**
- Check `types/chat.ts` has `success: boolean` field in ChatbotResponse interface
- Run `pnpm build` to verify types

**Memory not persisting**
- Check `data/` directory exists and is writable
- Verify `NEXT_PUBLIC_MEMORY_PATH` env variable if custom
- Check server logs for filesystem errors

**Slow responses**
- Reduce `topK` in `searchMemory()` calls (fewer search results = faster)
- Trim `recentMessages` limit (fewer context messages = faster LLM processing)
- Consider caching persona and memory in-process for better performance

## Files Created

- ✅ `types/chat.ts` - TypeScript interfaces
- ✅ `lib/chatMemory.ts` - Message storage and retrieval
- ✅ `lib/persona.ts` - Personality and tone configuration
- ✅ `lib/responseEngine.ts` - Core chat logic
- ✅ `app/api/chat/route.ts` - Next.js API handler
- ✅ `data/memory.json` - Initial memory storage

## Next Steps

1. **Start the dev server:** `pnpm dev`
2. **Test the API:** POST to `http://localhost:3000/api/chat`
3. **Build a UI:** Create a React component using the fetch example above
4. **Deploy:** Run `pnpm build` and deploy to Vercel/your host
5. **Scale memory:** Migrate `data/memory.json` to a database if needed

---

**Built for production with TypeScript, Vercel compatibility, and human-like AI conversation.**
