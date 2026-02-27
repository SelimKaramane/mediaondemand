'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { searchClient, INDEX_NAME } from '../../../lib/algolia'
import Navbar from '../../../components/Navbar'
import { createClient } from '../../../lib/supabase'
import { Play, BookOpen, Clock, Star, ArrowLeft, Lock, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import HlsPlayer from '../../../components/HlsPlayer'

export default function ContentPage() {
  const { id } = useParams()
  const router = useRouter()
  const [content, setContent] = useState(null)
  const [user, setUser] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [videoTranscoding, setVideoTranscoding] = useState(false)
  const [videoError, setVideoError] = useState(null)
  const [videoPlaybackId, setVideoPlaybackId] = useState(null)
  const [videoAssetId, setVideoAssetId] = useState(null)
  const [videoStatus, setVideoStatus] = useState(null)
  const [videoMode, setVideoMode] = useState('youtube')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)
  const [readerMode, setReaderMode] = useState('pdf')
  const [converting, setConverting] = useState(false)
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null)
  const [convertError, setConvertError] = useState(null)
  const [epubReady, setEpubReady] = useState(false)
  const [epubError, setEpubError] = useState(null)
  const [coverUrl, setCoverUrl] = useState(null)
  const [coverError, setCoverError] = useState(null)
  const [coverDismissed, setCoverDismissed] = useState(false)
  const [textPreview, setTextPreview] = useState('')
  const [textLoading, setTextLoading] = useState(false)
  const [textError, setTextError] = useState(null)
  const [epubContainerEl, setEpubContainerEl] = useState(null)
  const renditionRef = useRef(null)

  useEffect(() => {
    // Get user session
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    // Fetch content from Algolia by objectID
    const index = searchClient.initIndex(INDEX_NAME)
    index.getObject(id)
      .then(obj => { setContent(obj); setLoading(false) })
      .catch(() => { setLoading(false) })
  }, [id])

  const epubSource = content?.epubUrl ? `/api/epub?url=${encodeURIComponent(content.epubUrl)}` : null
  const textSource = content?.textUrl ? `/api/text?url=${encodeURIComponent(content.textUrl)}` : null

  const loadHistory = async () => {
    if (!user?.id) return
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const supabase = createClient()
      let query = supabase
        .from('conversion_events')
        .select('id, type, status, created_at, storage_path, metadata, object_id')
        .order('created_at', { ascending: false })
        .limit(6)
      if (content?.objectID) {
        query = query.eq('object_id', content.objectID)
      }
      const { data, error } = await query
      if (error) throw error
      setHistory(data || [])
    } catch (err) {
      setHistoryError(err.message || 'Impossible de charger l’historique')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (!content) return
    setConvertedPdfUrl(null)
    setConvertError(null)
    setCoverUrl(null)
    setCoverError(null)
    setCoverDismissed(false)
    setVideoPlaybackId(null)
    setVideoAssetId(null)
    setVideoStatus(null)
    setVideoError(null)
    const preferMux = content?.muxStatus === 'ready' || content?.muxStatus === 'ready_for_streaming'
    const preferMp4 = !!content?.videoSourceUrl
    const preferYoutube = !!(content?.youtubeUrl || content?.youtubeId)
    setVideoMode(preferMux ? 'mux' : (preferMp4 ? 'mp4' : (preferYoutube ? 'youtube' : 'mux')))
    setTextPreview('')
    setTextError(null)
    if (content.epubUrl) setReaderMode('epub')
    else setReaderMode('pdf')
  }, [content?.objectID])

  useEffect(() => {
    if (!user?.id || !content?.objectID) return
    loadHistory()
  }, [user?.id, content?.objectID])

  useEffect(() => {
    if (!epubSource || readerMode !== 'epub' || !epubContainerEl) return
    let destroyed = false
    let rendition = null
    let book = null
    let timeoutId = null
    let blobUrl = null
    const controller = new AbortController()

    setEpubReady(false)
    setEpubError(null)

    ;(async () => {
      try {
        timeoutId = setTimeout(() => {
          controller.abort()
          if (!destroyed) setEpubError('Chargement EPUB trop long')
        }, 12000)

        console.log('[EPUB] fetch', epubSource)
        const res = await fetch(epubSource, { signal: controller.signal })
        console.log('[EPUB] response', res.status, res.headers.get('content-type'))
        if (!res.ok) throw new Error(`EPUB ${res.status}`)
        const blob = await res.blob()
        console.log('[EPUB] blob size', blob.size)
        if (destroyed) return

        blobUrl = URL.createObjectURL(blob)
        console.log('[EPUB] blob url', blobUrl)

        const mod = await import('epubjs')
        if (destroyed) return
        const ePub = mod.default || mod
        book = ePub(blobUrl, { openAs: 'epub' })
        book.on?.('ready', () => console.log('[EPUB] book ready'))
        book.on?.('error', (err) => {
          console.error('[EPUB] book error', err)
          if (!destroyed) setEpubError(err?.message || 'Impossible d’afficher l’EPUB')
        })
        try {
          await book.ready
          const cover = await book.coverUrl()
          if (!destroyed && cover) setCoverUrl(cover)
        } catch (err) {
          if (!destroyed) setCoverError(err?.message || 'Cover indisponible')
        }
        rendition = book.renderTo(epubContainerEl, {
          width: '100%',
          height: '100%',
          method: 'continuous',
          flow: 'scrolled-doc',
          allowScriptedContent: true,
        })
        renditionRef.current = rendition
        rendition.on?.('relocated', (location) => {
          const atStart = location?.atStart ?? (
            location?.start?.index === 0 && location?.start?.displayed?.page === 1
          )
          if (!destroyed) setCoverDismissed(!atStart)
        })
        rendition.on?.('rendered', () => {
          console.log('[EPUB] rendition rendered')
          if (!destroyed) setEpubReady(true)
        })
        await rendition.display()
      } catch (err) {
        if (!destroyed && err?.name !== 'AbortError') {
          setEpubError(err?.message || 'Impossible d’afficher l’EPUB')
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    })()

    return () => {
      destroyed = true
      if (timeoutId) clearTimeout(timeoutId)
      try {
        rendition?.destroy()
      } catch {}
      renditionRef.current = null
      try {
        book?.destroy()
      } catch {}
      try {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
      } catch {}
    }
  }, [epubSource, readerMode, epubContainerEl])

  const loadTextPreview = async () => {
    if (!textSource || textLoading) return
    setTextLoading(true)
    setTextError(null)
    try {
      const res = await fetch(textSource)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Impossible de charger le texte')
      setTextPreview(data?.preview || '')
    } catch (err) {
      setTextError(err.message || 'Impossible de charger le texte')
    } finally {
      setTextLoading(false)
    }
  }

  const muxPlaybackId = videoPlaybackId || content?.muxPlaybackId || null
  const muxAssetId = videoAssetId || content?.muxAssetId || null
  const muxStatus = videoStatus || content?.muxStatus || null
  const canPlayHls = muxStatus === 'ready' || muxStatus === 'ready_for_streaming'

  useEffect(() => {
    if (!muxAssetId || canPlayHls) return
    const interval = setInterval(() => {
      refreshVideoStatus()
    }, 4000)
    return () => clearInterval(interval)
  }, [muxAssetId, canPlayHls])

  useEffect(() => {
    setPlaying(false)
  }, [videoMode, content?.objectID])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
      <Navbar />
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!content) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
      <Navbar />
      <p className="text-slate-400">Contenu introuvable.</p>
    </div>
  )

  const isVideo = content.type === 'video'

  const hasYoutube = Boolean(content.youtubeUrl || content.youtubeId)
  const hasMp4 = Boolean(content.videoSourceUrl)
  const youtubeBaseUrl = content.youtubeUrl
    || (content.youtubeId ? `https://www.youtube.com/embed/${content.youtubeId}` : null)
  const youtubeSrc = youtubeBaseUrl
    ? `${youtubeBaseUrl}${youtubeBaseUrl.includes('?') ? '&' : '?'}autoplay=1`
    : null
  const hlsUrl = muxPlaybackId ? `https://stream.mux.com/${muxPlaybackId}.m3u8` : null
  const mp4Src = content.videoSourceUrl || null

  // Prefer converted PDF when available; fallback to source
  const pdfUrl = convertedPdfUrl || content?.pdfUrl || null
  const coverImage = coverUrl || content?.thumbnail || null

  const handleTranscodeVideo = async () => {
    if (!content?.videoSourceUrl || videoTranscoding) return
    setVideoTranscoding(true)
    setVideoError(null)
    try {
      const res = await fetch('/api/convert/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: content.videoSourceUrl,
          objectID: content.objectID,
          userId: user?.id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Transcodage échoué')
      if (!data?.playbackId) throw new Error('Playback ID manquant')
      setVideoPlaybackId(data.playbackId)
      setVideoAssetId(data.assetId || null)
      setVideoStatus(data.status || null)
      await loadHistory()
    } catch (err) {
      setVideoError(err.message || 'Transcodage échoué')
    } finally {
      setVideoTranscoding(false)
    }
  }

  const refreshVideoStatus = async () => {
    if (!muxAssetId) return
    try {
      const res = await fetch(`/api/convert/video/status?assetId=${encodeURIComponent(muxAssetId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Status check failed')
      setVideoStatus(data.status || null)
      if (data.playbackId) setVideoPlaybackId(data.playbackId)
    } catch (err) {
      setVideoError(err.message || 'Status check failed')
    }
  }

  const handleConvert = async () => {
    if (!content?.epubUrl || converting) return
    setConverting(true)
    setConvertError(null)
    try {
      const res = await fetch('/api/convert/ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: content.epubUrl,
          filename: content.title,
          objectID: content.objectID,
          userId: user?.id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Conversion échouée')
      if (!data?.pdfUrl) throw new Error('PDF introuvable')
      setConvertedPdfUrl(data.pdfUrl)
      await loadHistory()
    } catch (err) {
      setConvertError(err.message || 'Conversion échouée')
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 pt-28 pb-20">

        {/* Back button */}
        <button onClick={() => router.push('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
          Retour au catalogue
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
            ${isVideo ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {isVideo ? <Play size={18} className="fill-current" /> : <BookOpen size={18} />}
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">{content.genre}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">{content.title}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {isVideo ? `${content.duration ?? '—'} min` : `${content.pages ?? '—'} pages`}
              </span>
              {typeof content.rating === 'number' && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Star size={13} className="fill-amber-400" />
                  {content.rating}
                </span>
              )}
              {typeof content.rating !== 'number' && typeof content.downloads === 'number' && (
                <span className="flex items-center gap-1 text-slate-300">
                  <Download size={13} />
                  {content.downloads.toLocaleString()} téléchargements
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-white/5 text-xs">{content.language}</span>
            </div>
          </div>
        </div>

        {/* Player / Reader */}
        {!user ? (
          /* Not logged in — lock screen */
          <div className="relative rounded-2xl overflow-hidden mb-8"
            style={{ background: '#141824', border: '1px solid #1e2d47' }}>
            <div className="aspect-video relative">
              <img src={content.thumbnail} alt={content.title}
                className="w-full h-full object-cover opacity-30 blur-sm" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                  <Lock size={24} className="text-indigo-400" />
                </div>
                <p className="text-white font-semibold text-lg">Connexion requise</p>
                <p className="text-slate-400 text-sm">Connecte-toi pour accéder à ce contenu</p>
                <button
                  onClick={() => {
                    const supabase = createClient()
                    supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: { redirectTo: `${window.location.origin}/content/${id}` }
                    })
                  }}
                  className="mt-2 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Se connecter avec Google
                </button>
              </div>
            </div>
          </div>
        ) : isVideo ? (
          /* Video player */
          <div className="rounded-2xl overflow-hidden mb-8 bg-black"
            style={{ border: '1px solid #1e2d47' }}>
            <div className="relative aspect-video bg-black">
              {videoMode === 'mux' ? (
                canPlayHls && hlsUrl ? (
                  <HlsPlayer src={hlsUrl} poster={content.thumbnail} className="w-full h-full" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                    <div>Transcodage en cours…</div>
                    <button
                      onClick={refreshVideoStatus}
                      className="px-2.5 py-1 rounded border border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                    >
                      Rafraîchir l’état
                    </button>
                  </div>
                )
              ) : videoMode === 'mp4' ? (
                <video
                  src={mp4Src || undefined}
                  poster={content.thumbnail}
                  controls
                  playsInline
                  className="w-full h-full"
                />
              ) : !playing ? (
                <div className="absolute inset-0 cursor-pointer group z-10" onClick={() => setPlaying(true)}>
                  <img src={content.thumbnail} alt={content.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-indigo-500/90 flex items-center justify-center shadow-2xl shadow-indigo-500/50 group-hover:scale-110 transition-transform">
                      <Play size={28} className="text-white fill-white ml-2" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 text-xs text-white/60 bg-black/40 px-2 py-1 rounded">
                    Cliquer pour lancer (YouTube)
                  </div>
                </div>
              ) : (
                <iframe
                  src={youtubeSrc}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}

              {videoMode === 'mux' && hlsUrl && (
                <div className="absolute top-3 left-3 z-20 text-xs text-emerald-200 bg-black/50 px-2 py-1 rounded">
                  HLS actif · {muxPlaybackId}
                </div>
              )}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-1">
                  {hasYoutube && (
                    <button
                      onClick={() => setVideoMode('youtube')}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        videoMode === 'youtube'
                          ? 'bg-indigo-500/80 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      YouTube
                    </button>
                  )}
                  {hasMp4 && (
                    <button
                      onClick={() => setVideoMode('mp4')}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        videoMode === 'mp4'
                          ? 'bg-slate-200/80 text-slate-900'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      MP4
                    </button>
                  )}
                  {muxPlaybackId && (
                    <button
                      onClick={() => setVideoMode('mux')}
                      disabled={!canPlayHls}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        videoMode === 'mux'
                          ? 'bg-emerald-500/80 text-white'
                          : canPlayHls
                            ? 'text-slate-300 hover:text-white'
                            : 'text-slate-500 cursor-not-allowed'
                      }`}
                      title={canPlayHls ? 'Lire via Mux (HLS)' : 'Mux pas prêt'}
                    >
                      HLS (Mux)
                    </button>
                  )}
                </div>
                {content.videoSourceUrl && !muxPlaybackId && (
                  <button
                    onClick={handleTranscodeVideo}
                    disabled={videoTranscoding}
                    className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                      videoTranscoding
                        ? 'border-white/10 text-slate-500'
                        : 'border-indigo-500/40 text-indigo-300 hover:text-indigo-200 hover:border-indigo-500/70'
                    }`}
                    title="Transcoder la vidéo via Mux"
                  >
                    {videoTranscoding ? 'Transcodage…' : 'Transcoder la vidéo'}
                  </button>
                )}
              </div>

              {content.source === 'pexels' && (
                <div className="absolute bottom-4 left-4 text-xs text-slate-300 bg-black/40 px-2 py-1 rounded">
                  Vidéos fournies par{' '}
                  <a
                    href={content.pexelsUrl || 'https://www.pexels.com'}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    Pexels
                  </a>
                </div>
              )}
              {videoError && (
                <div className="absolute bottom-4 right-4 text-xs text-red-300 bg-black/50 px-2 py-1 rounded">
                  {videoError}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Ebook reader */
          <div className="rounded-2xl overflow-hidden mb-8"
            style={{ border: '1px solid #1e2d47', height: '600px' }}>
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 px-4 py-3 border-b text-xs text-slate-400"
                style={{ borderColor: '#1e2d47', background: '#141824' }}>
                <BookOpen size={13} />
                Lecteur ebook — {content.title}
                <div className="ml-auto flex items-center gap-2">
                  {content.epubUrl && (
                    <button
                      onClick={() => setReaderMode('epub')}
                      className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                        readerMode === 'epub'
                          ? 'border-indigo-500/70 text-indigo-200'
                          : 'border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
                      }`}
                    >
                      EPUB
                    </button>
                  )}
                  {(pdfUrl || convertedPdfUrl) && (
                    <button
                      onClick={() => setReaderMode('pdf')}
                      className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                        readerMode === 'pdf'
                          ? 'border-indigo-500/70 text-indigo-200'
                          : 'border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
                      }`}
                    >
                      PDF
                    </button>
                  )}
                  {content.epubUrl && (
                    <button
                      onClick={handleConvert}
                      disabled={converting}
                      className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                        converting
                          ? 'border-white/10 text-slate-500'
                          : 'border-indigo-500/40 text-indigo-300 hover:text-indigo-200 hover:border-indigo-500/70'
                      }`}
                      title="Convertir d’EPUB en PDF via CloudConvert"
                    >
                      {converting ? 'Conversion…' : 'Convertir d’EPUB en PDF'}
                    </button>
                  )}
                  {readerMode === 'epub' && epubReady && (
                    <>
                      <button
                        onClick={() => renditionRef.current?.prev()}
                        className="px-2.5 py-1 rounded text-xs border border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                        title="Page précédente"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <button
                        onClick={() => renditionRef.current?.next()}
                        className="px-2.5 py-1 rounded text-xs border border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                        title="Page suivante"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {readerMode === 'epub' && content.epubUrl ? (
                <div className="flex-1 w-full flex flex-col" style={{ background: '#1a1f2e' }}>
                  <div className="relative flex-1 w-full">
                    {coverImage && !coverDismissed && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
                        <img
                          src={coverImage}
                          alt="Couverture"
                          className="h-full w-auto max-w-full object-contain rounded shadow"
                        />
                      </div>
                    )}
                    {coverError && (
                      <div className="px-4 py-2 text-xs text-amber-300 border-b border-white/5 bg-black/20">
                        {coverError}
                      </div>
                    )}
                    {!epubReady && !epubError && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                        Chargement EPUB…
                      </div>
                    )}
                    {epubError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-red-400 gap-2 px-6 text-center">
                        <div>{epubError}</div>
                        <div className="flex items-center gap-3">
                          <a
                            href={content.epubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-300 hover:text-indigo-200 underline"
                          >
                            Télécharger l’EPUB
                          </a>
                          {textSource && (
                            <button
                              onClick={loadTextPreview}
                              className="text-indigo-300 hover:text-indigo-200 underline"
                            >
                              Voir un extrait
                            </button>
                          )}
                        </div>
                        {textLoading && <div className="text-slate-400">Chargement du texte…</div>}
                        {textError && <div className="text-red-400">{textError}</div>}
                        {textPreview && (
                          <div className="max-h-40 overflow-auto text-slate-300 text-xs text-left whitespace-pre-wrap mt-2 bg-black/30 p-3 rounded">
                            {textPreview}
                          </div>
                        )}
                      </div>
                    )}
                    <div ref={setEpubContainerEl} className="absolute inset-0" />
                  </div>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="flex-1 w-full"
                  style={{ background: '#1a1f2e' }}
                />
              ) : (
                <div className="flex-1 w-full flex items-center justify-center text-xs text-slate-500">
                  PDF indisponible — convertis l’EPUB pour générer un PDF.
                </div>
              )}
              <div className="px-4 py-2 text-xs text-slate-500 border-t"
                style={{ borderColor: '#1e2d47', background: '#141824' }}>
                {readerMode === 'pdf' ? (
                  <>
                    Si le lecteur ne se charge pas, ouvre le PDF dans un nouvel onglet :
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-indigo-300 hover:text-indigo-200 underline"
                      >
                        Ouvrir le PDF
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    EPUB — tu peux le télécharger ici :
                    <a
                      href={content.epubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-indigo-300 hover:text-indigo-200 underline"
                    >
                      Télécharger l’EPUB
                    </a>
                  </>
                )}
                {convertError && (
                  <div className="mt-2 text-red-400">{convertError}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="rounded-xl p-6 mt-8" style={{ background: '#141824', border: '1px solid #1e2d47' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Historique</h2>
            <button
              onClick={loadHistory}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Rafraîchir
            </button>
          </div>
          {!user && (
            <p className="text-slate-400 text-sm">Connecte-toi pour voir l’historique des conversions.</p>
          )}
          {user && historyLoading && (
            <p className="text-slate-400 text-sm">Chargement de l’historique…</p>
          )}
          {user && historyError && (
            <p className="text-red-400 text-sm">{historyError}</p>
          )}
          {user && !historyLoading && !historyError && history.length === 0 && (
            <p className="text-slate-400 text-sm">Aucun événement pour ce contenu.</p>
          )}
          {user && history.length > 0 && (
            <div className="space-y-3">
              {history.map(event => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-4 border-b border-white/5 pb-3"
                >
                  <div>
                    <div className="text-sm text-slate-200">
                      {event.type === 'video' ? 'Vidéo' : 'Ebook'} · {event.status}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(event.created_at).toLocaleString('fr-FR')}
                    </div>
                  </div>
                  {event.storage_path && (
                    <div className="text-xs text-slate-500 break-all">
                      {event.storage_path}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="rounded-xl p-6" style={{ background: '#141824', border: '1px solid #1e2d47' }}>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-3">À propos</h2>
          <p className="text-slate-400 leading-relaxed">{content.description}</p>
        </div>

      </div>
    </div>
  )
}
