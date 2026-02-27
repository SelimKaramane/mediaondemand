import { NextResponse } from 'next/server'
import algoliasearch from 'algoliasearch'
import { logInfo, logError } from '../../../../lib/logger'
import { createAdminClient } from '../../../../lib/supabaseAdmin'

export const runtime = 'nodejs'

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET

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

async function updateAlgolia(objectID, payload) {
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) return
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)
  const index = client.initIndex(ALGOLIA_INDEX_NAME)
  await index.partialUpdateObject({ objectID, ...payload }, { createIfNotExists: true })
}

async function logConversionEvent(payload) {
  const supabase = createAdminClient()
  if (!supabase) return
  await supabase.from('conversion_events').insert(payload)
}

export async function POST(request) {
  const startedAt = Date.now()
  let sourceUrl = null
  let objectID = null
  let userId = null
  try {
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return NextResponse.json({ error: 'Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET' }, { status: 500 })
    }

    const body = await request.json()
    sourceUrl = body?.sourceUrl || null
    objectID = body?.objectID || null
    userId = body?.userId || null
    if (!sourceUrl) {
      return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
    }
    logInfo('convert_video.start', { objectID, sourceType: 'url' })

    const asset = await createMuxAsset(sourceUrl)
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

    await logConversionEvent({
      type: 'video',
      status: 'success',
      object_id: objectID || null,
      source_url: sourceUrl || null,
      storage_path: null,
      user_id: userId || null,
      metadata: { assetId, playbackId, status },
    })

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
    try {
      await logConversionEvent({
        type: 'video',
        status: 'error',
        object_id: objectID || null,
        source_url: sourceUrl || null,
        storage_path: null,
        user_id: userId || null,
        metadata: { error: err.message || 'error' },
      })
    } catch {}
    return NextResponse.json({ error: err.message || 'Video conversion failed' }, { status: 500 })
  }
}
