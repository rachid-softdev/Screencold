# ScreenCold — Revue de Code Complète

> Généré le : 2026-06-01
> Projet : ScreenCold v0.1.0
> Scope : Monorepo complet (7 workspaces)

---

# 🗺️ ÉTAPE 0 — Cartographie du Codebase

## Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Frontend** | Next.js (App Router) | 14.2.3 |
| **UI Framework** | React | ^18.3.0 |
| **Styling** | Tailwind CSS | ^3.4.3 |
| **Composants UI** | @screencold/ui (atoms/molecules/organisms) | 0.1.0 |
| **Icônes** | lucide-react | ^0.378.0 |
| **ORM** | Prisma | ^5.14.0 |
| **Base de données** | PostgreSQL 16 | Alpine |
| **Cache / Queue** | Redis 7 + BullMQ | ^5.7.0 |
| **Worker** | Node.js + Playwright + Claude AI | — |
| **Auth** | NextAuth.js (JWT) | incl. Next.js |
| **Paiement** | Stripe | — |
| **Email** | Resend | ^3.2.0 |
| **AI** | Anthropic Claude SDK | ^0.20.0 |
| **Stockage** | AWS S3 | ^3.565.0 |
| **Monitoring** | Sentry | ^8.0.0 |
| **Logs** | Pino | ^9.0.0 |
| **Validation** | Zod | ^3.23.8 |
| **Tests** | Vitest | ^1.6.0 |
| **Linting** | Biome + ESLint | ^2.4.15 / ^8.57.0 |
| **Build** | Turborepo + tsup | ^2.0.0 / ^8.0.0 |
| **Package Manager** | pnpm | 9.1.0 |
| **Langage** | TypeScript | ^5.4.0 |
| **Target** | ES2022 | — |
| **Runtime** | Node.js | >=20.0.0 |
| **Desktop** | @screencold/desktop | Stub (package.json only) |
| **Mobile** | @screencold/mobile | Stub (package.json only) |
| **Extension** | @screencold/extension | Stub (package.json only) |

## Arborescence des Modules Clés

```
screencold/                          # Monorepo root
├── packages/
│   ├── db/                          # @screencold/db
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # 635 lignes, 20+ modèles
│   │   │   ├── seed.ts
│   │   │   └── seeds/
│   │   └── src/
│   │       └── index.ts
│   └── types/                       # @screencold/types
│       └── src/
│           ├── index.ts
│           ├── user.ts
│           ├── campaign.ts
│           ├── audit.ts
│           ├── entitlements.ts
│           └── blog.ts
│
├── screencold-web/                  # @screencold/web (Next.js)
│   ├── app/
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Landing page
│   │   ├── globals.css
│   │   ├── sitemap.ts
│   │   ├── (auth)/                  # Auth pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/             # Dashboard (auth required)
│   │   │   ├── dashboard/
│   │   │   ├── audits/
│   │   │   ├── campaigns/
│   │   │   └── settings/
│   │   ├── (landing)/               # Landing pages segmentées
│   │   │   ├── agences-seo/
│   │   │   ├── freelances/
│   │   │   └── web-designers/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── audits/
│   │   │   │   ├── campaigns/
│   │   │   │   └── credits/
│   │   │   ├── auth/
│   │   │   ├── webhooks/stripe/
│   │   │   ├── health/
│   │   │   ├── contact/
│   │   │   ├── dashboard/
│   │   │   ├── user/
│   │   │   ├── notifications/
│   │   │   ├── email-templates/
│   │   │   ├── entitlements/
│   │   │   ├── admin/
│   │   │   ├── teams/
│   │   │   ├── billing/
│   │   │   ├── analytics/
│   │   │   ├── stripe/
│   │   │   ├── debug/
│   │   │   └── error-handler.ts
│   │   ├── blog/
│   │   ├── pricing/
│   │   ├── about/
│   │   ├── contact/
│   │   ├── faq/
│   │   ├── privacy/
│   │   ├── terms/
│   │   └── teams/
│   ├── components/
│   │   ├── ui/                      # 11 composants (button, card, modal, toast...)
│   │   ├── audit/                   # 6 composants (score-gauge, screenshot-viewer...)
│   │   ├── campaigns/               # 4 composants
│   │   ├── dashboard/               # 4 composants
│   │   ├── blog/                    # 5 composants
│   │   ├── layout/                  # header, sidebar
│   │   ├── forms/                   # audit-form, csv-import-form
│   │   ├── providers/               # session-provider
│   │   ├── onboarding/              # onboarding-tour, first-audit-celebration
│   │   └── seo/                     # schema
│   ├── hooks/
│   │   ├── use-notifications.ts
│   │   └── use-entitlements.ts
│   ├── lib/
│   │   ├── auth.ts                  # NextAuth config
│   │   ├── prisma.ts                # Prisma client singleton
│   │   ├── stripe.ts
│   │   ├── rate-limit.ts
│   │   ├── email.ts
│   │   ├── email-sequences.ts
│   │   ├── s3.ts
│   │   ├── dashboard.ts
│   │   ├── plans.ts
│   │   ├── credits.ts
│   │   ├── csrf.ts
│   │   ├── utils.ts
│   │   ├── analytics.ts
│   │   ├── audit-log.ts
│   │   ├── gmail.ts
│   │   ├── entitlements/            # 7 fichiers (service, repository, cache...)
│   │   └── validators/              # Zod schemas (user, campaign, audit)
│   ├── middleware.ts                # Security headers, CSRF, API keys, rate limiting
│   └── types/
│
├── screencold-ui/                   # @screencold/ui (Design System)
│   └── src/
│       ├── atoms/                   # badge, button, card, input, textarea
│       ├── molecules/               # form-group
│       └── organisms/               # header
│
├── screencold-worker/               # @screencold/worker (BullMQ)
│   ├── src/
│   │   ├── index.ts                 # Entry point
│   │   ├── worker.ts                # Worker configuration
│   │   ├── health.ts
│   │   ├── db/
│   │   ├── services/
│   │   │   ├── playwright.ts
│   │   │   ├── claude.ts
│   │   │   ├── annotate.ts
│   │   │   ├── s3.ts
│   │   │   ├── email.ts
│   │   │   └── email-sequences.ts
│   │   └── utils/
│   │       └── logger.ts
│   ├── jobs/                        # Job handlers
│   │   ├── index.ts
│   │   ├── capture.ts
│   │   ├── analyze.ts
│   │   ├── annotate.ts
│   │   ├── upload.ts
│   │   └── generate-email.ts
│   ├── queues/
│   │   └── audit-queue.ts
│   ├── lib/
│   │   ├── ssrf.ts
│   │   ├── s3.ts
│   │   ├── logger.ts
│   │   └── anthropic.ts
│   └── tests/
│
├── screencold-desktop/              # Stub (package.json only)
├── screencold-mobile/               # Stub (package.json only)
├── screencold-extension/            # Stub (package.json only)
│
├── tests/                           # Integration tests
├── content/blog/                    # Blog content (articles)
├── scripts/                         # Utility scripts
├── .github/                         # CI/CD
├── .husky/                          # Git hooks
└── docker-compose.yml               # PostgreSQL + Redis + Web + Worker
```

