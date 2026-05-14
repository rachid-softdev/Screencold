# SCREENCOLD — Master Prompt pour Claude Code

## Contexte produit

Tu vas construire **ScreenCold**, un SaaS B2B de cold outreach visuel.

Le principe : un utilisateur entre l'URL d'un prospect, le système capture automatiquement le site, détecte des problèmes UX/conversion, génère des annotations visuelles sur le screenshot, puis produit un email de prospection personnalisé prêt à envoyer.

La valeur : transformer un audit manuel de 20 minutes en 30 secondes, avec un résultat qui ressemble à un vrai audit humain premium.

---

## Stack technique imposée

- **Backend** : Node.js + TypeScript + Express
- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Capture** : Playwright (headless Chromium)
- **Vision AI** : Anthropic Claude claude-sonnet-4-20250514 avec vision (analyse screenshot)
- **Annotations** : Sharp (manipulation image) + Canvas API (overlay)
- **Base de données** : PostgreSQL + Prisma ORM
- **Auth** : NextAuth.js (email/password + Google OAuth)
- **File storage** : AWS S3 (ou compatible : Cloudflare R2)
- **Queue** : BullMQ + Redis (jobs de capture asynchrones)
- **Emails sortants** : Resend (pour les emails système) + intégration Gmail API (pour l'envoi des cold emails)
- **Paiement** : Stripe (abonnements + crédits)
- **Déploiement** : Docker Compose (dev) + structure prête pour Railway/Render

---

## Architecture du projet

```
screencold/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/         # login, register
│   │   │   ├── (dashboard)/    # app principale
│   │   │   │   ├── dashboard/  # vue d'ensemble
│   │   │   │   ├── campaigns/  # listes de prospects
│   │   │   │   ├── audits/     # résultats d'analyse
│   │   │   │   └── settings/   # compte, intégrations, billing
│   │   │   └── api/            # API routes Next.js
│   │   └── components/
│   └── worker/                 # Service BullMQ séparé
│       ├── jobs/
│       │   ├── capture.ts      # Playwright screenshot
│       │   ├── analyze.ts      # Claude Vision analyse
│       │   └── annotate.ts     # Sharp annotations
│       └── index.ts
├── packages/
│   ├── db/                     # Prisma schema + client partagé
│   └── types/                  # Types TypeScript partagés
├── docker-compose.yml
└── .env.example
```

---

## Schéma de base de données (Prisma)

Crée le schéma complet avec ces modèles :

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?   // hashé bcrypt
  plan          Plan      @default(FREE)
  credits       Int       @default(5)
  stripeCustomerId String?
  createdAt     DateTime  @default(now())
  campaigns     Campaign[]
  audits        Audit[]
}

model Campaign {
  id          String    @id @default(cuid())
  name        String
  userId      String
  user        User      @relation(...)
  prospects   Prospect[]
  createdAt   DateTime  @default(now())
}

model Prospect {
  id          String    @id @default(cuid())
  url         String
  companyName String?
  contactName String?
  contactEmail String?
  campaignId  String
  campaign    Campaign  @relation(...)
  audit       Audit?
  status      ProspectStatus @default(PENDING)
  createdAt   DateTime  @default(now())
}

model Audit {
  id              String    @id @default(cuid())
  prospectId      String    @unique
  prospect        Prospect  @relation(...)
  userId          String
  user            User      @relation(...)
  screenshotUrl   String    // S3 URL original
  annotatedUrl    String?   // S3 URL annoté
  mobileUrl       String?   // S3 URL mobile
  issues          Json      // Array of UXIssue
  emailSubject    String?
  emailBody       String?
  status          AuditStatus @default(PROCESSING)
  processingTime  Int?      // ms
  createdAt       DateTime  @default(now())
}

enum Plan { FREE, STARTER, PRO, AGENCY }
enum ProspectStatus { PENDING, PROCESSING, DONE, FAILED }
enum AuditStatus { PROCESSING, READY, FAILED }
```

---

## Feature 1 — Capture de screenshot

Fichier : `apps/worker/jobs/capture.ts`

Implémente avec Playwright :

```typescript
interface CaptureResult {
  desktopBuffer: Buffer      // 1440px width
  mobileBuffer: Buffer       // 390px width
  pageTitle: string
  pageDescription: string    // meta description
  loadTime: number           // ms
  hasSSL: boolean
}
```

- Viewport desktop : 1440×900
- Viewport mobile : 390×844 (iPhone 14)
- Attendre `networkidle` + 2s supplémentaires
- Capturer le above-the-fold uniquement (pas de scroll stitching en V1)
- Timeout : 30 secondes
- Gérer les erreurs : site down, timeout, blocage bot
- Retourner aussi les métadonnées de la page

---

## Feature 2 — Analyse UX par Claude Vision

Fichier : `apps/worker/jobs/analyze.ts`

Envoie le screenshot à Claude claude-sonnet-4-20250514 avec ce prompt système :

```
Tu es un expert CRO (Conversion Rate Optimization) et UX senior.
Tu analyses des screenshots de sites web pour des agences de design et de conversion.
Tu dois identifier des problèmes concrets, précis et actionnables.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication.
```

Prompt utilisateur :

```
Analyse ce screenshot de site web (desktop).
Le site appartient à : [companyName si disponible]
Type de site : [détecte automatiquement : landing page, e-commerce, SaaS, portfolio, etc.]

