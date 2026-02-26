# MediaOnDemand 🎬📚

Plateforme de streaming vidéos & ebooks avec authentification Google, recherche Algolia et hébergement Vercel.

## Stack technique

| Rôle | Service | Coût |
|------|---------|------|
| Auth SSO | Supabase Auth + Google | Gratuit |
| Base de données | Supabase PostgreSQL | Gratuit |
| Recherche | Algolia | Gratuit (10k req/mois) |
| Hébergement | Vercel | Gratuit |
| Frontend | Next.js 14 (App Router) | — |

## Démarrage rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Variables d'environnement
Copie `.env.example` en `.env.local` et remplis tes clés :
```bash
cp .env.example .env.local
```

### 3. Configurer Supabase Auth (Google)
1. Supabase Dashboard → Authentication → Providers → Google → Enable
2. Ajoute tes Google OAuth credentials (voir ci-dessous)
3. Dans "Redirect URLs", ajoute : `http://localhost:3000/auth/callback`

#### Créer des credentials Google OAuth :
1. Va sur [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → Create Credentials → OAuth Client ID
3. Application type: Web application
4. Authorized redirect URIs: `https://frlsbuyunfsptqshoiqr.supabase.co/auth/v1/callback`
5. Copie Client ID et Client Secret dans Supabase

### 4. Peupler Algolia (données de démo)
```bash
npm run seed
```

### 5. Lancer en développement
```bash
npm run dev
```
→ Ouvre [http://localhost:3000](http://localhost:3000)

## Déployer sur Vercel

```bash
# 1. Push sur GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/mediaondemand.git
git push -u origin main

# 2. Connecte le repo sur vercel.com
# 3. Ajoute les variables d'environnement dans Vercel Dashboard
# 4. ✅ Déploiement automatique à chaque push !
```

### Variables d'environnement à ajouter sur Vercel :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ALGOLIA_APP_ID`
- `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY`
- `ALGOLIA_ADMIN_KEY` (pour le seed uniquement, peut être retiré après)

N'oublie pas d'ajouter ton URL Vercel dans Supabase → Authentication → Redirect URLs :
`https://ton-projet.vercel.app/auth/callback`

## Architecture

```
Utilisateur
    ↓
Vercel (Next.js 14)
    ↓
Supabase Auth (Google SSO / JWT)
    ↓
Page catalogue ← Algolia InstantSearch (recherche + filtres)
```

## Structure du projet

```
mediaondemand/
├── app/
│   ├── layout.js          # Layout global
│   ├── page.js            # Page principale (catalogue + recherche)
│   ├── globals.css        # Styles globaux + Algolia overrides
│   └── auth/callback/     # Callback OAuth Supabase
├── components/
│   ├── Navbar.js          # Barre de navigation + auth
│   └── ContentCard.js     # Carte contenu (vidéo/ebook)
├── lib/
│   ├── supabase.js        # Client Supabase
│   └── algolia.js         # Client Algolia
└── scripts/
    └── seed-algolia.js    # Données de démo (18 contenus)
```
