// scripts/seed-algolia.js
// Run: node scripts/seed-algolia.js
// Requires: ALGOLIA_ADMIN_KEY, NEXT_PUBLIC_ALGOLIA_APP_ID in .env.local

const algoliasearch = require('algoliasearch')

const client = algoliasearch(
  '3VCDQSE1WU',
  process.env.ALGOLIA_ADMIN_KEY || 'b9b1163575d51a27ceafcc1a76e14d80'
)
const index = client.initIndex('mediaondemand_content')

const unsplashVideos = [
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=640&q=80',
  'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=640&q=80',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=640&q=80',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=640&q=80',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=640&q=80',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=640&q=80',
  'https://images.unsplash.com/photo-1581905764498-f1b60bae941a?w=640&q=80',
  'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=640&q=80',
]

const unsplashEbooks = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=640&q=80',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=640&q=80',
  'https://images.unsplash.com/photo-1589998059171-988d887df646?w=640&q=80',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=640&q=80',
  'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=640&q=80',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=640&q=80',
]

const videos = [
  { title: 'Introduction au Machine Learning', genre: 'Technologie', duration: 45, language: 'Français', rating: 4.8, description: 'Découvrez les bases du machine learning avec des exemples concrets et accessibles.' },
  { title: 'Docker & Kubernetes en pratique', genre: 'Technologie', duration: 72, language: 'Français', rating: 4.6, description: 'Maîtrisez la conteneurisation et l\'orchestration avec Docker et Kubernetes.' },
  { title: 'Design System avec Figma', genre: 'Design', duration: 38, language: 'Français', rating: 4.9, description: 'Créez un design system professionnel de A à Z avec Figma.' },
  { title: 'Photographie de portrait', genre: 'Art', duration: 55, language: 'Français', rating: 4.7, description: 'Techniques avancées pour réaliser des portraits époustouflants.' },
  { title: 'React & Next.js Masterclass', genre: 'Technologie', duration: 120, language: 'Français', rating: 4.9, description: 'Le guide complet pour maîtriser React et Next.js en 2024.' },
  { title: 'Histoire de l\'art moderne', genre: 'Culture', duration: 60, language: 'Français', rating: 4.5, description: 'Un voyage fascinant à travers les mouvements artistiques du XXe siècle.' },
  { title: 'Python pour la data science', genre: 'Technologie', duration: 90, language: 'Français', rating: 4.8, description: 'Analysez et visualisez des données avec Python, Pandas et Matplotlib.' },
  { title: 'Cinéma indépendant : les bases', genre: 'Cinéma', duration: 48, language: 'Français', rating: 4.4, description: 'Comment réaliser un court-métrage de qualité avec peu de moyens.' },
  { title: 'The Art of Storytelling', genre: 'Culture', duration: 35, language: 'Anglais', rating: 4.6, description: 'Master the ancient art of storytelling to captivate any audience.' },
  { title: 'Cybersecurity Fundamentals', genre: 'Technologie', duration: 85, language: 'Anglais', rating: 4.7, description: 'Protect your systems and understand common attack vectors.' },
]

const ebooks = [
  { title: 'Clean Code : Le guide du développeur', genre: 'Technologie', pages: 320, language: 'Français', rating: 4.9, description: 'Les principes fondamentaux pour écrire un code lisible, maintenable et élégant.' },
  { title: 'L\'Architecture des systèmes distribués', genre: 'Technologie', pages: 480, language: 'Français', rating: 4.7, description: 'Comprendre et concevoir des systèmes distribués à grande échelle.' },
  { title: 'UX Design : Méthodes et outils', genre: 'Design', pages: 256, language: 'Français', rating: 4.8, description: 'Guide pratique pour concevoir des interfaces centrées sur l\'utilisateur.' },
  { title: 'Sapiens : Brève histoire de l\'humanité', genre: 'Culture', pages: 512, language: 'Français', rating: 4.9, description: 'Une exploration fascinante de l\'histoire de l\'espèce humaine.' },
  { title: 'Le Marketing Digital en 2024', genre: 'Business', pages: 290, language: 'Français', rating: 4.5, description: 'Stratégies et outils pour exceller dans le marketing numérique moderne.' },
  { title: 'Deep Work', genre: 'Productivité', pages: 280, language: 'Anglais', rating: 4.8, description: 'Rules for focused success in a distracted world.' },
  { title: 'Atomic Habits', genre: 'Productivité', pages: 320, language: 'Anglais', rating: 4.9, description: 'An easy and proven way to build good habits and break bad ones.' },
  { title: 'The Pragmatic Programmer', genre: 'Technologie', pages: 352, language: 'Anglais', rating: 4.8, description: 'Your journey to mastery, from journeyman to master developer.' },
]

const records = [
  ...videos.map((v, i) => ({
    objectID: `video-${i + 1}`,
    type: 'video',
    thumbnail: unsplashVideos[i % unsplashVideos.length],
    ...v,
  })),
  ...ebooks.map((e, i) => ({
    objectID: `ebook-${i + 1}`,
    type: 'ebook',
    thumbnail: unsplashEbooks[i % unsplashEbooks.length],
    ...e,
  })),
]

async function seed() {
  try {
    console.log(`⏳ Indexation de ${records.length} contenus dans Algolia...`)

    // Configure index settings
    await index.setSettings({
      searchableAttributes: ['title', 'description', 'genre', 'language'],
      attributesForFaceting: ['type', 'genre', 'language'],
      customRanking: ['desc(rating)'],
    })

    await index.saveObjects(records)
    console.log(`✅ ${records.length} contenus indexés avec succès !`)
    console.log('🎉 Ton index Algolia est prêt. Lance npm run dev pour voir la démo.')
  } catch (err) {
    console.error('❌ Erreur :', err.message)
    process.exit(1)
  }
}

seed()
