// scripts/backup-algolia.js
// Run: node scripts/backup-algolia.js
// Requires: NEXT_PUBLIC_ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY

const algoliasearch = require('algoliasearch')
const fs = require('fs')
const path = require('path')

function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename)
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || 'mediaondemand_content'

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error('❌ Missing Algolia credentials. Set NEXT_PUBLIC_ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in .env.local.')
  process.exit(1)
}

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)
const index = client.initIndex(ALGOLIA_INDEX_NAME)

async function backup() {
  const records = []
  await index.browseObjects({
    query: '',
    batch: (hits) => {
      records.push(...hits)
    },
  })

  const backupDir = path.resolve(process.cwd(), 'backups')
  fs.mkdirSync(backupDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `algolia-${ALGOLIA_INDEX_NAME}-${timestamp}.json`
  const fullPath = path.join(backupDir, filename)

  fs.writeFileSync(fullPath, JSON.stringify({
    exportedAt: new Date().toISOString(),
    index: ALGOLIA_INDEX_NAME,
    count: records.length,
    records,
  }, null, 2))

  console.log(`✅ Backup écrit: ${fullPath}`)
}

backup().catch((err) => {
  console.error('❌ Backup failed:', err.message)
  process.exit(1)
})
