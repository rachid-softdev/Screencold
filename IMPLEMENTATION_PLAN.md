# ScreenCold — Plan d'Implémentation

> Généré le : 2026-06-09
> Source : REVIEW.md (Revue de code complète)
> Scope : Monorepo complet (7 workspaces)

---

## Convention d'estimation

| Taille | Effort | Exemple |
|--------|--------|---------|
| XS | < 2h | Ajouter un fichier de config, corriger un type |
| S | 2-4h | Ajouter un validateur, corriger un bug localisé |
| M | 1-3j | Ajouter un service, refactor un module |
| L | 1-2sem | Ajouter une couche d'abstraction, nouveau pattern |
| XL | 2-4sem | Refactor architectural complet |

---

## Sprint 0 — Quick Wins (sécurité + intégrité données)

**Objectif : Corriger les vulnérabilités critiques et les risques de perte de données.**

### Tâches

| # | Tâche | Fichiers | Effort | Dépendances |
|---|-------|----------|--------|-------------|
| 0.1 | Remplacer le rate limiting mémoire par Redis | `screencold-web/lib/rate-limit.ts`, `screencold-web/middleware.ts` | S | — |
| 0.2 | Corriger la vérification CSRF (double-submit cookie ou SameSite=Strict) | `screencold-web/lib/csrf.ts`, `screencold-web/middleware.ts` | S | — |
| 0.3 | Ajouter timeout explicite sur tous les appels externes (Claude, Stripe, S3, Resend) | `screencold-worker/src/services/claude.ts`, `screencold-web/lib/stripe.ts`, `screencold-web/lib/s3.ts`, `screencold-worker/src/services/s3.ts`, `screencold-web/lib/email.ts` | S | — |
| 0.4 | Ajouter `CHECK (credits >= 0)` sur User et `@@unique([campaignId, url])` sur Prospect | `packages/db/prisma/schema.prisma` | S | — |
| 0.5 | Configurer le backup automatique de PostgreSQL | `docker-compose.yml`, script `scripts/backup-db.sh` | M | — |

### Critères d'acceptation

- Rate limiting utilisé Redis (vérifiable : redémarrage serveur ≠ reset compteurs)
- CSRF : aucune requête POST sans Origin/Referer valide ou token n'aboutit
- Tous les appels externes ont un timeout défini (AbortSignal)
- `prisma migrate dev` applique les nouvelles contraintes sans erreur
- Backup DB s'exécute et produit un fichier `.sql` valide

---

## Sprint 1 — Stabilisation (semaine 3-6)

**Objectif : Rendre le système fiable, observable et résilient.**

### 1.1 — Pagination & Requêtes

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 1.1.1 | Ajouter pagination cursor-based sur les endpoints API listant des collections | `screencold-web/app/api/v1/audits/route.ts`, `screencold-web/app/api/v1/campaigns/route.ts` | M |
| 1.1.2 | Ajouter pagination UI (composant Pagination + intégration dans les listes) | `screencold-web/components/ui/pagination.tsx`, `screencold-web/app/(dashboard)/audits/page.tsx`, `screencold-web/app/(dashboard)/campaigns/page.tsx` | M |
| 1.1.3 | Ajouter `select` explicite sur toutes les queries Prisma (éliminer SELECT *) | Tous les fichiers `lib/` et `app/api/` utilisant `prisma.*.findMany/findUnique` | M |
| 1.1.4 | Ajouter index composite `(userId, status)` sur Audit | `packages/db/prisma/schema.prisma` | XS |

### 1.2 — Worker & Jobs

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 1.2.1 | Implémenter l'idempotence des jobs worker (vérifier état avant traitement) | `screencold-worker/jobs/analyze.ts`, `screencold-worker/jobs/capture.ts`, `screencold-worker/jobs/annotate.ts`, `screencold-worker/jobs/upload.ts` | M |
| 1.2.2 | Ajouter Dead Letter Queue BullMQ pour les jobs en échec | `screencold-worker/queues/audit-queue.ts`, `screencold-worker/src/worker.ts` | S |
| 1.2.3 | Ajouter retry avec backoff exponentiel sur tous les appels externes du worker | `screencold-worker/src/services/playwright.ts`, `screencold-worker/src/services/claude.ts`, `screencold-worker/src/services/s3.ts` | S |

### 1.3 — Observabilité

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 1.3.1 | Ajouter correlation ID propagé dans les logs (web + worker) | `screencold-web/middleware.ts`, `screencold-web/lib/analytics.ts`, `screencold-worker/src/utils/logger.ts` | M |
| 1.3.2 | Ajouter logs structurés (Pino) côté web | `screencold-web/lib/logger.ts` (nouveau) | S |
| 1.3.3 | Ajouter métriques RED (Rate, Errors, Duration) sur les jobs worker | `screencold-worker/src/worker.ts` | M |
| 1.3.4 | Ajouter health check utilisable par Docker Compose | `screencold-worker/src/health.ts` (améliorer), `docker-compose.yml` | S |

