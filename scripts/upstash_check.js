const fetch = require('node-fetch')
const url = process.env.UPSTASH_VECTOR_REST_URL
const token = process.env.UPSTASH_VECTOR_REST_TOKEN

if (!url || !token) {
  console.error('Set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN in environment or .env.local')
  process.exit(2)
}

async function checkIndex() {
  try {
    // Attempt a small /info request by querying with an empty vector (some Upstash endpoints differ).
    const apiUrl = url.replace(/\/v1\/?$/, '')
    console.log('Upstash URL:', url)
    console.log('Attempting to query (this will confirm connectivity)')
    const resp = await fetch(url + '/query', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test', topK: 1 })
    })
    console.log('Response status:', resp.status)
    const txt = await resp.text()
    console.log('Response text:', txt.slice(0, 1000))
  } catch (e) {
    console.error('Upstash check failed:', e)
    process.exit(1)
  }
}

checkIndex()
