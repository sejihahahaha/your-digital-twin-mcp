// Simple Groq test
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

async function testGroqRag() {
  try {
    // Try multiple profile locations
    const candidates = [
      path.join(__dirname, '..', 'data', 'digitaltwin.json'),
      path.join(__dirname, '..', 'digitaltwin.json'),
      path.join(__dirname, '..', '..', 'data', 'digitaltwin.json'),
      path.join(__dirname, '..', '..', 'digitaltwin.json'),
    ]
    
    let profile = null
    let foundPath = null
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          profile = JSON.parse(fs.readFileSync(p, 'utf8'))
          foundPath = p
          break
        }
      } catch (e) {}
    }
    
    if (!profile) {
      throw new Error('Could not find digitaltwin.json in any candidate location')
    }
    
    console.log('Profile loaded successfully from:', foundPath)
    
    // Build location context
    const personal = profile?.personal ?? {}
    const salaryLoc = profile?.salary_location ?? {}
    const locationText = `Based in ${personal?.location ?? ""}. Work preferences: ${(salaryLoc?.location_preferences ?? []).join(", ")}. ${salaryLoc?.work_authorization ?? ""}`
    
    const question = "Where is Krystel from?"
    const prompt = `Based on the following information about yourself, answer the question:\n\nYour Information:\n${locationText}\n\nQuestion: ${question}\n\nProvide a helpful, professional response:`
    
    // Call Groq API directly
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      console.log('GROQ_API_KEY not set')
      return
    }
    
    const response = await fetch('https://api.groq.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
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
      throw new Error(`Groq API error: ${response.status} ${await response.text()}`)
    }
    
    const result = await response.json()
    const answer = result.choices?.[0]?.message?.content ?? 'No response'
    console.log('\nPrompt:', prompt)
    console.log('\nAnswer:', answer)
    
  } catch (e) {
    console.error('Error:', e)
  }
}

testGroqRag().catch(console.error)
