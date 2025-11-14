// Quick test script for RAG endpoint
require('dotenv').config({ path: '.env.local' })
const { generateWithGroq, queryVectors, buildContextFromProfile, loadProfileFromAppData } = require('../lib/rag')

async function testRag() {
  try {
    const profile = loadProfileFromAppData()
    console.log('Profile loaded successfully')
    
    const chunks = buildContextFromProfile(profile)
    console.log(`Built ${chunks.length} chunks from profile`)
    
    const question = "Where is Krystel from?"
    console.log('\nTesting question:', question)
    
    const results = await queryVectors(question, 3)
    if (!results) {
      console.log('No vectors found - need to run ingestion first')
      return
    }
    
    const topTexts = []
    if (Array.isArray(results)) {
      for (const r of results) {
        const md = r?.metadata || {}
        if (md.content) topTexts.push(md.content)
      }
    }
    
    if (!topTexts.length) {
      console.log('No content found in results')
      return
    }
    
    const context = topTexts.join('\n')
    const prompt = `Based on the following information about yourself, answer the question.\nYour Information:\n${context}\nQuestion: ${question}\nProvide a helpful, professional response:`
    
    const answer = await generateWithGroq(prompt)
    console.log('\nAnswer:', answer)
  } catch (e) {
    console.error('Error:', e)
  }
}

testRag().catch(console.error)