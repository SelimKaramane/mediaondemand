import { NextResponse } from 'next/server'
import { logInfo, logError } from '../../../lib/logger'

export const runtime = 'nodejs'

const ALLOWED_HOSTS = new Set([
  'gutenberg.org',
  'www.gutenberg.org',
])

const MAX_CHARS = 4000

export async function GET(request) {
  const startedAt = Date.now()
  const { searchParams } = new URL(request.url)
  const target = searchParams.get('url')
  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  let parsed
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  try {
    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 400 })
    }

    const res = await fetch(target)
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 })
    }

    const text = await res.text()
    const preview = text.replace(/\r\n/g, '\n').slice(0, MAX_CHARS)

    logInfo('text.proxy_success', { durationMs: Date.now() - startedAt, host: parsed.hostname })

    return NextResponse.json({ preview })
  } catch (err) {
    logError('text.proxy_error', err, { durationMs: Date.now() - startedAt })
    return NextResponse.json({ error: err.message || 'Text proxy failed' }, { status: 500 })
  }
}
