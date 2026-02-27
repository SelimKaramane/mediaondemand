// scripts/upload-videos.js
// Run: node scripts/upload-videos.js
// Uploads local videos to Supabase Storage and writes scripts/video-sources.json

const { createClient } = require('@supabase/supabase-js')
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

function safeSlug(input) {
  return (input || 'video')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'video'
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_VIDEO_BUCKET = process.env.SUPABASE_VIDEO_BUCKET || process.env.SUPABASE_STORAGE_BUCKET
const SUPABASE_VIDEO_PUBLIC = (process.env.SUPABASE_VIDEO_PUBLIC || '').toLowerCase() === 'true'

const VIDEO_ASSETS_DIR = process.env.VIDEO_ASSETS_DIR
  ? path.resolve(process.cwd(), process.env.VIDEO_ASSETS_DIR)
  : path.resolve(process.cwd(), 'scripts/video-assets')
const VIDEO_MAP_FILE = process.env.VIDEO_MAP_FILE
  ? path.resolve(process.cwd(), process.env.VIDEO_MAP_FILE)
  : path.resolve(process.cwd(), 'scripts/video-map.json')
const VIDEO_SOURCES_FILE = process.env.VIDEO_SOURCES_FILE
  ? path.resolve(process.cwd(), process.env.VIDEO_SOURCES_FILE)
  : path.resolve(process.cwd(), 'scripts/video-sources.json')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_VIDEO_BUCKET) {
  console.error('❌ Missing SUPABASE credentials. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_VIDEO_BUCKET (or SUPABASE_STORAGE_BUCKET).')
  process.exit(1)
}

if (!fs.existsSync(VIDEO_ASSETS_DIR)) {
  console.error(`❌ VIDEO_ASSETS_DIR not found: ${VIDEO_ASSETS_DIR}`)
  process.exit(1)
}

const allowedExt = new Set(['.mp4', '.mov', '.m4v', '.webm'])
const assets = fs.readdirSync(VIDEO_ASSETS_DIR)
  .filter(name => allowedExt.has(path.extname(name).toLowerCase()))

if (!assets.length) {
  console.error(`❌ No video files found in ${VIDEO_ASSETS_DIR}`)
  process.exit(1)
}

let mapByFilename = {}
if (fs.existsSync(VIDEO_MAP_FILE)) {
  try {
    const raw = fs.readFileSync(VIDEO_MAP_FILE, 'utf8')
    const data = JSON.parse(raw)
    if (Array.isArray(data)) {
      for (const entry of data) {
        if (entry?.filename) {
          mapByFilename[entry.filename] = entry
        }
      }
    }
  } catch (err) {
    console.warn(`⚠️ Impossible de lire ${VIDEO_MAP_FILE}: ${err.message}`)
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function contentTypeForExt(ext) {
  if (ext === '.mov') return 'video/quicktime'
  if (ext === '.webm') return 'video/webm'
  return 'video/mp4'
}

async function uploadFile(filename) {
  const ext = path.extname(filename).toLowerCase()
  const base = path.basename(filename, ext)
  const storagePath = `videos/${safeSlug(base)}${ext}`
  const buffer = fs.readFileSync(path.join(VIDEO_ASSETS_DIR, filename))

  const { error } = await supabase
    .storage
    .from(SUPABASE_VIDEO_BUCKET)
    .upload(storagePath, buffer, {
      upsert: true,
      contentType: contentTypeForExt(ext),
    })

  if (error) {
    throw new Error(`Upload failed for ${filename}: ${error.message}`)
  }

  let publicUrl = null
  if (SUPABASE_VIDEO_PUBLIC) {
    const { data } = supabase.storage.from(SUPABASE_VIDEO_BUCKET).getPublicUrl(storagePath)
    publicUrl = data?.publicUrl || null
  }

  const meta = mapByFilename[filename] || {}
  return {
    filename,
    storagePath,
    publicUrl,
    youtubeId: meta.youtubeId || null,
    title: meta.title || null,
  }
}

async function main() {
  try {
    console.log(`⏳ Uploading ${assets.length} video(s) to ${SUPABASE_VIDEO_BUCKET}...`)
    const results = []
    for (const file of assets) {
      const entry = await uploadFile(file)
      results.push(entry)
      console.log(`✅ ${file} -> ${entry.storagePath}`)
    }

    fs.writeFileSync(VIDEO_SOURCES_FILE, JSON.stringify(results, null, 2))
    console.log(`✅ Wrote ${results.length} entries to ${VIDEO_SOURCES_FILE}`)
  } catch (err) {
    console.error('❌ Upload error:', err.message)
    process.exit(1)
  }
}

main()
