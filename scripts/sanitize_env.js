const fs = require('fs')
const path = require('path')

const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.log('.env.local not found in project root (mydigitaltwin).')
  process.exit(0)
}

try {
  const raw = fs.readFileSync(envPath)
  const cleaned = Buffer.from(raw.toString('utf8').replace(/\x00/g, ''))
  const cleanedPath = envPath + '.cleaned'
  fs.writeFileSync(cleanedPath, cleaned)
  console.log('Wrote cleaned .env.local to', cleanedPath)
} catch (e) {
  console.error('Failed to sanitize .env.local:', e)
  process.exit(1)
}