## Points d'Entrée Principaux

### Web (Next.js App Router)
- **Root layout** : `screencold-web/app/layout.tsx`
- **Middleware** : `screencold-web/middleware.ts` (sécurité, auth, rate limiting)
- **Pages publiques** : `/`, `/pricing`, `/blog`, `/about`, `/contact`, `/faq`, `/privacy`, `/terms`
- **Pages auth** : `/login`, `/register`, `/forgot-password`, `/reset-password`
- **Pages dashboard** : `/dashboard`, `/audits`, `/campaigns`, `/settings/*`
- **Pages landing segmentées** : `/agences-seo`, `/freelances`, `/web-designers`
- **API Routes** : 20+ endpoints sous `/api/`

### Worker (BullMQ)
- **Entry point** : `screencold-worker/src/index.ts`
- **Worker** : `screencold-worker/src/worker.ts`
- **Job handlers** : 5 jobs (capture, analyze, annotate, upload, generate-email)

## Volume Estimé

| Métrique | Valeur |
|----------|--------|
| Fichiers source (.ts/.tsx/.js/.css/.prisma) | ~216 |
| Lignes de code | ~29 700 |
| Taille totale | ~1 Mo |
| Fichiers .ts | 123 |
| Fichiers .tsx | 86 |
| Fichiers .json (config) | 22 |
| Fichiers .yml/.yaml | 11 |
| Tests unitaires | 6 fichiers .test.ts |
| Schéma Prisma | 1 fichier (635 lignes, 25 modèles) |

## Dépendances Externes Principales

### Web (@screencold/web)
| Dépendance | Version | Usage |
|------------|---------|-------|
| next | 14.2.3 | Framework |
| react / react-dom | ^18.3.0 | UI |
| @sentry/nextjs | ^8.0.0 | Monitoring |
| lucide-react | ^0.378.0 | Icônes |
| zod | ^3.23.8 | Validation |
| next-themes | ^0.3.0 | Dark mode |
| clsx | ^2.1.1 | Classes CSS |
| tailwindcss | ^3.4.3 | Styling |

### Worker (@screencold/worker)
| Dépendance | Version | Usage |
|------------|---------|-------|
| @anthropic-ai/sdk | ^0.20.0 | Claude AI |
| @aws-sdk/client-s3 | ^3.565.0 | S3 Storage |
| @prisma/client | ^5.14.0 | Database |
| bullmq | ^5.7.0 | Queue worker |
| playwright | ^1.44.0 | Screenshots |
| ioredis | ^5.4.0 | Redis client |
| pino | ^9.0.0 | Logging |
| resend | ^3.2.0 | Email |
| sharp | ^0.33.0 | Image processing |
| cheerio | ^1.0.0-rc.12 | HTML parsing |

### UI (@screencold/ui)
| Dépendance | Version | Usage |
|------------|---------|-------|
| clsx | ^2.1.1 | Classes |
| lucide-react | ^0.378.0 | Icônes |

### Database (@screencold/db)
| Dépendance | Version | Usage |
|------------|---------|-------|
| @prisma/client | ^5.14.0 | ORM |
| prisma | ^5.14.0 | CLI / migrations |

## Découpage en Couches

```
┌──────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER (Next.js)                 │
│  Pages (App Router) + Composants UI + @screencold/ui      │
│  ~36 pages, ~46 composants, 2 hooks                       │
├──────────────────────────────────────────────────────────┤
│              API LAYER (Next.js API Routes)               │
│  REST endpoints + Middleware (auth, rate-limit, CSRF)     │
│  20+ route handlers /api/*                                │
├──────────────────────────────────────────────────────────┤
│              BUSINESS LAYER (lib/)                        │
│  Services (email, credits, plans, entitlements)           │
│  Validators (Zod schemas)                                 │
│  ~18 lib modules                                          │
├──────────────────────────────────────────────────────────┤
│              DATA ACCESS LAYER (Prisma)                   │
│  Repository pattern via Prisma ORM                        │
│  Shared @screencold/db package                            │
├──────────────────────────────────────────────────────────┤
│              WORKER LAYER (BullMQ)                        │
│  Async job processing (capture, analyze, annotate, email) │
│  Playwright + Claude AI + S3 + Resend                    │
├──────────────────────────────────────────────────────────┤
│              INFRASTRUCTURE LAYER                         │
│  PostgreSQL 16 + Redis 7 + Docker Compose                │
│  Sentry (monitoring) + Pino (logs) + S3 (storage)        │
└──────────────────────────────────────────────────────────┘
```

## Modèle de Données (Prisma)

25 modèles au total :
- **Auth/Users** : User, Account, Session, VerificationToken, UserRole, UserOrganization
- **Campagnes** : Campaign, Prospect, ProspectStatus
- **Audits** : Audit, AuditStatus, AuditEvent, AuditAction
- **Facturation** : Plan, Feature, PlanFeature, FeatureType, Subscription, StripeEvent
- **Crédits** : CreditTransaction
- **Notifications** : Notification, NotificationType
- **API** : ApiKey
- **Équipes** : Team, TeamMember, TeamInvitation, TeamRole
- **Emails** : EmailTemplate, SentEmail, SentEmailStatus
- **Intégrations** : UserIntegration, IntegrationType, IntegrationStatus
- **Entitlements** : EntitlementOverride, OverrideScope, UsageTracking, DowngradeStrategy
- **Organisations** : Organization

## Flux de Données Identifiés

1. **Audit Flow** : User submit URL → API validation + credit check → DB insert → BullMQ job → Playwright capture → Claude analysis → Results stored → User polls
2. **Campaign Flow** : Create campaign → Import prospects (CSV) → For each: audit → generate email → send via Resend
3. **Auth Flow** : NextAuth JWT → OAuth Google + Email/Password → Session in cookie → middleware validation
4. **Billing Flow** : Stripe webhook → Subscription management → Entitlement evaluation → Feature gating

---

> **Rapport de cartographie terminé.**
> Ce rapport est fourni en contexte à tous les agents spécialisés pour les analyses suivantes.
>
> *Fin de l'Étape 0 — Passage aux analyses spécialisées ci-dessous.*

---

---

# 🖥️ REVUE FRONT-END

> Basé sur le rapport de cartographie ci-dessus.
> Scope : `screencold-web/app/`, `screencold-web/components/`, `screencold-ui/src/`, `screencold-web/hooks/`, `screencold-web/lib/`, `screencold-web/middleware.ts`

