import { NextResponse } from 'next/server'
import { logInfo, logError } from '../../../../../lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET

function muxAuthHeader() {
  const token = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')
  return `Basic ${token}`
}

export async function GET(request) {
  const startedAt = Date.now()
  try {
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return NextResponse.json({ error: 'Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    if (!assetId) {
      return NextResponse.json({ error: 'assetId is required' }, { status: 400 })
    }

    const res = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
      headers: { Authorization: muxAuthHeader() },
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Mux ${res.status}: ${text}` }, { status: res.status })
    }

    const data = await res.json()
    const asset = data?.data
    logInfo('convert_video.status', {
      durationMs: Date.now() - startedAt,
      assetId,
      status: asset?.status || null,
    })
    return NextResponse.json({
      status: asset?.status || null,
      playbackId: asset?.playback_ids?.[0]?.id || null,
      assetId: asset?.id || assetId,
    })
  } catch (err) {
    logError('convert_video.status_error', err, { durationMs: Date.now() - startedAt })
    return NextResponse.json({ error: err.message || 'Status check failed' }, { status: 500 })
  }
}
