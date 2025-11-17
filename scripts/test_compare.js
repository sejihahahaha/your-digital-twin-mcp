const fetch = globalThis.fetch || require('node-fetch')

async function run() {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'compare_rag',
      arguments: { question: 'Tell me about your leadership experience', topK: 3 }
    }
  }

  try {
    const res = await fetch('http://localhost:3000/api/mcp-server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    console.log('Status:', res.status)
    console.log(text)
  } catch (err) {
    console.error('Request failed:', err.message || err)
    process.exit(1)
  }
}

run()
