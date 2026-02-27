import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logInfo, logError } from '../../../../lib/logger'
import { createAdminClient } from '../../../../lib/supabaseAdmin'

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

function buildPdfPath(filename, objectID) {
  const safeName = safeSlug(filename)
  if (objectID) return `ebooks/${objectID}-${safeName}.pdf`
  return `ebooks/${safeName}.pdf`
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

async function uploadToSupabase(pdfUrl, filename, objectID) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) return null

  const res = await fetch(pdfUrl)
  if (!res.ok) return null
  const buffer = Buffer.from(await res.arrayBuffer())

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const path = buildPdfPath(filename, objectID)
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

async function findStoredPdf(filename, objectID) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) return null

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const expiresIn = Number.parseInt(process.env.SUPABASE_SIGNED_URL_EXPIRES || '3600', 10)
  const primaryPath = buildPdfPath(filename, objectID)
  const primary = await supabase
    .storage
    .from(SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(primaryPath, expiresIn)

  if (!primary.error && primary.data?.signedUrl) {
    return { publicUrl: primary.data.signedUrl, path: primaryPath, signed: true, expiresIn }
  }

  // Fallback: try to find any previous file for the same slug in the bucket
  const prefix = 'ebooks'
  const { data: files } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).list(prefix, {
    limit: 100,
    offset: 0,
  })

  if (!files || !files.length) return null
  const slug = safeSlug(filename)
  const match = files.find(file =>
    (objectID && file.name.includes(objectID)) || file.name.includes(slug)
  )
  if (!match) return null

  const fallbackPath = `${prefix}/${match.name}`
  const fallback = await supabase
    .storage
    .from(SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(fallbackPath, expiresIn)

  if (!fallback.error && fallback.data?.signedUrl) {
    return { publicUrl: fallback.data.signedUrl, path: fallbackPath, signed: true, expiresIn }
  }

  return null
}

async function logConversionEvent(payload) {
  const supabase = createAdminClient()
  if (!supabase) return
  await supabase.from('conversion_events').insert(payload)
}

export async function POST(request) {
  const startedAt = Date.now()
  let sourceUrl = null
  let filename = null
  let objectID = null
  let userId = null
  try {
    if (!CLOUDCONVERT_API_KEY) {
      return NextResponse.json(
        { error: 'Missing CLOUDCONVERT_API_KEY' },
        { status: 500 }
      )
    }

    const body = await request.json()
    sourceUrl = body?.sourceUrl || null
    filename = body?.filename || null
    objectID = body?.objectID || null
    userId = body?.userId || null
    if (!sourceUrl) {
      return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
    }
    logInfo('convert_ebook.start', { sourceUrl, filename })

    const existing = await findStoredPdf(filename, objectID)
    if (existing) {
      logInfo('convert_ebook.cache_hit', { objectID, storedPath: existing.path })
      await logConversionEvent({
        type: 'ebook',
        status: 'cache_hit',
        object_id: objectID || null,
        source_url: sourceUrl,
        storage_path: existing.path,
        user_id: userId || null,
        metadata: { cached: true },
      })
      return NextResponse.json({
        pdfUrl: existing.publicUrl,
        storedPath: existing.path,
        cached: true,
      })
    }

    const job = await createConversionJob(sourceUrl, filename)
    const jobId = job?.data?.id
    if (!jobId) throw new Error('CloudConvert jobId missing')

    const finished = await waitJob(jobId)
    const exportTask = finished?.data?.tasks?.find(t => t.name === 'export-pdf')
    const file = exportTask?.result?.files?.[0]
    const exportUrl = file?.url
    if (!exportUrl) throw new Error('CloudConvert export URL missing')

    const stored = await uploadToSupabase(exportUrl, filename, objectID)
    const pdfUrl = stored?.publicUrl || exportUrl

    logInfo('convert_ebook.success', {
      durationMs: Date.now() - startedAt,
      stored: Boolean(stored),
      jobId,
    })
    await logConversionEvent({
      type: 'ebook',
      status: 'success',
      object_id: objectID || null,
      source_url: sourceUrl,
      storage_path: stored?.path || null,
      user_id: userId || null,
      metadata: { jobId, stored: Boolean(stored) },
    })

    return NextResponse.json({
      pdfUrl,
      jobId,
      storedPath: stored?.path || null,
    })
  } catch (err) {
    logError('convert_ebook.error', err, { durationMs: Date.now() - startedAt })
    try {
      await logConversionEvent({
        type: 'ebook',
        status: 'error',
        object_id: objectID || null,
        source_url: sourceUrl || null,
        storage_path: null,
        user_id: userId || null,
        metadata: { filename: filename || null },
      })
    } catch {}
    return NextResponse.json(
      { error: err.message || 'Conversion failed' },
      { status: 500 }
    )
  }
}