### 1.4 — Sécurité

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 1.4.1 | Chiffrer les tokens OAuth (access_token, refresh_token) avec AES-256-GCM | `screencold-web/lib/auth.ts`, `packages/db/prisma/schema.prisma` (commentaire) | M |
| 1.4.2 | Ajouter rate limiting Redis sur les routes `/api/auth/*` | `screencold-web/middleware.ts` | S |
| 1.4.3 | Ajouter validation des entrées sur toutes les routes API (Zod) | Routes sous `screencold-web/app/api/` | M |

### 1.5 — Front-End Accessibilité

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 1.5.1 | Ajouter labels/aria sur tous les champs de formulaire | `screencold-web/components/ui/input.tsx`, `screencold-web/components/ui/textarea.tsx` | M |
| 1.5.2 | Corriger les contrastes sur les variantes outline/ghost des boutons | `screencold-web/components/ui/button.tsx`, `screencold-ui/src/atoms/button.tsx` | S |
| 1.5.3 | Ajouter `role="status"` et `aria-live="polite"` aux loading states | `screencold-web/app/(dashboard)/dashboard/loading.tsx`, tous les loading.tsx | S |

### Critères d'acceptation

- Tous les endpoints de listes retournent `cursor`/`nextCursor` dans la réponse
- Un job rejoué ne crée pas de doublon (vérifiable : worker.redeliver)
- Les logs contiennent un `correlationId` traçable du web au worker
- Les tokens OAuth en DB ne sont plus en clair
- Lighthouse Accessibility passe ≥ 90 sur les pages dashboard

---

## Sprint 2 — Architecture & Design System (mois 2-3)

**Objectif : Refactorer l'architecture pour la testabilité et la maintenabilité.**

### 2.1 — Couche Repository

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 2.1.1 | Créer interface `UserRepository` + implémentation Prisma | `screencold-web/lib/repositories/user.repository.ts` (nouveau) | M |
| 2.1.2 | Créer `AuditRepository` (findByUserId, create, updateStatus, paginated) | `screencold-web/lib/repositories/audit.repository.ts` (nouveau) | M |
| 2.1.3 | Créer `CampaignRepository` + `ProspectRepository` | `screencold-web/lib/repositories/campaign.repository.ts`, `screencold-web/lib/repositories/prospect.repository.ts` (nouveaux) | M |
| 2.1.4 | Migrer les routes API pour utiliser les repositories | `screencold-web/app/api/v1/audits/route.ts`, `screencold-web/app/api/v1/campaigns/route.ts` | L |
| 2.1.5 | Migrer les services (entitlements, credits) pour utiliser les repositories | `screencold-web/lib/entitlements/`, `screencold-web/lib/credits.ts` | L |

### 2.2 — Service Layer

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 2.2.1 | Extraire `AuditService` depuis les routes API | `screencold-web/lib/services/audit.service.ts` (nouveau) | M |
| 2.2.2 | Extraire `CampaignService` depuis les routes API | `screencold-web/lib/services/campaign.service.ts` (nouveau) | M |
| 2.2.3 | Extraire `BillingProvider` interface pour découpler Stripe du métier | `screencold-web/lib/entitlements/billing-provider.ts` (nouveau) | L |
| 2.2.4 | Refactorer `email-sequences.ts` en 3 services (Generator, Sender, Tracker) | `screencold-web/lib/services/email-generator.ts`, `screencold-web/lib/services/email-sender.ts`, `screencold-web/lib/services/email-tracker.ts` (nouveaux) | M |

### 2.3 — Design System

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 2.3.1 | Consolider tous les composants UI dans `@screencold/ui` | `screencold-ui/src/atoms/*`, `screencold-ui/src/molecules/*`, `screencold-ui/src/organisms/*` | M |
| 2.3.2 | Supprimer le dossier `screencold-web/components/ui/` après migration | `screencold-web/components/ui/` | S |
| 2.3.3 | Mettre à jour tous les imports dans `screencold-web/` pour utiliser `@screencold/ui` | `screencold-web/components/`, `screencold-web/app/` | M |
| 2.3.4 | Ajouter palette sémantique complète dans tailwind.config (success, warning, error, info) | `screencold-web/tailwind.config.js`, `screencold-ui/tailwind.config.js` | M |
| 2.3.5 | Standardiser les animations (durées, easings) dans le design system | `screencold-ui/src/tokens/animations.ts` (nouveau) | S |

### 2.4 — Modèle de Données

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 2.4.1 | Supprimer `Campaign.prospects String[]` (redondant avec relation Prospect) | `packages/db/prisma/schema.prisma` | S |
| 2.4.2 | Supprimer l'enum `Plan` sur User, utiliser uniquement la table Plan | `packages/db/prisma/schema.prisma`, `packages/types/src/entitlements.ts` | M |
| 2.4.3 | Ajouter `EmailTemplate.variables` validation (toutes les variables déclarées existent dans le template) | `screencold-web/lib/email-templates.ts` | S |
| 2.4.4 | Remplacer `CreditTransaction.type String` par un enum | `packages/db/prisma/schema.prisma`, `packages/types/src/entitlements.ts` | S |

