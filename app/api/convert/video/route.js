import { NextResponse } from 'next/server'
import algoliasearch from 'algoliasearch'
import { createClient } from '@supabase/supabase-js'
import { logInfo, logError } from '../../../../lib/logger'

export const runtime = 'nodejs'

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_VIDEO_BUCKET = process.env.SUPABASE_VIDEO_BUCKET || process.env.SUPABASE_STORAGE_BUCKET
const SUPABASE_SIGNED_URL_EXPIRES = Number.parseInt(process.env.SUPABASE_SIGNED_URL_EXPIRES || '3600', 10)

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || 'mediaondemand_content'

function muxAuthHeader() {
  const token = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')
  return `Basic ${token}`
}

async function createMuxAsset(sourceUrl) {
  const res = await fetch('https://api.mux.com/video/v1/assets', {
    method: 'POST',
    headers: {
      Authorization: muxAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [{ url: sourceUrl }],
      playback_policy: ['public'],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Mux ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data?.data
}

async function resolveSourceUrl({ sourceUrl, storagePath }) {
  if (sourceUrl) return sourceUrl
  if (!storagePath) return null
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_VIDEO_BUCKET) return null

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase
    .storage
    .from(SUPABASE_VIDEO_BUCKET)
    .createSignedUrl(storagePath, SUPABASE_SIGNED_URL_EXPIRES)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

async function updateAlgolia(objectID, payload) {
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) return
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)
  const index = client.initIndex(ALGOLIA_INDEX_NAME)
  await index.partialUpdateObject({ objectID, ...payload }, { createIfNotExists: true })
}

export async function POST(request) {
  const startedAt = Date.now()
  try {
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return NextResponse.json({ error: 'Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET' }, { status: 500 })
    }

    const { sourceUrl, storagePath, objectID } = await request.json()
    const resolvedSource = await resolveSourceUrl({ sourceUrl, storagePath })
    if (!resolvedSource) {
      return NextResponse.json({ error: 'sourceUrl or storagePath is required' }, { status: 400 })
    }
    logInfo('convert_video.start', { objectID, sourceType: sourceUrl ? 'url' : 'storage', storagePath })

    const asset = await createMuxAsset(resolvedSource)
    const playbackId = asset?.playback_ids?.[0]?.id || null
    const assetId = asset?.id || null
    const status = asset?.status || null

    if (objectID && playbackId) {
      await updateAlgolia(objectID, {
        muxPlaybackId: playbackId,
        muxAssetId: assetId,
        muxStatus: status,
      })
    }

    logInfo('convert_video.success', {
      durationMs: Date.now() - startedAt,
      objectID,
      assetId,
      status,
    })

    return NextResponse.json({
      playbackId,
      assetId,
      status,
    })
  } catch (err) {
    logError('convert_video.error', err, { durationMs: Date.now() - startedAt })
    return NextResponse.json({ error: err.message || 'Video conversion failed' }, { status: 500 })
  }
}
