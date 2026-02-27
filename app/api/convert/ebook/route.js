import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logInfo, logError } from '../../../../lib/logger'

export const runtime = 'nodejs'

const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY
const CLOUDCONVERT_BASE = 'https://api.cloudconvert.com/v2/jobs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function safeSlug(input) {
  return (input || 'ebook')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'ebook'
}

async function cloudConvertRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CloudConvert ${res.status}: ${text}`)
  }
  return res.json()
}

async function createConversionJob(sourceUrl, filename) {
  const safeName = `${safeSlug(filename)}.epub`
  const payload = {
    tasks: {
      'import-ebook': {
        operation: 'import/url',
        url: sourceUrl,
        filename: safeName,
      },
      'convert-ebook': {
        operation: 'convert',
        input: 'import-ebook',
        input_format: 'epub',
        output_format: 'pdf',
      },
      'export-pdf': {
        operation: 'export/url',
        input: 'convert-ebook',
        inline: false,
      },
    },
  }

  return cloudConvertRequest(CLOUDCONVERT_BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

async function waitJob(jobId, timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const job = await cloudConvertRequest(`${CLOUDCONVERT_BASE}/${jobId}`)
    if (job?.data?.status === 'finished') return job
    if (job?.data?.status === 'error') {
      const errorTask = job?.data?.tasks?.find(t => t.status === 'error')
      const message = errorTask?.message || 'CloudConvert job error'
      throw new Error(message)
    }
    await sleep(1500)
  }
  throw new Error('CloudConvert timeout')
}

async function uploadToSupabase(pdfUrl, filename) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) return null

  const res = await fetch(pdfUrl)
  if (!res.ok) return null
  const buffer = Buffer.from(await res.arrayBuffer())

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const safeName = safeSlug(filename)
  const path = `ebooks/${Date.now()}-${safeName}.pdf`
  const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (error) return null

  const expiresIn = Number.parseInt(process.env.SUPABASE_SIGNED_URL_EXPIRES || '3600', 10)
  const { data: signedData, error: signedError } = await supabase
    .storage
    .from(SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (!signedError && signedData?.signedUrl) {
    return { publicUrl: signedData.signedUrl, path, signed: true, expiresIn }
  }

  const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) return null

  return { publicUrl: data.publicUrl, path, signed: false, expiresIn: null }
}

export async function POST(request) {
  const startedAt = Date.now()
  try {
    if (!CLOUDCONVERT_API_KEY) {
      return NextResponse.json(
        { error: 'Missing CLOUDCONVERT_API_KEY' },
        { status: 500 }
      )
    }

    const { sourceUrl, filename } = await request.json()
    if (!sourceUrl) {
      return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
    }
    logInfo('convert_ebook.start', { sourceUrl, filename })

    const job = await createConversionJob(sourceUrl, filename)
    const jobId = job?.data?.id
    if (!jobId) throw new Error('CloudConvert jobId missing')

    const finished = await waitJob(jobId)
    const exportTask = finished?.data?.tasks?.find(t => t.name === 'export-pdf')
    const file = exportTask?.result?.files?.[0]
    const exportUrl = file?.url
    if (!exportUrl) throw new Error('CloudConvert export URL missing')

    const stored = await uploadToSupabase(exportUrl, filename)
    const pdfUrl = stored?.publicUrl || exportUrl

    logInfo('convert_ebook.success', {
      durationMs: Date.now() - startedAt,
      stored: Boolean(stored),
      jobId,
    })

    return NextResponse.json({
      pdfUrl,
      jobId,
      storedPath: stored?.path || null,
    })
  } catch (err) {
    logError('convert_ebook.error', err, { durationMs: Date.now() - startedAt })
    return NextResponse.json(
      { error: err.message || 'Conversion failed' },
      { status: 500 }
    )
  }
}
