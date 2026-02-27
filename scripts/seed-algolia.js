// scripts/seed-algolia.js
// Run: node scripts/seed-algolia.js
// Requires: NEXT_PUBLIC_ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY in .env.local
// Optional: GUTENDEX_LANGS=es,en  GUTENDEX_LIMIT=20  ALGOLIA_INDEX_NAME=mediaondemand_content

const algoliasearch = require('algoliasearch')
const fs = require('fs')
const path = require('path')

function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename)
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || 'mediaondemand_content'

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error('❌ Missing Algolia credentials. Set NEXT_PUBLIC_ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in .env.local.')
  process.exit(1)
}

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)
const index = client.initIndex(ALGOLIA_INDEX_NAME)

const GUTENDEX_BASE = 'https://gutendex.com/books'
const LANGS = (process.env.GUTENDEX_LANGS || 'es,en,fr')
  .split(',')
  .map(l => l.trim())
  .filter(Boolean)
const TARGET_COUNT = Number.parseInt(process.env.GUTENDEX_LIMIT || '20', 10)
const WORDS_PER_PAGE = 300

const videos = [
  { title: 'Introduction au Machine Learning', genre: 'Technologie', duration: 45, language: 'Français', description: 'Découvrez les bases du machine learning avec des exemples concrets et accessibles.' },
  { title: 'Docker & Kubernetes en pratique', genre: 'Technologie', duration: 72, language: 'Français', description: 'Maîtrisez la conteneurisation et l\'orchestration avec Docker et Kubernetes.' },
  { title: 'Design System avec Figma', genre: 'Design', duration: 38, language: 'Français', description: 'Créez un design system professionnel de A à Z avec Figma.' },
  { title: 'Photographie de portrait', genre: 'Art', duration: 55, language: 'Français', description: 'Techniques avancées pour réaliser des portraits époustouflants.' },
  { title: 'React & Next.js Masterclass', genre: 'Technologie', duration: 120, language: 'Français', description: 'Le guide complet pour maîtriser React et Next.js en 2024.' },
  { title: 'Histoire de l\'art moderne', genre: 'Culture', duration: 60, language: 'Français', description: 'Un voyage fascinant à travers les mouvements artistiques du XXe siècle.' },
  { title: 'Python pour la data science', genre: 'Technologie', duration: 90, language: 'Français', description: 'Analysez et visualisez des données avec Python, Pandas et Matplotlib.' },
  { title: 'Cinéma indépendant : les bases', genre: 'Cinéma', duration: 48, language: 'Français', description: 'Comment réaliser un court-métrage de qualité avec peu de moyens.' },
  { title: 'The Art of Storytelling', genre: 'Culture', duration: 35, language: 'Anglais', description: 'Master the ancient art of storytelling to captivate any audience.' },
  { title: 'Cybersecurity Fundamentals', genre: 'Technologie', duration: 85, language: 'Anglais', description: 'Protect your systems and understand common attack vectors.' },
]

const videoThumbnails = [
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=640&q=80',
  'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=640&q=80',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=640&q=80',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=640&q=80',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=640&q=80',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=640&q=80',
  'https://images.unsplash.com/photo-1581905764498-f1b60bae941a?w=640&q=80',
  'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=640&q=80',
]

const videoSources = [
  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
]

const YOUTUBE_PLAYLIST_ID = process.env.YOUTUBE_PLAYLIST_ID
const YOUTUBE_PLAYLIST_IDS = process.env.YOUTUBE_PLAYLIST_IDS
const YOUTUBE_PLAYLISTS = process.env.YOUTUBE_PLAYLISTS
const YOUTUBE_MAX_VIDEOS = Number.parseInt(process.env.YOUTUBE_MAX_VIDEOS || '50', 10)
const YOUTUBE_LANGUAGE = process.env.YOUTUBE_LANGUAGE || 'Français'
const YOUTUBE_GENRE = process.env.YOUTUBE_GENRE || 'Culture'
const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const PEXELS_QUERY = process.env.PEXELS_QUERY
const PEXELS_QUERIES = process.env.PEXELS_QUERIES
const PEXELS_MAX_VIDEOS = Number.parseInt(process.env.PEXELS_MAX_VIDEOS || '50', 10)
const PEXELS_PER_PAGE = Math.min(
  80,
  Math.max(1, Number.parseInt(process.env.PEXELS_PER_PAGE || '80', 10))
)
const PEXELS_PER_QUERY = Number.parseInt(process.env.PEXELS_PER_QUERY || '0', 10)
const PEXELS_MIN_DURATION = process.env.PEXELS_MIN_DURATION
const PEXELS_MAX_DURATION = process.env.PEXELS_MAX_DURATION
const PEXELS_LANGUAGE = process.env.PEXELS_LANGUAGE || 'English'
const PEXELS_GENRE = process.env.PEXELS_GENRE || 'Technologie'
const SUPABASE_VIDEO_PUBLIC = (process.env.SUPABASE_VIDEO_PUBLIC || '').toLowerCase() === 'true'
const VIDEO_SOURCES_FILE = process.env.VIDEO_SOURCES_FILE
  ? path.resolve(process.cwd(), process.env.VIDEO_SOURCES_FILE)
  : path.resolve(process.cwd(), 'scripts/video-sources.json')

