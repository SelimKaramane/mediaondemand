'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { searchClient, INDEX_NAME } from '../../../lib/algolia'
import Navbar from '../../../components/Navbar'
import { createClient } from '../../../lib/supabase'
import { Play, BookOpen, Clock, Star, ArrowLeft, Lock } from 'lucide-react'

export default function ContentPage() {
  const { id } = useParams()
  const router = useRouter()
  const [content, setContent] = useState(null)
  const [user, setUser] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)

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

  // Sample YouTube videos by genre for demo
  const demoVideos = {
    'Technologie': 'https://www.youtube.com/embed/aircAruvnKk',
    'Design': 'https://www.youtube.com/embed/2xofx86VvNk',
    'Art': 'https://www.youtube.com/embed/HVGBBBbQBOo',
    'Culture': 'https://www.youtube.com/embed/cdiD-9MMpb0',
    'Cinéma': 'https://www.youtube.com/embed/TnGl01FkMMo',
    'default': 'https://www.youtube.com/embed/aircAruvnKk',
  }
  const videoUrl = demoVideos[content.genre] || demoVideos['default']

  // Sample PDF for ebook demo
  const ebookUrl = 'https://www.w3.org/WAI/WCAG21/wcag21.pdf'

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
                {isVideo ? `${content.duration} min` : `${content.pages} pages`}
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <Star size={13} className="fill-amber-400" />
                {content.rating}
              </span>
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
            {!playing ? (
              <div className="relative aspect-video cursor-pointer group" onClick={() => setPlaying(true)}>
                <img src={content.thumbnail} alt={content.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-500/90 flex items-center justify-center shadow-2xl shadow-indigo-500/50 group-hover:scale-110 transition-transform">
                    <Play size={28} className="text-white fill-white ml-2" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 text-xs text-white/60 bg-black/40 px-2 py-1 rounded">
                  Cliquer pour lancer (démo YouTube)
                </div>
              </div>
            ) : (
              <div className="aspect-video">
                <iframe
                  src={`${videoUrl}?autoplay=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
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
                <span className="ml-auto text-slate-600">Démo PDF</span>
              </div>
              <iframe
                src={ebookUrl}
                className="flex-1 w-full"
                style={{ background: '#1a1f2e' }}
              />
            </div>
          </div>
        )}

        {/* Description */}
        <div className="rounded-xl p-6" style={{ background: '#141824', border: '1px solid #1e2d47' }}>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-3">À propos</h2>
          <p className="text-slate-400 leading-relaxed">{content.description}</p>
        </div>

      </div>
    </div>
  )
}
