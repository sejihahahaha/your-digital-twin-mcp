import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ----------------------------
// Enhance Query (Python → TS)
// ----------------------------
export async function enhanceQuery(userQuestion: string): Promise<string> {
  const enhancedPrompt = `
You are an interview preparation assistant. 
Improve this question to better search professional profile data:

Original: ${userQuestion}

Enhanced query should:
- Include relevant synonyms
- Focus on interview-relevant aspects
- Expand context for better matching

Return only the enhanced query:
  `;

  const response = await groq.chat.completions.create({
    messages: [{ role: "user", content: enhancedPrompt }],
    model: "llama-3.1-8b-instant",
  });

  return response.choices[0].message?.content ?? "";
}

// ------------------------------------
// Format RAG + LLM (Python → TS)
// ------------------------------------
export async function formatForInterview(
  ragResults: { text: string }[],
  originalQuestion: string
): Promise<string> {
  const context = ragResults.map((r) => r.text).join("\n");

  const prompt = `
You are an expert interview coach. Use this professional data to create 
a compelling interview response:

Question: ${originalQuestion}
Professional Data:
${context}

Create a response that:
- Uses STAR format when appropriate
- Includes specific metrics and achievements
- Sounds confident and natural
- Addresses the question directly

Response:
  `;

  const response = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.1-8b-instant",
  });

  return response.choices[0].message?.content ?? "";
}