### 2.5 — Front-End Architecture

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 2.5.1 | Créer hooks personnalisés (useApi, usePolling, useAudit) | `screencold-web/hooks/use-api.ts`, `screencold-web/hooks/use-polling.ts`, `screencold-web/hooks/use-audit.ts` (nouveaux) | M |
| 2.5.2 | Extraire la logique API des composants vers les hooks | `screencold-web/components/audit/`, `screencold-web/components/campaigns/` | M |
| 2.5.3 | Ajouter états d'erreur réseau explicites dans le formulaire d'audit | `screencold-web/components/forms/audit-form.tsx` | S |
| 2.5.4 | Ajouter score gauge avec gradation couleur (rouge/jaune/vert) | `screencold-web/components/audit/score-gauge.tsx` | S |
| 2.5.5 | Adapter le visualiseur de screenshots annotés au mobile (coordonnées relatives) | `screencold-web/components/audit/annotated-image.tsx` | S |

### Critères d'acceptation

- Aucun import direct de `prisma.xxx` dans les routes API (passage par repository)
- `@screencold/ui` est l'unique source de composants UI
- Tous les composants utilisent les tokens de couleur sémantique
- Les hooks sont utilisables et testables indépendamment
- `npm run build` passe sans erreur d'import

---

## Horizon 6 mois — Évolution

**Objectif : Préparer la scalabilité et l'évolution long terme.**

| # | Tâche | Effort | Déclencheur |
|---|-------|--------|-------------|
| H.1 | Partitionnement temporel de la table Audit (par mois sur createdAt) | L | > 50k audits |
| H.2 | Ajouter OpenTelemetry / tracing distribué | L | > 10k req/jour |
| H.3 | Définir et implémenter le versioning API (/v1/, /v2/) | M | Premier breaking change |
| H.4 | Extraire le worker en service indépendant scalable | L | File d'attente > 1000 jobs |
| H.5 | Audit de sécurité complet (OWASP ASVS Level 2) | L | Avant mise en production |
| H.6 | Tests d'intégration sur les routes API critiques | L | Sprint 3 |
| H.7 | Implémenter reset automatique des crédits (cron) | S | — |

---

## Tâches transverses

### Chantier Business Analyst

| # | Tâche | Effort |
|---|-------|--------|
| B.1 | Documenter et implémenter la règle de reset des crédits (cron ou vérification au login) | S |
| B.2 | Ajouter `requireCredits` dans le middleware pour `/api/v1/audits/` | S |
| B.3 | Ajouter limite de campagnes par plan (via entitlements) | M |
| B.4 | Valider les variables des templates email (déclarées vs utilisées) | S |
| B.5 | Vérifier la propriété des audits systématiquement (`audit.userId === session.user.id`) | S |

### Chantier Infrastructure & Ops

| # | Tâche | Effort |
|---|-------|--------|
| I.1 | Configurer pgBouncer pour le pooling de connexions | M |
| I.2 | Ajouter rolling updates + health checks pour zero-downtime | M |
| I.3 | Ajouter scan de vulnérabilités Docker (Trivy) dans CI | S |
| I.4 | Centraliser les variables d'environnement (vault) | M |
| I.5 | Script de rollback automatisé | S |

### Chantier Tests

| # | Tâche | Effort |
|---|-------|--------|
| T.1 | Tests unitaires sur les repositories | M |
| T.2 | Tests unitaires sur le middleware (auth, rate-limit, CSRF) | M |
| T.3 | Tests d'intégration sur les jobs worker (capture, analyze) | L |
| T.4 | Tests de rendu sur les composants UI | M |
| T.5 | Tests unitaires sur les services (entitlements, email) | M |

---

## Dépendances entre sprints

```
Sprint 0 ─────────────────────────────────────────┐
                                                   ▼
Sprint 1 ──▶ 1.1 Pagination ◀── 1.5 Accessibilité │
             1.2 Worker + Jobs                     │
             1.3 Observabilité                      │
             1.4 Sécurité ──────────────────────────┘
                                                   │
Sprint 2 ──▶ 2.1 Repository ──▶ 2.2 Service Layer  │
             2.3 Design System                      │
             2.4 Modèle de Données                  │
             2.5 Front-End Architecture             │
                                                   ▼
Horizon ───▶ Évolutions long terme
```

**Règle** : Les tâches de sécurité (Sprint 0 + 1.4) sont prioritaires et bloquantes pour toute mise en production.

---

## Risques et mitigations

| Risque | Mitigation |
|--------|-----------|
| Refactor repository peut casser des routes existantes | Tests d'intégration à écrire AVANT le refactor |
| Migration du design system peut créer des regressions visuelles | Storybook + review visuelle sprint 2 |
| Changement de schéma DB (suppression `Campaign.prospects`) | Migration en 2 temps : d'abord ajouter index, puis supprimer colonne |
| Chiffrement des tokens OAuth invalide les sessions existantes | Migration script avec déchiffrement/rechiffrement progressif |

---

## Suivi

Chaque sprint doit produire :
- PR avec tests associés
- Mise à jour du CHANGELOG.md (si existant)
- Revue de code par un pair
- Vérification que `pnpm build` passe
