'use client'

import { InstantSearch, SearchBox, Hits, RefinementList, Pagination, Configure, Stats } from 'react-instantsearch'
import { searchClient, INDEX_NAME } from '../lib/algolia'
import Navbar from '../components/Navbar'
import ContentCard from '../components/ContentCard'
import { SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'

function Hit({ hit }) {
  return <ContentCard hit={hit} />
}

export default function Home() {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      <Navbar />

      {/* Hero */}
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Plateforme de streaming & lecture
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Votre médiathèque<br />
            <span className="text-indigo-400">à la demande</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Des centaines de vidéos et ebooks disponibles instantanément.
          </p>
        </div>
      </div>

      {/* Search & Content */}
      <InstantSearch searchClient={searchClient} indexName={INDEX_NAME} routing>
        <Configure hitsPerPage={12} />

        <div className="max-w-7xl mx-auto px-6 pb-20">

          {/* Search bar + filter toggle */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1">
              <SearchBox placeholder="Rechercher un film, livre, genre..." />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                ${showFilters
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}>
              {showFilters ? <X size={15} /> : <SlidersHorizontal size={15} />}
              Filtres
            </button>
          </div>

          <div className="flex gap-8">

            {/* Sidebar filters */}
            {showFilters && (
              <aside className="w-56 flex-shrink-0">
                <div className="sticky top-24 space-y-6">

                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Type</h3>
                    <RefinementList attribute="type" />
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Genre</h3>
                    <RefinementList attribute="genre" limit={8} showMore />
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Langue</h3>
                    <RefinementList attribute="language" />
                  </div>

                </div>
              </aside>
            )}

            {/* Results */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <Stats
                  classNames={{ root: 'text-xs text-slate-500' }}
                  translations={{
                    rootElementText: ({ nbHits, processingTimeMS }) =>
                      `${nbHits.toLocaleString()} résultats (${processingTimeMS}ms)`
                  }}
                />
              </div>

              <Hits hitComponent={Hit} />

              <div className="mt-10">
                <Pagination />
              </div>
            </div>

          </div>
        </div>
      </InstantSearch>
    </div>
  )
}
