'use client'
/* eslint-disable @next/next/no-img-element */

import { Play, BookOpen, Clock, Star, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ContentCard({ hit }) {
  const isVideo = hit.type === 'video'
  const router = useRouter()

  return (
    <div onClick={() => router.push(`/content/${hit.objectID}`)}
      className="group relative rounded-xl overflow-hidden border border-white/5 bg-white/3 hover:border-indigo-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer">

      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={hit.thumbnail}
          alt={hit.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Type badge */}
        <div className={`absolute top-2 left-2 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md
          ${isVideo ? 'bg-indigo-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
          {isVideo ? <Play size={10} className="fill-white" /> : <BookOpen size={10} />}
          {isVideo ? 'Vidéo' : 'Ebook'}
        </div>

        {/* Play button overlay */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Play size={18} className="text-white fill-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-xs text-indigo-400 font-medium mb-1 uppercase tracking-wide">{hit.genre}</p>
        <h3 className="text-sm font-semibold text-white leading-snug mb-2 line-clamp-2 group-hover:text-indigo-300 transition-colors">
          {hit.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{hit.description}</p>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock size={11} />
            {isVideo ? `${hit.duration ?? '—'} min` : `${hit.pages ?? '—'} pages`}
          </div>
          {typeof hit.rating === 'number' && (
            <div className="flex items-center gap-1 text-amber-400">
              <Star size={11} className="fill-amber-400" />
              {hit.rating}
            </div>
          )}
          {typeof hit.rating !== 'number' && typeof hit.downloads === 'number' && (
            <div className="flex items-center gap-1 text-slate-400">
              <Download size={11} />
              {hit.downloads.toLocaleString()}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
