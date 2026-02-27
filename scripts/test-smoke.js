// scripts/test-smoke.js
// Basic smoke checks for CI

const fs = require('fs')
const path = require('path')

const requiredFiles = [
  'app/page.js',
  'app/content/[id]/page.js',
  'app/api/convert/ebook/route.js',
  'app/api/convert/video/route.js',
  'supabase/conversion_events.sql',
  '.env.example',
]

const requiredEnvKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_ALGOLIA_APP_ID',
  'NEXT_PUBLIC_ALGOLIA_SEARCH_KEY',
  'ALGOLIA_ADMIN_KEY',
  'CLOUDCONVERT_API_KEY',
  'MUX_TOKEN_ID',
  'MUX_TOKEN_SECRET',
]

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`)
    process.exit(1)
  }
}

for (const file of requiredFiles) {
  assert(fs.existsSync(path.resolve(process.cwd(), file)), `Missing file: ${file}`)
}

const envExample = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8')
for (const key of requiredEnvKeys) {
  const re = new RegExp(`^${key}=`, 'm')
  assert(re.test(envExample), `Missing key in .env.example: ${key}`)
}

console.log('✅ Smoke tests passed.')