function decodeXml(value) {
  if (!value) return value
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function parsePexelsQueries() {
  if (PEXELS_QUERIES) {
    return PEXELS_QUERIES.split(',')
      .map(entry => entry.trim())
      .filter(Boolean)
      .map(entry => {
        const [query, genre, language] = entry.split('|').map(part => part.trim())
        if (!query) return null
        return {
          query,
          genre: genre || PEXELS_GENRE,
          language: language || PEXELS_LANGUAGE,
        }
      })
      .filter(Boolean)
  }

  if (PEXELS_QUERY) {
    const queries = PEXELS_QUERY.split(',')
      .map(q => q.trim())
      .filter(Boolean)

    return queries.map(query => ({
      query,
      genre: PEXELS_GENRE,
      language: PEXELS_LANGUAGE,
    }))
  }

  return [
    { query: 'technology', genre: 'Technologie', language: 'English' },
    { query: 'artificial intelligence', genre: 'Technologie', language: 'English' },
    { query: 'science lab', genre: 'Sciences', language: 'English' },
    { query: 'business', genre: 'Business', language: 'English' },
    { query: 'education', genre: 'Éducation', language: 'English' },
    { query: 'design', genre: 'Design', language: 'English' },
    { query: 'culture', genre: 'Culture', language: 'English' },
    { query: 'technologie', genre: 'Technologie', language: 'Français' },
    { query: 'intelligence artificielle', genre: 'Technologie', language: 'Français' },
    { query: 'science', genre: 'Sciences', language: 'Français' },
    { query: 'éducation', genre: 'Éducation', language: 'Français' },
    { query: 'culture', genre: 'Culture', language: 'Français' },
  ]
}

function pickPexelsVideoFile(video) {
  const files = (video?.video_files || [])
    .filter(file => file?.file_type === 'video/mp4' && file?.link)
  if (!files.length) return null
  const within = files
    .filter(file => Number.isFinite(file.width) && file.width <= 1920)
    .sort((a, b) => (a.width || 0) - (b.width || 0))
  if (within.length) return within[within.length - 1]
  return files.sort((a, b) => (a.width || 0) - (b.width || 0))[files.length - 1]
}

async function fetchPexelsVideos(queries) {
  const items = []
  const seen = new Set()

  for (const query of queries) {
    let addedForQuery = 0
    let page = 1
    while (items.length < PEXELS_MAX_VIDEOS) {
      const url = new URL('https://api.pexels.com/videos/search')
      url.searchParams.set('query', query.query)
      url.searchParams.set('per_page', String(PEXELS_PER_PAGE))
      url.searchParams.set('page', String(page))
      if (PEXELS_MIN_DURATION) url.searchParams.set('min_duration', String(PEXELS_MIN_DURATION))
      if (PEXELS_MAX_DURATION) url.searchParams.set('max_duration', String(PEXELS_MAX_DURATION))

      const res = await fetch(url.toString(), {
        headers: { Authorization: PEXELS_API_KEY },
      })
      if (!res.ok) throw new Error(`Pexels ${res.status}: ${await res.text()}`)
      const data = await res.json()
      const videos = data?.videos || []
      if (!videos.length) break

      for (const video of videos) {
        if (!video?.id || seen.has(video.id)) continue
        const file = pickPexelsVideoFile(video)
        if (!file) continue
        seen.add(video.id)

        const durationMinutes = Math.max(1, Math.round((video.duration || 0) / 60))
        const author = video?.user?.name || 'Pexels'
        const title = `${query.genre} • ${author} #${video.id}`

        items.push({
          title,
          genre: query.genre,
          duration: durationMinutes,
          language: query.language,
          description: `Vidéo Pexels — ${query.query}`,
          thumbnail: video.image,
          videoSourceUrl: file.link,
          source: 'pexels',
          pexelsUrl: video.url,
        })
        addedForQuery += 1
        if (items.length >= PEXELS_MAX_VIDEOS) break
        if (PEXELS_PER_QUERY > 0 && addedForQuery >= PEXELS_PER_QUERY) break
      }

      if (!data?.next_page) break
      if (PEXELS_PER_QUERY > 0 && addedForQuery >= PEXELS_PER_QUERY) break
      page += 1
    }

    if (items.length >= PEXELS_MAX_VIDEOS) break
  }

  if (items.length < PEXELS_MAX_VIDEOS) {
    console.warn(`⚠️ Seulement ${items.length} vidéos Pexels récupérées (objectif ${PEXELS_MAX_VIDEOS}).`)
  }

  return items
}

function loadVideoSources() {
  if (!fs.existsSync(VIDEO_SOURCES_FILE)) return {}
  try {
    const raw = fs.readFileSync(VIDEO_SOURCES_FILE, 'utf8')
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return {}
    const map = {}
    for (const entry of data) {
      if (!entry || !entry.youtubeId) continue
      map[entry.youtubeId] = entry
    }
    return map
  } catch (err) {
    console.warn(`⚠️ Impossible de lire ${VIDEO_SOURCES_FILE}: ${err.message}`)
    return {}
  }
}

function parsePlaylistConfig() {
  if (YOUTUBE_PLAYLISTS) {
    return YOUTUBE_PLAYLISTS.split(',')
      .map(entry => entry.trim())
      .filter(Boolean)
      .map(entry => {
        const [id, genre, language] = entry.split('|').map(part => part.trim())
        if (!id) return null
        return {
          id,
          genre: genre || YOUTUBE_GENRE,
          language: language || YOUTUBE_LANGUAGE,
        }
      })
      .filter(Boolean)
  }

  if (YOUTUBE_PLAYLIST_IDS) {
    return YOUTUBE_PLAYLIST_IDS.split(',')
      .map(id => id.trim())
      .filter(Boolean)
      .map(id => ({ id, genre: YOUTUBE_GENRE, language: YOUTUBE_LANGUAGE }))
  }

  if (YOUTUBE_PLAYLIST_ID) {
    return [{ id: YOUTUBE_PLAYLIST_ID, genre: YOUTUBE_GENRE, language: YOUTUBE_LANGUAGE }]
  }

  return []
}

async function fetchYouTubePlaylist(playlist) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlist.id)}`
  const res = await fetch(feedUrl)
  if (!res.ok) throw new Error(`YouTube feed HTTP ${res.status}`)
  const xml = await res.text()
  const entries = xml.split('<entry>').slice(1)
  const items = []

  for (const entry of entries) {
    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/)
    const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)
    if (!idMatch || !titleMatch) continue
    const youtubeId = decodeXml(idMatch[1])
    const title = decodeXml(titleMatch[1])
    const description = decodeXml(descMatch?.[1] || '')

    items.push({
      title,
      genre: playlist.genre,
      duration: null,
      language: playlist.language,
      description: description || `Vidéo YouTube — ${title}`,
      youtubeId,
      youtubeUrl: `https://www.youtube.com/embed/${youtubeId}`,
      thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    })
  }

  return items
}