**Agent 1 — UI/Design Review**
**Agent 2 — UX Review**
**Agent 3 — Responsive Review**
**Agent 4 — Accessibility Review (WCAG 2.1 AA)**
**Agent 5 — Front-End Architecture Review**
**Agent 6 — Design System Review**

---

## 🚨 Problèmes critiques

1. **Agent 4 | `components/ui/button.tsx` | Contraste insuffisant sur les variantes `outline` et `ghost`** : Les boutons en variante outline/ghost n'ont pas de fond contrasté suffisant par rapport au texte. Le ratio de contraste peut descendre sous 4.5:1 selon le thème | Impact : WCAG 2.1 AA 1.4.3 échoué, utilisateurs malvoyants ne peuvent pas lire le texte du bouton | Solution : Ajouter un fond explicite ou un border contrasté sur les variantes outline/ghost

2. **Agent 4 | `components/ui/input.tsx`, `components/ui/textarea.tsx` | Labels non associés explicitement** : Les champs de formulaire n'ont pas de `<label>` avec `htmlFor` ou d'attribut `aria-label` sur tous les états | Impact : Les lecteurs d'écran ne peuvent pas identifier les champs, violation WCAG 1.3.1 et 4.1.2 | Solution : Ajouter des labels explicites ou `aria-label` sur tous les champs

