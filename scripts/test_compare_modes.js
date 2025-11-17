const fetch = globalThis.fetch || require('node-fetch')

async function callCompare(mode) {
  const body = {
    jsonrpc: '2.0',
    id: mode,
    method: 'tools/call',
    params: {
      name: 'compare_rag',
      arguments: { question: 'Tell me about your leadership experience', topK: 3, mode }
    }
  }

  const res = await fetch('http://localhost:3000/api/mcp-server', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await res.json()
  return j
}

async function run() {
  console.log('Calling compare_rag with mode=fetch')
  const fetchRes = await callCompare('fetch')
  console.log('fetch result:', JSON.stringify(fetchRes, null, 2))

  console.log('\nCalling compare_rag with mode=sdk')
  const sdkRes = await callCompare('sdk')
  console.log('sdk result:', JSON.stringify(sdkRes, null, 2))
}

run().catch(e => { console.error(e); process.exit(1) })
