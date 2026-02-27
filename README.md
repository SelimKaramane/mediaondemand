# MediaOnDemand 🎬📚

Plateforme de streaming vidéos & ebooks avec authentification Google; recherche Algolia et hébergement Vercel.

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

## CI/CD

- **GitHub Actions** : build automatique sur chaque push / pull request.
- **Vercel** : déploiement automatique dès qu’un commit est poussé sur `main`.
 - **Tests** : lint + smoke test + API test + E2E (Playwright).

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

## Observabilité & sauvegarde

### Logs
- Les routes API envoient des logs JSON structurés (niveau, événement, durée).
- Sur Vercel, ces logs sont centralisés automatiquement dans l’onglet **Logs**.

### Métriques
- `@vercel/analytics` est activé pour suivre les performances et l’usage (Web Vitals).

### Journalisation PostgreSQL
- Une table `conversion_events` stocke l’historique des conversions (ebook/vidéo).
- SQL à exécuter dans Supabase (SQL Editor) : `supabase/conversion_events.sql`
- RLS activé : chaque utilisateur voit uniquement ses événements.

### Sauvegarde
- **Algolia** : export via `npm run backup` → fichier JSON dans `backups/`.
- **Supabase** : sauvegardes gérées côté service (plan Supabase).

## Compromis coût / qualité

- **Plans gratuits** : rapides à mettre en place mais quotas limités (stockage, conversions, assets vidéo, requêtes).
- **Qualité de service** : pour plus de débit, de stockage et de performances, il faut passer aux plans payants.
- **Choix du projet** : on privilégie les services managés (moins de maintenance), au prix de limites sur les plans free.

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