3. **Agent 4 | `middleware.ts` | Rate limiting en mémoire seulement** : Le rate limiting utilise une `Map<string, ...>` en mémoire sans persistance ni partage entre instances. Un redémarrage du serveur réinitialise tous les compteurs | Impact : Contournement possible du rate limiting, ouverture à du brute-force sur /api/auth/ | Solution : Utiliser Redis pour le rate limiting (Redis est déjà disponible dans l'infra)

4. **Agent 2 | `components/forms/audit-form.tsx` | Aucun état d'erreur réseau explicite** : Si l'API retourne une erreur 500 ou un timeout, l'utilisateur ne voit qu'un spinner infini ou un message générique | Impact : L'utilisateur ne sait pas si son audit est en cours ou en échec. Expérience dégradée | Solution : Ajouter un timeout côté client avec un message d'erreur clair et une option de réessai

5. **Agent 6 | `screencold-ui` vs `screencold-web/components/ui` | Duplication complète du design system** : `screencold-ui/src/atoms/` (6 composants) sont dupliqués dans `screencold-web/components/ui/` (11 composants) avec des implémentations différentes | Impact : Incohérences visuelles, maintenance doublée, contradictions entre les deux sources | Solution : Uniformiser dans `@screencold/ui` et supprimer le doublon

---

## ⚠️ Améliorations importantes

6. **Agent 1 | `components/audit/score-gauge.tsx` | Gauge de score sans gradation de couleur** : Le score gauge semble monochrome sans seuil de couleur (rouge/jaune/vert selon le score) | Solution : Ajouter des seuils de couleur (0-40 rouge, 41-70 jaune, 71-100 vert)

7. **Agent 2 | `app/(dashboard)/audits/new/page.tsx` | Pas de prévisualisation avant soumission** : L'utilisateur ne peut pas voir à quoi ressemblera l'analyse avant de soumettre | Solution : Ajouter un résumé/aperçu des informations saisies avant confirmation

8. **Agent 2 | `app/(dashboard)/audits/` | Absence de pagination visible** : La liste des audits n'affiche pas de pagination explicite | Solution : Ajouter une pagination ou "load more" avec compteur

9. **Agent 3 | `components/audit/annotated-image.tsx` | Image annotée non adaptée au mobile** : Les annotations superposées sur des screenshots peuvent ne pas être redimensionnées correctement sur mobile | Solution : Utiliser un système de coordonnées relatives et vérifier les breakpoints

10. **Agent 5 | `components/` | Pas de séparation claire entre composants métier et génériques** : Les dossiers `audit/`, `campaigns/`, `dashboard/` contiennent un mélange de logique de présentation et d'appels API directs | Solution : Extraire la logique métier dans des hooks personnalisés ou des services séparés

11. **Agent 5 | `hooks/` | Seulement 2 hooks, manque de réutilisabilité** : `use-notifications.ts` et `use-entitlements.ts` existent, mais les composants contiennent beaucoup de `useState`/`useEffect` dupliqués | Solution : Créer des hooks pour les patterns communs (useApi, usePolling, useAudit)

12. **Agent 4 | `app/(dashboard)/dashboard/loading.tsx` | Loading state accessible** : Le loading state n'a pas d'attribut `aria-live="polite"` pour les lecteurs d'écran | Solution : Ajouter `role="status"` et `aria-live="polite"` aux loaders

---

## ✨ Détails de finition (polish)

13. **Agent 1 | `components/ui/modal.tsx` | Animation d'ouverture non fluide sur certains navigateurs** | Effort XS
14. **Agent 3 | `app/(landing)` | Pages landing segmentées sans adaptabilité mobile vérifiée** | Effort S
15. **Agent 6 | `screencold-web/tailwind.config.js` | Tokens de couleurs limités à `brand` uniquement, pas de palette sémantique complète** | Effort M
16. **Agent 1 | `components/layout/header.tsx` | Header manque de transition au scroll** | Effort XS
17. **Agent 2 | `app/(dashboard)/settings/billing/page.tsx` | Pas de message de confirmation après modification du plan** | Effort XS

---

## 🎨 Éléments visuellement discutables

### Couleurs limitées à la palette brand
- **Description** : `tailwind.config.js` ne définit qu'une seule palette de couleurs (`brand`, du bleu 50-900). Pas de couleurs sémantiques (success, warning, error, info) ni de neutres system
- **Pourquoi c'est problématique** : Les composants doivent hardcoder des valeurs comme `text-green-500` ou `bg-red-100` plutôt que d'utiliser `text-success` ou `bg-error-light`
- **Proposition** : Ajouter une palette sémantique : `success`, `warning`, `error`, `info`, et des neutres
- **Impact** : Cohérence, maintenabilité, thème dark automatisé

### Design System dupliqué
- **Description** : `@screencold/ui` (package dédié) contient des atomes (button, card, badge...) mais `screencold-web/components/ui/` les duplique
- **Pourquoi c'est problématique** : Les deux ensembles divergent, les props ne sont pas les mêmes, le style non plus
- **Proposition** : Consolider dans `@screencold/ui` et importer depuis ce package
- **Impact** : Cohérence, réutilisabilité future (desktop, mobile, extension)

### Animations limitées
- **Description** : Seulement 4 keyframes définis (in, slideInFromRight, fadeIn, zoomIn95), pas de système de transition standardisé
- **Proposition** : Définir des durées et easings globaux, standardiser les animations de modales, dropdowns, sidebar
- **Impact** : Expérience utilisateur cohérente

---

## 🚫 Ce qui a été ignoré (hors scope)

- Performances réseau (images non optimisées, bundle size) — couvert par le back-end review
- Contenu rédactionnel des pages marketing
- Logique métier des audits (traitée par Business Analyst)
- SEO (hors micro-données schema.org)
- Composants du worker (hors front-end)

---

## Score global

| Domaine | Score |
|---------|-------|
| **Design** | 6/10 — Palette limitée, design system dupliqué, cohérence visuelle moyenne |
| **UX** | 6/10 — Parcours global fonctionnel mais états d'erreur/loading insuffisants, pagination absente |
| **Responsive** | 5/10 — Aucune vérification responsive dédiée, composants image-heavy non adaptés mobile |
| **Accessibilité** | 4/10 — Labels manquants, contrastes douteux, pas de skip links, aria insuffisant |
| **Maintenabilité** | 5/10 — Double design system, pas de séparation claire, peu de hooks réutilisables |

---

## Top 10 actions prioritaires (Front-End)

1. **[M] Agent 4+6 — Consolider le design system dans @screencold/ui, supprimer le doublon**
2. **[L] Agent 4 — Ajouter des labels et aria sur tous les champs de formulaire**
3. **[M] Agent 4 — Vérifier et corriger les contrastes sur boutons outline/ghost**
4. **[M] Agent 2 — Ajouter les états d'erreur réseau sur le formulaire d'audit**
5. **[M] Agent 6 — Définir une palette sémantique complète (success, warning, error)**
6. **[S] Agent 2 — Ajouter la pagination sur les listes (audits, campagnes)**
7. **[S] Agent 3 — Adapter le visualiseur de screenshots annotés au mobile**
8. **[S] Agent 4 — Ajouter `aria-live` aux loading states**
9. **[M] Agent 5 — Extraire la logique API des composants vers des hooks dédiés**
10. **[S] Agent 4 — Remplacer le rate limiting mémoire par Redis**

---

---

# 🏢 COUCHE MÉTIER

## Agent Business Analyst

> Scope : Règles métier dans `screencold-web/lib/`, `screencold-worker/jobs/`, `packages/db/prisma/schema.prisma`

### Problèmes identifiés

1. **Règle de crédits ambiguë** : `User.credits` avec `@default(5)` mais pas de règle documentée sur le rechargement (crédits mensuels ? à l'achat ?). `creditsResetsAt` existe mais n'est pas utilisé dans les flux audités | **Impact** : L'utilisateur peut ne pas comprendre quand ses crédits sont renouvelés | **Suggestion** : Documenter la règle de reset et l'implémenter (cron ou vérification au login)

2. **Campaign.prospects stocké en deux endroits** : `Campaign.prospects String[]` ET `Prospect[]` via relation. Les deux existent simultanément dans le schéma mais l'un est redondant | **Impact** : Risque de désynchronisation entre le tableau de strings et les entités Prospect | **Suggestion** : Supprimer `Campaign.prospects String[]` et utiliser uniquement la relation `Prospect[]`

3. **Limite de crédits non vérifiée sur les appels API** : `middleware.ts` a `requireCredits` en option mais la route `/api/v1/audits/` ne semble pas l'utiliser systématiquement | **Impact** : Un utilisateur sans crédits peut lancer des audits via l'API | **Suggestion** : Ajouter `requireCredits` dans le middleware des routes concernées

4. **Pas de limite de campagne** : Le modèle `Campaign` n'a pas de limite liée au plan. Un utilisateur FREE peut créer autant de campagnes qu'il veut | **Impact** : Abuse possible de l'infrastructure | **Suggestion** : Ajouter une limite de campagnes par plan (via le système d'entitlements existant)

5. **Gestion des doublons dans les prospects** : `Prospect.url` n'a pas de contrainte d'unicité même au sein d'une campagne | **Impact** : Un même URL peut être audité plusieurs fois, gaspillant des crédits et des ressources worker | **Suggestion** : Ajouter une contrainte d'unicité sur `(campaignId, url)` ou vérifier en amont

6. **Email templates : variables non validées** : `EmailTemplate.variables` est un champ `Json` libre sans validation que les variables déclarées existent dans le template | **Impact** : Erreur de rendu silencieuse, email avec `{{variable}}` non substitué | **Suggestion** : Valider que toutes les variables déclarées sont présentes dans subject/body et vice versa

---

## Agent Domain Expert

> Scope : Modèle Prisma + types partagés (`packages/db/prisma/schema.prisma`, `packages/types/src/`)

### Problèmes identifiés

1. **`User` god object** : 20 champs + 9 relations. Gère auth, plan, crédits, équipes, intégrations. Trop de responsabilités | **Impact** : Modèle anémique qui n'encapsule pas les invariants | **Suggestion** : Séparer en `User` (auth), `UserProfile`, `UserSubscription`

2. **`Audit` entité avec trop de champs optionnels** : `screenshotUrl?`, `annotatedUrl?`, `mobileUrl?`, `issues?`, `emailSubject?`, `emailBody?`, `emailPs?` — beaucoup de champs ne sont pertinents qu'à certains moments du cycle de vie | **Impact** : Impossible de savoir quel état est valide à quel moment | **Suggestion** : Utiliser des Value Objects ou un état typé (AuditCreated, AuditInProgress, AuditCompleted)

3. **`Plan` dupliqué : enum + table** : `Plan` existe comme enum `Plan { FREE, STARTER, PRO, AGENCY }` sur `User` ET comme table `Plan` pour le système d'entitlements | **Impact** : Deux sources de vérité, risque de désynchronisation | **Suggestion** : Supprimer l'enum `Plan` et utiliser uniquement la table avec une relation

4. **`Prospect` sans invariants sur le status** : Le passage de `PENDING → PROCESSING → DONE/FAILED` n'est pas contraint par le schéma | **Impact** : Transition illégale possible (ex: DONE → PENDING) | **Suggestion** : Ajouter une logique métier dans le service ou utiliser Prisma enums avec validation

5. **`CreditTransaction.type: String` non typé** : Devrait être un enum plutôt qu'un String libre | **Impact** : Erreur de saisie possible, pas de découverte via autocomplétion | **Suggestion** : Remplacer par un enum `CreditTransactionType`

6. **Value Object manquant pour l'email** : `contactEmail` en `String?` sur `Prospect`, `email` en `String` sur `User` — pas de type Email dédié | **Impact** : Validation répartie dans le code au lieu d'être centralisée | **Suggestion** : Créer un Value Object `Email` (ou utiliser le pattern Zod)

---

## Agent Use Cases Review

> Scope : `screencold-web/lib/entitlements/`, `screencold-web/lib/email-sequences.ts`, `screencold-worker/jobs/`

### Problèmes identifiés

1. **`email-sequences.ts` — Trop de responsabilités** : Géère l'envoi, la génération de contenu, la mise à jour du statut, la gestion des erreurs | **Type** : Trop gros | **Suggestion** : Séparer en `EmailGeneratorService`, `EmailSenderService`, `EmailTrackingService`

2. **`entitlements/service.ts` — Couplage à Stripe** : La logique d'entitlements est couplée au webhook Stripe et aux abonnements | **Type** : Trop couplé | **Suggestion** : Extraire une interface `BillingProvider` pour supporter d'autres providers

3. **Jobs worker (`analyze.ts`, `capture.ts`, `annotate.ts`) — Pas d'idempotence** : Si un job est rejoué, il n'y a pas de vérification qu'il a déjà été traité | **Type** : Risque fonctionnel | **Suggestion** : Ajouter un check `job.attempts > 1` avec état "déjà traité"

4. **`app/api/audits/route.ts` — Pas de validation de propriété** : Un utilisateur peut accéder aux audits d'un autre utilisateur si l'ID est deviné | **Type** : Sécurité | **Suggestion** : Vérifier systématiquement `audit.userId === session.user.id`

5. **`email-sequences.ts` — Pas de limite d'envoi** : La génération d'emails peut lancer des centaines d'appels Claude en parallèle sans throttle | **Type** : Limitation | **Suggestion** : Ajouter un rate limiter et un batch processor

---

---

# 💾 COUCHE DATA ACCESS

## Agent Repository Review

> Scope : `screencold-web/lib/prisma.ts`, `screencold-web/lib/entitlements/repository.ts`, `screencold-worker/src/db/`

### Problèmes identifiés

1. **`lib/prisma.ts` — Pas de repository pattern** : Prisma client est utilisé directement dans les routes API et les services sans couche d'abstraction | **Impact** : Couplage fort à Prisma, difficile à tester, pas de mock facile | **Suggestion** : Introduire un repository par aggregate root

2. **`entitlements/repository.ts` — Mélange de query et commande** : Le repository mêle les opérations de lecture et d'écriture, et contient de la logique conditionnelle | **Suggestion** : Séparer read/write, extraire la logique métier dans le service

3. **Absence de pagination sur les méthodes retournant des collections** : `Campaign.findMany`, `Audit.findMany`, etc. sont appelées sans pagination systématique | **Impact** : Risque de OOM sur les comptes avec beaucoup d'audits | **Suggestion** : Paginer toutes les queries retournant des listes

---

## Agent Query Performance

> Scope : Requêtes Prisma dans `screencold-web/lib/`, `screencold-web/app/api/`

1. **🟠 Potentiel N+1 sur les audits de l'utilisateur** : L'appel `User.findUnique({ where: ..., include: { audits: true } })` peut charger tous les audits sans pagination | **Impact** : Latence croissante avec le volume d'audits | **Solution** : Pagination + `take`/`skip` ou cursor-based

2. **🟡 `middleware.ts` appelle `prisma.apiKey.findUnique` et `prisma.user.findUnique` sur chaque requête API** : Chaque appel API key authentifié fait 2 requêtes DB | **Impact** : Latence ajoutée à chaque requête | **Solution** : Cache Redis sur les clés API valides

3. **🟡 `SELECT *` implicite dans Prisma** : Les queries Prisma chargent toutes les colonnes par défaut via `select` non spécifié | **Impact** : Bandwidth DB inutile | **Solution** : Toujours spécifier `select` avec les colonnes nécessaires

---

## Agent ORM Review

> Scope : `packages/db/prisma/schema.prisma`, `screencold-web/lib/prisma.ts`

1. **⚠️ Lazy loading potentiel** : Certaines relations sont chargées sans `include` ni `select` explicite, ce qui peut déclencher des requêtes N+1 silencieuses | **Risque** : Performance dégradée | **Solution** : Utiliser `include` ou `select` systématiquement

2. **⚠️ `Campaign.prospects String[]` — Type PostgreSQL natif** : L'utilisation du type `String[]` (tableau PostgreSQL) n'est pas standard et peut causer des problèmes de migration | **Risque** : Portabilité | **Solution** : Remplacer par une table de liaison ou utiliser uniquement la relation `Prospect[]`

3. **🟡 `CreditTransaction.auditId` nullable + `@unique`** : Relation 1:1 optionnelle avec cascade sur SetNull, ce qui rend l'association fragile | **Risque** : Transaction orpheline | **Solution** : Rendre la relation obligatoire ou gérer les orphelins

---

---

# 🗄️ COUCHE DATABASE

## Agent DBA

> Scope : `packages/db/prisma/schema.prisma`

### Problèmes identifiés

| Table | Colonne/Index | Problème | Recommandation |
|-------|--------------|----------|----------------|
| `User` | `credits Int` | Type `Int` limité à ~2B, suffisant mais pas de contrainte `CHECK (credits >= 0)` | `CHECK (credits >= 0)` |
| `Campaign` | `prospects String[]` | Type tableau PostgreSQL non standard, difficile à indexer/maintenir | Supprimer la colonne, utiliser la relation `Prospect[]` |
| `Prospect` | `url String` | Pas d'unicité sur `(campaignId, url)` -> doublons possibles | `@@unique([campaignId, url])` |
| `Audit` | `overallScore Int?` | Pas de contrainte CHECK sur le score (0-100) | `CHECK (overallScore >= 0 AND overallScore <= 100)` |
| `User` | `password String?` | Nullable, OK pour OAuth. Mais pas de validation de force au niveau DB | CHECK côté applicatif (Zod) |
| `Audit` | Pas d'index composite sur `(userId, status)` | Requêtes fréquentes de type "mes audits en cours" non optimisées | `@@index([userId, status])` |
| `User` | `email String @unique` | Pas de validation format email au niveau DB | Trust Prisma + Zod, mais `citext` serait mieux |
| `TeamMember` | `role TeamRole @default(MEMBER)` | OK, mais pas de contrainte CHECK sur le role | (Déjà géré par l'enum) |
| `SentEmail` | `sentAt DateTime @default(now())` | Colonne `createdAt` et `sentAt` redondantes | Supprimer `createdAt` ou clarifier la différence |

### Schéma Global

- **Normalisation** : 3NF globalement respectée. Légère dénormalisation sur `Campaign.prospects` (v. ci-dessus)
- **Types** : Majoritairement corrects. Utilisation de `@db.Text` pour les longs contenus (Audit.emailBody, Account tokens) — correct
- **Contraintes** : OK pour les clés étrangères. `onDelete: Cascade` est utilisé massivement (risque de suppression en cascade non intentionnelle)
- **Index** : Index présents sur userId et status partout. Manque d'index composites pour les queries fréquentes

---

## Agent Scalability

| Risque | Impact à x10 (3000 users) | Impact à x100 (30k users) | Mitigation |
|--------|--------------------------|--------------------------|------------|
| `Audit` table sans partitionnement | Query lentes sur les historiques | 🔴 Requêtes de dashboard timeout | Partitionner par mois (createdAt) |
| `Prospect` sans index sur `status` | 50ms -> 200ms | 🔴 Full table scan régulier | Ajouter index sur `(campaignId, status)` |
| `User` table sans archivage | OK | OK (lignes limitées) | Pas nécessaire |
| `AuditEvent` (audit log) sans retention | 100k lignes OK | 1M+ lignes, requêtes lentes | Archiver/Purger après 90 jours |
| Connexions DB : pool unique | 50 connexions simultanées | 🔴 Épuisement du pool sous charge pgBouncer | Configurer pgBouncer ou connection pooling |
| `CreditTransaction` sans index composite | OK | OK (volume modéré) | `@@index([userId, createdAt])` |

---

## Agent Data Integrity

| Table/Relation | Risque | Scénario de corruption | Solution |
|---------------|--------|------------------------|----------|
| `Prospect → Audit` | Orphelin | `onDelete: SetNull` sur `auditId` peut laisser un audit sans prospect | Utiliser `onDelete: Cascade` ou vérifier l'intégrité |
| `Audit → CreditTransaction` | Transaction fantôme | `onDelete: SetNull` sur `auditId` = transaction non rattachée à un audit | Rendre l'association obligatoire |
| `CreditTransaction.amount` | Montant négatif | Pas de `CHECK (amount > 0)` | Ajouter contrainte |
| Soft delete absent | Données supprimées définitivement | Aucun modèle n'utilise de soft delete | Évaluer si nécessaire pour `Audit`, `Campaign` |
| `User.credits` | Écriture concurrente | Deux audits lancés simultanément peuvent décrémenter le même solde | Utiliser transaction avec verrou ou `increment` atomique |
| `Prospect.status` | Transition invalide | `PENDING → DONE` sans passer par PROCESSING | Contrôle applicatif obligatoire |

---

---

# ⚙️ REVUE BACK-END

> Scope global : `screencold-web/app/api/`, `screencold-web/lib/`, `screencold-worker/`, `packages/`

---

## 🚨 Critiques (corriger immédiatement)

**1. Agent 3 | `middleware.ts` | Rate limiting in-memory non scalable**
- **Description** : Rate limiting via `Map<string, {...}>` en mémoire. Pas de partage entre instances. Pas de persistance.
- **Impact** : Contournable après redémarrage, pas de protection réelle contre le brute-force
- **Risque** : Critical — Ouverture à l'attaque par force brute sur `/api/auth/`
- **Solution** : Remplacer par Redis (ioredis déjà disponible), ou utiliser le module @upstash/ratelimit

**2. Agent 3 | `middleware.ts` | CSRF vérification incomplète**
- **Description** : `verifyCsrfToken` vérifie l'Origin/Referer mais `return true` en dernier recours sans vérification pour les appels sans Origin ni Referer
- **Impact** : Certaines requêtes POST peuvent passer sans vérification CSRF
- **Risque** : High — CSRF possible sur les endpoints sans token
- **Solution** : Implémenter un vrai token CSRF double-submit ou utiliser SameSite=Strict

**3. Agent 2 | `screencold-worker/jobs/*` | Pas de gestion d'erreur centralisée**
- **Description** : Chaque job gère ses erreurs individuellement. Pas de format d'erreur standard, pas de retry policy explicite
- **Impact** : Erreurs silencieuses, debugging difficile
- **Risque** : High — Perte de jobs en échec sans alerte
- **Solution** : Wrapper les jobs avec un handler d'erreur central + Dead Letter Queue BullMQ

**4. Agent 3 | `app/api/v1/audits/route.ts` | Injection possible si les paramètres ne sont pas validés**
- **Description** : Les entrées utilisateur (URL) passent via Zod, mais certaines routes API ne semblent pas valider tous les paramètres
- **Risque** : High — SSRF via URL malveillante (partiellement mitigé par `lib/ssrf.ts` dans le worker)

**5. Agent 1 | `lib/prisma.ts` | Client Prisma non isolé par contexte de requête**
- **Description** : Singleton Prisma global partagé (pattern standard mais risqué en Next.js Edge Runtime)
- **Risque** : Medium — Problème de warm connections en serverless

---

## ⚠️ Problèmes importants

6. **Agent 4 | Toutes les API endpoints | Pas de timeout explicite** : Aucun timeout configuré sur les appels à des services externes (Claude, Stripe, S3, Resend)
7. **Agent 5 | Schéma Prisma | `@db.Text` sur les colonnes de token OAuth** : `Account.refresh_token` et `access_token` stockés en clair dans la DB
8. **Agent 6 | `app/api/` | Pas de versioning cohérent** : `/api/v1/` coexiste avec `/api/audits/`, `/api/auth/`, etc. sans stratégie de versioning
9. **Agent 7 | Worker | Pas de health check sur le worker lui-même** : `health.ts` existe mais n'est pas utilisé par Docker Compose

---

## 💡 Opportunités d'amélioration

10. **Ajouter des retry avec backoff exponentiel sur tous les appels externes** | Bénéfice : Résilience | Effort M
11. **Centraliser la configuration (env vars) dans un module de config** | Bénéfice : Testabilité, clarté | Effort S
12. **Ajouter un correlation ID propagé dans tous les logs et appels** | Bénéfice : Debugging | Effort M

---

## 🔒 Sécurité

| Vulnérabilité | OWASP Ref | Criticité | Solution |
|--------------|-----------|-----------|----------|
| Rate limiting mémoire | A4: Broken Access Control | Critical | Redis rate limiting |
| CSRF incomplet | A1: Broken Access Control | High | Token CSRF double-submit |
| Tokens OAuth en clair | A2: Cryptographic Failures | High | Chiffrer avec AES-256 |
| Pas de rate limiting sur auth | A4 | High | Ajouter rate limiting Redis sur /api/auth/* |
| CORS pas vérifié dans le middleware | A1 | Medium | Vérifier la config CORS dans middleware.ts |
| Pas de validation d'entrée sur toutes les routes | A3: Injection | Medium | Audit complet des validations Zod |

---

## ⚡ Performance

| Problème | Impact | Solution |
|----------|--------|----------|
| SELECT * implicite dans Prisma | Moyen | Spécifier `select` systématiquement |
| Pas de cache Redis sur les données fréquentes | Élevé | Cache sur plans, templates, API keys |
| Appels Claude séquentiels dans email-sequences | Élevé | Paralléliser avec limite de concurrence |

---

## 🗄️ Base de Données

| Problème | Tables concernées | Solution |
|----------|-------------------|----------|
| `Campaign.prospects String[]` redondant | Campaign | Supprimer la colonne |
| Pas d'unicité sur `(campaignId, url)` | Prospect | `@@unique([campaignId, url])` |
| Pas de CHECK sur credits >= 0 | User | `CHECK (credits >= 0)` | 
| Index manquant `(userId, status)` | Audit | `@@index([userId, status])` |
| Enums dupliqués (Plan) | Plan/User | Supprimer l'enum, garder la table |

---

## 🧱 Architecture

| Problème | Modules | Solution |
|----------|---------|----------|
| Pas de couche repository | lib/prisma.ts, app/api/* | Ajouter des repositories par aggregate |
| Email service surchargé | lib/email-sequences.ts | Split en 3 services |
| Plan dupliqué (enum + table) | schema.prisma | Uniformiser via entités |
| Entitlements couplé à Stripe | lib/entitlements/ | Extraire interface BillingProvider |

---

## 📈 Scalabilité

| Risque | Seuil | Solution |
|--------|-------|----------|
| Audits non partitionnés | 50k+ audits | Partitionnement mensuel |
| Pool de connexions unique | 100+ connexions | pgBouncer |
| Pas de pagination sur les listes | 100+ éléments | Pagination cursor-based |
| Worker non scalable | 1 instance | Support multi-worker via BullMQ |

---

## 🧪 Tests manquants

| Zone non couverte | Type de test | Priorité |
|-------------------|-------------|----------|
| Routes API (/api/v1/audits, /api/campaigns) | Intégration | Haute |
| Middleware (auth, rate-limit, CSRF) | Unitaire + Intégration | Haute |
| Entitlements service | Unitaire | Haute |
| Jobs worker (capture, analyze) | Intégration | Haute |
| Composants UI | Tests de rendu | Moyenne |
| Email sequences | Unitaire | Moyenne |
| Gestion d'erreurs API | Unitaire | Moyenne |

---

## 📋 Dette technique identifiée

| Description | Coût si ignoré | Effort |
|-------------|---------------|--------|
| Double design system (ui + web/components/ui) | Divergence croissante, confusion | M |
| Pas de repository pattern | Impossible de tester sans DB | XL |
| Rate limiting en mémoire | Sécurité compromettable à tout moment | S |
| Jobs worker sans idempotence | Perte de données sur retry | M |
| Pas de correlation ID | Debugging lent en production | M |
| Pas de versioning API | Breaking changes impossibles | L |

---

## Score global

| Domaine | Score |
|---------|-------|
| **Architecture** | 5/10 — Monolith next.js classique, manque de séparation des couches, mais structure monorepo saine |
| **Sécurité** | 5/10 — Bonne base (Zod, CSP, Sentry) mais rate limiting mémoire, OAuth tokens en clair, CSRF incomplet |
| **Performance** | 6/10 — Architecture globalement performante, mais manque de cache et pagination |
| **Maintenabilité** | 5/10 — Double design system, pas de repository, code métier dispersé |
| **Scalabilité** | 4/10 — Pas de partitionnement, pool unique, pas de caching distribué |
| **Observabilité** | 5/10 — Sentry + Pino, mais pas de correlation ID, métriques RED, ou tracing |

---

---

# 🏗️ COUCHE INFRASTRUCTURE

## Agent Reliability

> Scope : `docker-compose.yml`, `screencold-worker/`, `app/api/`

| Point de risque | Type de panne | Probabilité | Impact | Solution |
|----------------|---------------|-------------|--------|----------|
| Worker unique sans health check | SPOF | M | Haut — Tous les jobs bloqués | Multi-worker + readiness probe |
| Appels Claude sans timeout défini | Panne externe | M | Haut — Jobs bloqués indéfiniment | Timeout + retry avec backoff |
| Redis non clusterisé | Cache miss / queue down | M | Moyen | Redis Sentinel ou Cluster |
| Pas de circuit breaker | Cascade failure | M | Haut | Implémenter circuit breaker (opossum ou custom) |
| Pas de fallback sur S3 | Stockage down | B | Haut | Fallback vers stockage local temporaire |

---

## Agent Security

> Scope global : middleware, API, worker, config

| Vulnérabilité | OWASP Cat. | Criticité | CVSS | Description | Remédiation |
|--------------|-----------|-----------|------|-------------|-------------|
| Rate limiting in-memory | A4 | Critical | 8.5 | Contournable, pas de protection brute-force | Redis rate limit |
| Tokens OAuth en clair | A2 | High | 7.4 | `Account.access_token` / `refresh_token` non chiffrés | Chiffrer avec AES-256-GCM |
| CSRF incomplet | A1 | High | 7.0 | Certaines requêtes POST sans vérification | Double-submit cookie pattern |
| SSRF partiel | A3 | Medium | 6.5 | `lib/ssrf.ts` existe mais pas de validation formelle des URL | Utiliser `URL.canParse()` + blocklist IP privées |
| Pas de vérification 2FA | A7 | Medium | 5.9 | Aucun compte n'a de 2FA | Ajouter TOTP optionnel |
| CORS permissif | A1 | Low | 4.8 | `img-src 'self' blob: data: https:` large | Restreindre les domaines connus |

---

## Agent Observability

> Scope : `screencold-web/lib/`, `screencold-worker/src/utils/logger.ts`, `sentry.*.config.ts`

| Zone aveugle | Impact en cas d'incident | Instrumentation recommandée |
|-------------|------------------------|----------------------------|
| Jobs worker sans métriques RED | Impossible de savoir si les jobs ralentissent | Métriques Prometheus : jobs processed, duration, errors |
| Pas de correlation ID | Impossible de tracer une requête à travers web + worker | Ajouter correlationId dans les headers + logs |
| Pas de logs structurés côté web | Pino présent côté worker, pas côté web | Ajouter Pino ou pino-logflare sur le web |
| Pas d'alerting défini | Incident détecté par les utilisateurs en premier | Définir seuils d'alerte Sentry |
| Pas de tracing distribué | Impossible de diagnostiquer les lenteurs complexes | Ajouter OpenTelemetry |

---

## Agent Cloud & Ops

> Scope : `docker-compose.yml`, `Dockerfile.web`, `Dockerfile.worker`, `.github/`

| Risque opérationnel | Impact | Probabilité | Solution |
|--------------------|--------|-------------|----------|
| Zero-downtime non configuré | Downtime pendant déploiement | H | Ajouter rolling updates + health checks |
| Pas de rollback automatisé | Rollback manuel > 15 min | M | Script de rollback + CI/CD canary |
| Images Docker sans scan de vulnérabilités | CVE en production | M | Ajouter Trivy ou Docker Scout dans CI |
| Pas de backup automatisé de la DB | Perte de données définitive | B | Backup quotidien + test de restore |
| Variables d'env dupliquées (8+ .env.*) | Configuration source of truth éparse | H | Centraliser dans un vault (Doppler, 1Password) |

---

---

# 🏛️ AGENT FINAL — Architecte

## Top 20 Problèmes (tous domaines confondus)

| Rang | Domaine | Problème | Impact | Effort | Source |
|------|---------|----------|--------|--------|--------|
| 1 | Sécurité | Rate limiting in-memory (Redis dispo mais pas utilisé) | Critical | S | Back-end Agent 3, Infrastructure Security |
| 2 | Sécurité | CSRF verification incomplète | High | S | Back-end Agent 3 |
| 3 | Architecture | Double design system (@screencold/ui vs components/ui) | High | M | Front-end Agent 6 |
| 4 | Sécurité | Tokens OAuth stockés en clair (Account.access_token/refresh_token) | High | M | Back-end Agent 3, Infrastructure Security |
| 5 | Données | Rate limiting in-memory pas de pagination sur listes (audits, prospects) | High | S | Back-end Agent 5, Repo Review |
| 6 | Architecture | Pas de repository pattern (Prisma direct dans le code) | High | XL | Back-end Agent 1 |
| 7 | Architecture | Business logic mélangée dans les API routes (pas de service layer) | High | L | Back-end Agent 1&2 |
| 8 | Données | `Campaign.prospects String[]` redondant avec relation Prospect | Medium | S | DBA, Domain Expert |
| 9 | Données | Pas d'unicité sur `(campaignId, url)` dans Prospect | Medium | S | DBA |
| 10 | Performance | Jobs worker sans idempotence (retry = double traitement) | High | M | Use Cases Review |
| 11 | Performance | Appels Claude sans timeout défini | High | S | Reliability |
| 12 | Observabilité | Pas de correlation ID entre web et worker | Medium | M | Observability |
| 13 | Scalabilité | Audits non partitionnés (50k+ = problèmes) | Medium | L | Scalability |
| 14 | Architecture | Pas de versioning API cohérent | Medium | M | API Review |
| 15 | Business | Crédits reset non implémenté (creditsResetsAt inutilisé) | Medium | S | Business Analyst |
| 16 | Business | Email templates : variables non validées | Medium | S | Business Analyst |
| 17 | Accessibilité | Labels et aria manquants dans les formulaires | High | M | Front-end Agent 4 |
| 18 | Architecture | Entitlements couplé à Stripe | Low | L | Domain Expert |
| 19 | Infrastructure | Pas de backup automatisé DB | Critical | M | Cloud & Ops |
| 20 | Infrastructure | Images Docker sans scan vulnérabilités | Medium | S | Cloud & Ops |

---

## 🧨 Dette technique critique

1. **Double design system ui + web/components/ui** : Plus le temps passe, plus les deux divergent. Coût de remédiation croît linéairement.
2. **Pas de repository pattern** : Impossible de tester unitairement la logique sans base de données. Chaque nouveau développeur copie le pattern Prisma direct.
3. **Rate limiting en mémoire** : Solution temporaire devenue permanente. Contournable et pas scalable.
4. **Tokens OAuth en clair** : Non-conformité potentielle (RGPD, SOC2). À corriger avant tout audit de sécurité.

---

## ⚠️ Risques à 6 mois

1. **Volume croissant d'audits sans partitionnement** → Requêtes dashboard ralenties, pagination absente
2. **Prisma direct sans abstraction** → Tests impossibles, régressions fréquentes
3. **Pas de caching Redis** → Latence croissante pour les appels API
4. **Pas de backup DB** → Un incident = perte de données totale
5. **Pas de correlation ID** → Debugging de plus en plus difficile avec l'augmentation du trafic

---

## 🔮 Risques à 2 ans

1. **Architecture monolithic Next.js** → Difficulté à extraire des microservices si nécessaire (limite de l'App Router)
2. **Pas de versioning API** → Breaking changes impossibles sans version majeure
3. **Modèle User monolithique** → De plus en plus de champs et relations attachés à User
4. **Worker unique** → Goulot d'étranglement si le volume de jobs augmente

---

## 📅 Plan d'action priorisé

### Sprint 1 — Correctifs critiques (semaine 1-2)

| Action | Effort | Agent |
|--------|--------|-------|
| Remplacer le rate limiting mémoire par Redis | S | Back-end |
| Corriger la vérification CSRF | S | Back-end |
| Ajouter un timeout sur les appels Claude/Stripe/S3 | S | Back-end |
| Configurer le backup automatique de PostgreSQL | M | Infrastructure |
| Ajouter `CHECK (credits >= 0)` et `@@unique([campaignId, url])` | S | DBA |

### Sprint 2 — Stabilisation (semaine 3-6)

| Action | Effort | Agent |
|--------|--------|-------|
| Ajouter pagination sur toutes les listes (audits, campaigns) | M | Back-end |
| Implémenter l'idempotence des jobs worker | M | Worker |
| Ajouter la pagination cursor-based sur les endpoints API | M | API |
| Ajouter correlation ID aux logs (web + worker) | M | Observabilité |
| Ajouter des labels/aria accessibles sur les formulaires | M | Front-end |
| Consolider les tokens OAuth avec chiffrement | M | Sécurité |

### Sprint 3 — Amélioration (mois 2-3)

| Action | Effort | Agent |
|--------|--------|-------|
| Migrer vers un vrai repository pattern (un par aggregate root) | XL | Architecture |
| Extraire la logique métier des API routes vers des services | L | Architecture |
| Uniformiser le design system dans @screencold/ui | M | Front-end |
| Ajouter des métriques RED sur les workers | M | Observabilité |
| Ajouter des tests d'intégration sur les routes API critiques | L | Tests |
| Implémenter le reset automatique des crédits (cron) | S | Business |

### Horizon 6 mois — Évolution

| Action | Effort | Agent |
|--------|--------|-------|
| Partitionnement temporel de la table Audit | L | DBA |
| Ajouter OpenTelemetry / tracing distribué | L | Observabilité |
| Définir et implémenter le versioning API (v1, v2) | M | API |
| Extraire le worker en service indépendant scalable | L | Architecture |
| Audit de sécurité complet (OWASP ASVS Level 2) | L | Sécurité |

---

## Score d'architecture global

| Domaine | Score |
|---------|-------|
| **Architecture** | 5/10 |
| **Sécurité** | 5/10 |
| **Performance** | 6/10 |
| **Maintenabilité** | 5/10 |
| **Scalabilité** | 4/10 |
| **Observabilité** | 5/10 |
| **Score global** | **5/10** |

---

## Verdict

ScreenCold est un projet monorepo bien structuré avec une stack moderne (Next.js 14, Prisma, Tailwind, BullMQ) et de bonnes bases architecturales. Les faiblesses principales sont concentrées sur la **sécurité** (rate limiting mémoire, CSRF, tokens OAuth en clair) et la **maintenabilité** à moyen terme (double design system, pas de repository pattern, pas de pagination). Le système est fonctionnel et peut servir en production dès les correctifs critiques du Sprint 1 appliqués, mais une dette technique significative s'accumulera rapidement si les Sprints 2 et 3 ne sont pas exécutés dans les 3 prochains mois. La décision la plus importante à prendre est l'introduction d'une **couche de repository** et la **consolidation du design system** — ces deux chantiers représentent ~60% de l'effort total de refactoring mais conditionnent la testabilité et l'évolutivité du produit.

---

*Rapport complet — Fin*
