import { NextResponse } from 'next/server'
import { logInfo, logError } from '../../../lib/logger'

export const runtime = 'nodejs'

const ALLOWED_HOSTS = new Set([
  'gutenberg.org',
  'www.gutenberg.org',
])

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

    const arrayBuffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      return NextResponse.json({ error: 'Upstream did not return an EPUB file' }, { status: 502 })
    }

    logInfo('epub.proxy_success', { durationMs: Date.now() - startedAt, host: parsed.hostname })

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    logError('epub.proxy_error', err, { durationMs: Date.now() - startedAt })
    return NextResponse.json({ error: err.message || 'EPUB proxy failed' }, { status: 500 })
  }
}
