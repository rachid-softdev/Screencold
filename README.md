# ScreenCold

<p align="center">
  <img src="https://screencold.com/og-image.png" alt="ScreenCold" width="1200" height="630" />
</p>

<p align="center">
  <a href="https://screencold.com">
    <img src="https://img.shields.io/badge/Visit-Website-blue" alt="Website" />
  </a>
  <a href="https://github.com/screencold/screencold/actions">
    <img src="https://github.com/screencold/screencold/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://discord.gg/screencold">
    <img src="https://img.shields.io/badge/Join-Discord-7289DA" alt="Discord" />
  </a>
  <a href="https://twitter.com/screencold">
    <img src="https://img.shields.io/badge/Follow-Twitter-1DA1F2" alt="Twitter" />
  </a>
</p>

---

## Description

**ScreenCold** est une plateforme SaaS d'automatisation de la prospection B2B par intelligence artificielle. Elle permet d'auditer automatiquement des sites web et de générer des emails de prospection personnalisés.

### Fonctionnalités principales

- **Audit automatique de sites web** : Capture de screenshots (desktop/mobile) et analyse IA
- **Génération d'emails de prospection** : Emails personnalisés basés sur l'analyse du site
- **Gestion de campagnes** : Import CSV, suivi des prospects, automation
- **Dashboard analytique** : Stats d'utilisation, historique des audits, gestion des crédits

---

## Stack technique

| Catégorie | Technologie |
|-----------|-------------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | Next.js API Routes, Node.js |
| Base de données | PostgreSQL, Prisma ORM |
| Queue/Worker | BullMQ, Redis |
| IA | Anthropic Claude (Vision) |
| Auth | NextAuth.js (Google OAuth, Credentials) |
| Paiements | Stripe |
| Email | Resend |
| Cloud | AWS S3 (screenshots) |

---

## Prérequis

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

---

## Installation

### 1. Cloner le projet

```bash
git clone https://github.com/screencold/screencold.git
cd screencold
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Configuration des variables d'environnement

```bash
cp .env.example .env
```

Éditez `.env` avec vos valeurs :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/screencold"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Anthropic Claude
ANTHROPIC_API_KEY=""

# AWS S3
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="eu-west-1"
AWS_S3_BUCKET="screencold-screenshots"
AWS_S3_ENDPOINT=""

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# Email (Resend)
RESEND_API_KEY=""
FROM_EMAIL="noreply@screencold.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Initialiser la base de données

```bash
# Générer le client Prisma
pnpm db:generate

# Pousser le schéma
pnpm db:push
```

### 5. Lancer l'application

#### Mode développement (local)

```bash
# Lancer tous les services en mode développement
pnpm dev

# Ou avec Docker
pnpm docker:up
```

L'application sera disponible sur :
- **Web**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555

---

## Structure du projet

```
screencold/
├── apps/
│   ├── web/                 # Application Next.js
│   │   ├── app/             # App Router (pages, API routes)
│   │   ├── components/      # Composants React
│   │   ├── lib/             # Utilitaires, configurations
│   │   └── public/          # Fichiers statiques
│   └── worker/              # Worker BullMQ (audits, emails)
│       └── src/
│           ├── services/   # Services IA, email, screenshots
│           └── utils/      # Utilitaires
├── packages/
│   ├── db/                  # Schéma Prisma, client
│   └── types/               # Types TypeScript partagés
├── content/
│   └── blog/               # Articles du blog
├── scripts/                # Scripts utilitaires
└── docker-compose.yml       # Services Docker
```

---

## Scripts disponibles

```bash
# Développement
pnpm dev                    # Lancer le dev server
pnpm docker:up              # Lancer Docker
pnpm docker:logs            # Voir les logs Docker

# Base de données
pnpm db:generate            # Générer le client Prisma
pnpm db:push                # Pousser le schéma
pnpm db:migrate             # Créer une migration
pnpm db:studio              # Ouvrir Prisma Studio
pnpm db:seed                # Seed la base de données

# Build & Test
pnpm build                  # Build production
pnpm test                   # Lancer les tests
pnpm lint                   # Linter le code
pnpm typecheck              # Vérification TypeScript

# Qualité
pnpm format                 # Formatter le code (Prettier)

# Commandes préfixées (par application)
pnpm web:dev       # Lancer le serveur web
pnpm web:build     # Build de production
pnpm web:start     # Démarrer en production
pnpm web:test      # Lancer les tests
pnpm web:lint      # Linter le code
pnpm web:typecheck # Vérifier les types

pnpm desktop:dev
pnpm desktop:build
pnpm desktop:test

pnpm mobile:dev
pnpm mobile:build
pnpm mobile:test

pnpm extension:dev
pnpm extension:build
pnpm extension:test

# Environment
pnpm check-env     # Valider les variables d'environnement
pnpm push-env      # Pousser les variables vers Vercel
```

---

## Plans et tarifs

| Plan | Crédits/mois | Prix | Fonctionnalités |
|------|--------------|------|-----------------|
| **Gratuit** | 5 | 0€ | Audits basiques, email de prospection |
| **Starter** | 50 | 49€/mois | + CSV export, support email |
| **Pro** | 500 | 149€/mois | + API access, 5 utilisateurs |
| **Agency** | Illimités | 399€/mois | + Illimité, support dédié |

---

## API

Les endpoints API sont disponibles pour les plans Pro et Agency.

### Authentication

Utilisez une clé API dans l'en-tête `Authorization` :

```bash
curl -H "Authorization: Bearer sk_live_xxx" \
  https://api.screencold.com/v1/audits
```

### Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/v1/audits` | Liste des audits |
| `POST` | `/api/v1/audits` | Créer un audit |
| `GET` | `/api/v1/audits/:id` | Détail d'un audit |
| `GET` | `/api/v1/campaigns` | Liste des campagnes |
| `GET` | `/api/v1/credits` | Solde de crédits |

---

## Contribution

Les contributions sont les bienvenues ! Pour commencer :

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Commit vos changements (`git commit -m 'Add amazing feature'`)
4. Pushez la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

### Guidelines

- Utilisez les conventional commits
- Assurez-vous que les tests passent (`pnpm test`)
- Vérifiez le typecheck (`pnpm typecheck`)
- Formatez le code (`pnpm format`)

---

## License

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

---

## Support

- **Email**: support@screencold.com
- **Discord**: [Rejoindre notre serveur](https://discord.gg/screencold)
- **Twitter**: [@screencold](https://twitter.com/screencold)

---

<p align="center">Fait avec ❤️ en France</p>