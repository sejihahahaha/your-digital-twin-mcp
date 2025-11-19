// Minimal Groq test with explicit fetch
import('node-fetch').then(async ({ default: fetch }) => {
  try {
    // Load env value from process.env only (keep secrets in .env)
    const groq_api_key = process.env.GROQ_API_KEY
    
    const locationInfo = 'Based in Tuguegarao City, Philippines. Work preferences: Tuguegarao City, Remote, Hybrid. Philippine Citizen'
    const question = "Where is Krystel from?"
    const prompt = `Based on the following information about yourself, answer the question:\n\nYour Information:\n${locationInfo}\n\nQuestion: ${question}\n\nProvide a helpful, professional response:`
    
    console.log('Using Groq key:', groq_api_key ? 'Key found' : 'No key')
    console.log('\nPrompt:', prompt)
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groq_api_key}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are an AI digital twin. Answer questions as if you are the person, speaking in first person about your background.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })
    
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Groq API error: ${response.status} ${text}`)
    }
    
    const result = await response.json()
    const answer = result.choices?.[0]?.message?.content ?? 'No response'
    console.log('\nAnswer:', answer)
    
  } catch (e) {
    console.error('Error:', e)
  }
}).catch(console.error)