async function fetchYouTubePlaylists(playlists) {
  const items = []
  const seen = new Set()

  for (const playlist of playlists) {
    let entries = []
    try {
      entries = await fetchYouTubePlaylist(playlist)
    } catch (err) {
      console.warn(`⚠️ Playlist ${playlist.id} ignorée: ${err.message}`)
      continue
    }

    for (const entry of entries) {
      if (seen.has(entry.youtubeId)) continue
      seen.add(entry.youtubeId)
      items.push(entry)
      if (items.length >= YOUTUBE_MAX_VIDEOS) return items
    }
  }

  if (items.length < YOUTUBE_MAX_VIDEOS) {
    console.warn(`⚠️ Seulement ${items.length} vidéos récupérées (objectif ${YOUTUBE_MAX_VIDEOS}).`)
  }

  return items
}

const ebookFallbackCovers = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=640&q=80',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=640&q=80',
  'https://images.unsplash.com/photo-1589998059171-988d887df646?w=640&q=80',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=640&q=80',
  'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=640&q=80',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=640&q=80',
]

function mapLanguage(code) {
  const map = { en: 'English', es: 'Español', fr: 'Français', it: 'Italiano', de: 'Deutsch' }
  return map[code] || code
}

function pickPdf(formats) {
  const entries = Object.entries(formats || {})
  for (const [mime, url] of entries) {
    if (mime.startsWith('application/pdf')) return url
  }
  return null
}

function pickEpub(formats) {
  const entries = Object.entries(formats || {})
  for (const [mime, url] of entries) {
    if (mime.startsWith('application/epub+zip')) return url
  }
  return null
}

function pickText(formats) {
  const entries = Object.entries(formats || {})
  const textEntries = entries.filter(([mime]) => mime.startsWith('text/plain'))
  const nonZip = textEntries.find(([, url]) => !url.endsWith('.zip'))
  if (nonZip) return nonZip[1]
  return textEntries[0]?.[1] || null
}

function pickCover(formats) {
  return formats?.['image/jpeg'] || null
}