Identifie entre 3 et 5 problèmes UX/conversion prioritaires.

Réponds avec ce JSON exact :
{
  "siteType": "string",
  "overallScore": number (0-100, score de conversion estimé),
  "issues": [
    {
      "id": "string unique",
      "category": "CTA|SOCIAL_PROOF|HERO|FORM|MOBILE|SPEED|COPY|TRUST|NAVIGATION|SPACING",
      "severity": "HIGH|MEDIUM|LOW",
      "title": "string court (max 8 mots)",
      "description": "string précis et contextuel (max 40 mots)",
      "suggestion": "string actionnable (max 30 mots)",
      "zone": {
        "x": number (% de 0 à 100 depuis la gauche),
        "y": number (% de 0 à 100 depuis le haut),
        "width": number (% de largeur),
        "height": number (% de hauteur)
      }
    }
  ],
  "strengths": ["string", "string"] // 2 points positifs
}
```

Important : les `zone` doivent pointer précisément vers la zone problématique visible sur le screenshot.

---

## Feature 3 — Annotations visuelles

Fichier : `apps/worker/jobs/annotate.ts`

Utilise Sharp + une canvas library pour dessiner sur le screenshot :

Pour chaque issue, dessiner :
1. Un **rectangle coloré** autour de la zone (rouge pour HIGH, orange pour MEDIUM, bleu pour LOW) — stroke 3px, fill transparent 15%
2. Un **badge numéroté** en haut à gauche du rectangle (cercle coloré + numéro blanc)
3. Une **légende** en bas de l'image avec tous les numéros et leurs titres courts

Style visuel :
- Police : system-ui / sans-serif
- Badge : cercle 28px, fond coloré selon severity
- Légende : fond blanc semi-transparent, padding 16px, coins arrondis
- Watermark discret "ScreenCold" en bas à droite

Retourner le Buffer de l'image annotée.

---

## Feature 4 — Génération de l'email

Fichier : `apps/web/app/api/audits/[id]/email/route.ts`

Prompt Claude pour générer l'email :

```
Tu es un expert en cold outreach B2B.
Tu rédiges des emails de prospection courts, personnalisés et qui convertissent.
L'email doit sembler écrit manuellement par un humain, pas par un outil.
Ton : direct, professionnel mais humain, pas trop formel.
Longueur : 100-150 mots maximum.

Contexte :
- Expéditeur : [agencyType] (ex: agence CRO, studio design, freelance SEO)
- Destinataire : [contactName] de [companyName]
- URL analysée : [url]
- Problème principal détecté : [issues[0].title] — [issues[0].description]
- Score de conversion estimé : [overallScore]/100

Génère :
{
  "subject": "string (max 50 chars, pas de emoji, pas de majuscules excessives)",
  "body": "string (email complet avec sauts de ligne \\n)",
  "ps": "string optionnel (accroche supplémentaire)"
}

