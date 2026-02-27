'use client'

import { InstantSearch, SearchBox, Hits, RefinementList, Pagination, Configure, Stats, ClearRefinements, CurrentRefinements } from 'react-instantsearch'
import { searchClient, INDEX_NAME } from '../lib/algolia'
import Navbar from '../components/Navbar'
import ContentCard from '../components/ContentCard'
import { SlidersHorizontal, X } from 'lucide-react'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function Hit({ hit }) {
  return <ContentCard hit={hit} />
}

function HomeContent() {
  const [showFilters, setShowFilters] = useState(false)
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type')
  const typeFilter = typeParam === 'video' || typeParam === 'ebook' ? `type:${typeParam}` : undefined

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
      <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
        <Configure hitsPerPage={12} filters={typeFilter} />

        <div className="max-w-7xl mx-auto px-6 pb-20">

          {/* Search bar + filter toggle */}
          <div className="flex gap-3 mb-2">
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
          <p className="text-xs text-slate-500 mb-6">
            Recherche & filtrage gérés par un moteur managé (Algolia).
          </p>

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
                <ClearRefinements
                  classNames={{
                    root: 'text-xs text-slate-400',
                    button: 'px-3 py-1 rounded border border-white/10 hover:border-white/20 hover:text-white transition-colors',
                    disabledButton: 'opacity-40 cursor-not-allowed',
                  }}
                  translations={{ resetButtonText: 'Réinitialiser les filtres' }}
                />
              </div>
              <div className="mb-4">
                <CurrentRefinements
                  classNames={{
                    root: 'text-xs text-slate-400',
                    list: 'flex flex-wrap gap-2',
                    item: 'px-2 py-1 rounded bg-white/5 border border-white/10',
                    label: 'mr-1 text-slate-500',
                    category: 'text-slate-300',
                    delete: 'ml-2 text-slate-400 hover:text-white',
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

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0f1117' }} />}>
      <HomeContent />
    </Suspense>
  )
}