function buildDescription(book) {
  const summaries = (book.summaries || []).filter(Boolean)
  if (summaries.length) return summaries[0]
  const authors = (book.authors || []).map(a => a.name).filter(Boolean)
  const subjects = (book.subjects || []).slice(0, 4)
  if (subjects.length) return `Sujets : ${subjects.join(' • ')}`
  if (authors.length) return `Auteur(s) : ${authors.join(', ')}`
  return 'Livre du domaine public (Project Gutenberg).'
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`)
  return res.json()
}

async function estimatePages(textUrl) {
  if (!textUrl) return null
  const res = await fetch(textUrl)
  if (!res.ok) return null
  const text = await res.text()
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / WORDS_PER_PAGE))
}

async function fetchGutenbergBooks() {
  const books = []
  let url = `${GUTENDEX_BASE}?languages=${LANGS.join(',')}`

  while (url && books.length < TARGET_COUNT) {
    const data = await fetchJson(url)
    for (const book of data.results || []) {
      if (books.length >= TARGET_COUNT) break
      const pdfUrl = pickPdf(book.formats)
      const epubUrl = pickEpub(book.formats)
      const textUrl = pickText(book.formats)
      if (!textUrl || (!pdfUrl && !epubUrl)) continue
      const pages = await estimatePages(textUrl)
      if (!pages) continue

      books.push({
        objectID: `gutenberg-${book.id}`,
        type: 'ebook',
        title: book.title,
        genre: (book.bookshelves && book.bookshelves[0]) || (book.subjects && book.subjects[0]) || 'Général',
        language: mapLanguage(book.languages?.[0] || 'en'),
        pages,
        downloads: book.download_count || 0,
        description: buildDescription(book),
        thumbnail: pickCover(book.formats) || ebookFallbackCovers[books.length % ebookFallbackCovers.length],
        pdfUrl,
        epubUrl,
        textUrl,
        source: 'gutenberg',
      })
    }
    url = data.next
  }

  return books
}

async function seed() {
  try {
    console.log(`⏳ Récupération de livres depuis Gutendex (${LANGS.join(',')})...`)
    const ebooks = await fetchGutenbergBooks()

    if (!ebooks.length) {
      console.error('❌ Aucun ebook récupéré. Réduis les filtres ou augmente GUTENDEX_LIMIT.')
      process.exit(1)
    }

    let videoList = videos
    const videoSourceMap = loadVideoSources()
    const playlists = parsePlaylistConfig()
    const pexelsQueries = parsePexelsQueries()

    if (PEXELS_API_KEY) {
      console.log(`⏳ Récupération de vidéos Pexels (${pexelsQueries.length} requête(s))...`)
      videoList = await fetchPexelsVideos(pexelsQueries)
    } else if (playlists.length) {
      console.log(`⏳ Récupération de vidéos YouTube (${playlists.length} playlist(s))...`)
      videoList = await fetchYouTubePlaylists(playlists)
    }

    const records = [
      ...videoList.map((v, i) => ({
        objectID: `video-${i + 1}`,
        type: 'video',
        thumbnail: v.thumbnail || videoThumbnails[i % videoThumbnails.length],
        youtubeId: v.youtubeId,
        youtubeUrl: v.youtubeUrl,
        videoSourceUrl: v.videoSourceUrl
          || (SUPABASE_VIDEO_PUBLIC && v.youtubeId ? videoSourceMap[v.youtubeId]?.publicUrl : null)
          || (!v.youtubeId ? videoSources[i % videoSources.length] : null),
        videoStoragePath: v.videoStoragePath
          || (v.youtubeId ? videoSourceMap[v.youtubeId]?.storagePath : null),
        ...v,
      })),
      ...ebooks,
    ]

    console.log(`⏳ Indexation de ${records.length} contenus dans Algolia...`)

    await index.setSettings({
      searchableAttributes: ['title', 'description', 'genre', 'language'],
      attributesForFaceting: ['type', 'genre', 'language'],
      customRanking: ['desc(downloads)'],
    })

    const clearTask = await index.clearObjects()
    if (clearTask && clearTask.taskID !== undefined && clearTask.taskID !== null) {
      await index.waitTask(clearTask.taskID)
    } else {
      console.warn('⚠️ clearObjects: taskID absent, on continue sans waitTask.')
    }

    const saveTask = await index.saveObjects(records)
    if (saveTask && saveTask.taskID !== undefined && saveTask.taskID !== null) {
      await index.waitTask(saveTask.taskID)
    } else {
      console.warn('⚠️ saveObjects: taskID absent, on continue sans waitTask.')
    }

    console.log(`✅ ${records.length} contenus indexés avec succès !`)
    console.log('🎉 Ton index Algolia est prêt. Lance npm run dev pour voir la démo.')
  } catch (err) {
    console.error('❌ Erreur :', err.message)
    process.exit(1)
  }
}

seed()