L'email doit :
- Mentionner le site spécifique (pas générique)
- Décrire LE problème précis observé (pas "votre site a des problèmes")
- Inclure une ligne pour coller l'image annotée : [IMAGE_PLACEHOLDER]
- Terminer par un CTA doux (pas "booker un appel", plutôt "3 idées à vous partager")
```

---

## Feature 5 — Interface utilisateur

### Page Dashboard (`/dashboard`)

- Compteur de crédits restants
- Stats : audits ce mois, taux de réponse moyen (si tracking activé)
- 3 derniers audits avec aperçu miniature
- Bouton "Nouvel audit rapide" (URL unique)
- Bouton "Nouvelle campagne" (CSV multiple)

### Page Audit rapide (`/audits/new`)

Formulaire simple :
- URL du prospect (required)
- Nom de l'entreprise (optional)
- Prénom du contact (optional)
- Email du contact (optional)
- Type d'agence/service de l'expéditeur (select : Design, CRO, SEO, Dev, Branding)
- Bouton "Analyser" → loading state avec étapes visibles

### Page Résultat d'audit (`/audits/[id]`)

Layout deux colonnes :
- **Gauche** : screenshot annoté (zoomable), toggle desktop/mobile
- **Droite** :
  - Score global (gauge visuelle)
  - Liste des issues avec icônes severity
  - Email généré (éditable, textarea)
  - Boutons : "Copier l'email", "Ouvrir dans Gmail", "Régénérer", "Télécharger l'image"

### Page Campagnes (`/campaigns`)

- Liste des campagnes avec progress bar (X/Y prospects traités)
- Création campagne : nom + upload CSV
- Vue d'une campagne : table des prospects avec statut, aperçu miniature, actions

---

## Feature 6 — Import CSV

Colonnes attendues (flexibles) :
```
url, company_name, contact_name, contact_email, notes
```

- Parser avec `papaparse`
- Validation des URLs
- Preview 5 premières lignes avant import
- Limite : 500 lignes par CSV en plan PRO, 50 en STARTER

---

## Feature 7 — Worker BullMQ

Fichier : `apps/worker/index.ts`

Queue `audit-processing` avec ces étapes séquentielles :
1. `capture` — Playwright screenshot
2. `upload-original` — Upload S3
3. `analyze` — Claude Vision
4. `annotate` — Sharp overlay
5. `upload-annotated` — Upload S3
6. `generate-email` — Claude text
7. `save-results` — Update DB

Chaque étape doit :
- Logger son début/fin avec durée
- Retry automatique x2 en cas d'échec
- Mettre à jour le statut dans la DB
- Émettre un event SSE au frontend (Server-Sent Events pour le live progress)

Concurrence : 3 jobs simultanés max.

---

## Feature 8 — Gestion des crédits

Logique :
- 1 audit = 1 crédit
- Déduire AVANT de lancer le job
- Rembourser si le job échoue à l'étape capture (site inaccessible)
- Plan FREE : 5 crédits offerts à l'inscription
- Plans payants : crédits rechargés chaque mois via webhook Stripe

Middleware Express :
```typescript
// Vérifier les crédits avant chaque audit
async function checkCredits(req, res, next) {
  const user = await getUser(req)
  if (user.credits <= 0) {
    return res.status(402).json({ error: 'NO_CREDITS' })
  }
  next()
}
```

---

## Feature 9 — Stripe Billing

Plans :
```typescript
const PLANS = {
  STARTER: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    credits: 50,
    price: 49,
  },
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    credits: 500,
    price: 149,
  },
  AGENCY: {
    priceId: process.env.STRIPE_AGENCY_PRICE_ID,
    credits: -1, // illimité
    price: 399,
  }
}
```

Webhook Stripe à gérer :
- `checkout.session.completed` → activer le plan + créditer
- `invoice.paid` → recharger les crédits mensuels
- `customer.subscription.deleted` → downgrade vers FREE

---

## Variables d'environnement

Crée un `.env.example` complet :

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/screencold

# Redis
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Anthropic
ANTHROPIC_API_KEY=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-west-3
AWS_BUCKET_NAME=screencold-assets

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_AGENCY_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend (emails système)
RESEND_API_KEY=
FROM_EMAIL=noreply@screencold.io
```

---

## Docker Compose (développement)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: screencold
      POSTGRES_PASSWORD: password
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  web:
    build: ./apps/web
    ports: ["3000:3000"]
    depends_on: [postgres, redis]
    env_file: .env

  worker:
    build: ./apps/worker
    depends_on: [postgres, redis]
    env_file: .env
    # Playwright needs extra deps
    environment:
      - PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

volumes:
  postgres_data:
```

---

## Ordre de développement recommandé

**Phase 1 — Foundation (jour 1-2)**
1. Setup monorepo + Docker Compose
2. Prisma schema + migrations
3. NextAuth auth (email + Google)
4. Layout dashboard de base

**Phase 2 — Core pipeline (jour 3-5)**
5. Worker BullMQ + Redis
6. Capture Playwright
7. Upload S3
8. Analyse Claude Vision
9. Annotations Sharp
10. Génération email

**Phase 3 — UI (jour 6-8)**
11. Page "Nouvel audit" + formulaire
12. Page résultat avec viewer annoté
13. Gestion des jobs en temps réel (SSE)
14. Page campagnes + import CSV

**Phase 4 — Business (jour 9-10)**
15. Gestion des crédits
16. Intégration Stripe
17. Page settings/billing
18. Page pricing publique

---

## Contraintes de qualité

- **TypeScript strict** partout (`"strict": true`)
- **Zod** pour valider toutes les entrées API
- **Error boundaries** React sur toutes les pages
- **Loading states** sur toutes les actions asynchrones
- **Rate limiting** : 10 requêtes/min par IP sur les routes API publiques
- **Sécurité** : jamais exposer les clés API côté client, valider ownership avant chaque lecture de données
- Logs structurés avec **pino**
- **Tests** : au minimum des tests d'intégration sur le pipeline worker (capture → analyze → annotate)

---

## Ce qu'il ne faut PAS faire

- Ne pas utiliser `any` en TypeScript
- Ne pas stocker les screenshots en base64 en DB (toujours S3)
- Ne pas bloquer le thread principal avec Playwright (toujours via worker)
- Ne pas hardcoder les clés dans le code
- Ne pas oublier de supprimer les fichiers temporaires après upload S3
- Ne pas faire confiance aux URLs utilisateur sans validation (SSRF protection : rejeter les IPs privées, localhost, etc.)

---

## Livrables attendus

À la fin, le projet doit permettre de :

1. S'inscrire et se connecter
2. Entrer une URL et lancer un audit en 1 clic
3. Voir le résultat annoté avec les issues listées
4. Copier ou modifier l'email généré
5. Importer un CSV de prospects et lancer des audits en batch
6. Gérer ses crédits et souscrire à un plan via Stripe

Le tout en moins de 60 secondes de bout en bout pour un audit simple.