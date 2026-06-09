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

## Sprint 3 — Partitionnement & Performance (mois 3-4)

**Objectif : Passer à l'échelle avec partitionnement DB, caching distribué et worker scalable.**

### 3.1 — Partitionnement Temporel de la Table Audit

| # | Tâche | Fichiers | Effort | Dépendances |
|---|-------|----------|--------|-------------|
| 3.1.1 | Analyser les patterns de requête sur Audit (dashboard, historique, export) | `screencold-web/lib/dashboard.ts`, `screencold-web/app/api/v1/audits/` | M | — |
| 3.1.2 | Créer la fonction de partitionnement PostgreSQL (héritage ou déclaratif) | Script `scripts/partition-audits.sql` | L | 3.1.1 |
| 3.1.3 | Migrer les données existantes dans les partitions (création des partitions mensuelles rétroactives) | Script `scripts/migrate-partitions.ts` | L | 3.1.2 |
| 3.1.4 | Adapter Prisma pour le partitionnement (vue ou requêtes brutes) | `packages/db/prisma/schema.prisma`, `screencold-web/lib/repositories/audit.repository.ts` | M | 3.1.3 |
| 3.1.5 | Ajouter partition automatique des mois futurs (cron mensuel via pg_cron ou job applicatif) | `screencold-worker/jobs/create-partition.ts` (nouveau) | S | 3.1.2 |
| 3.1.6 | Ajouter politiques de retention / archivage des partitions > 12 mois | `screencold-worker/jobs/archive-partition.ts` (nouveau) | S | 3.1.5 |
| 3.1.7 | Mettre à jour les requêtes dashboard pour utiliser `ONLY` ou requêtes scopeées par partition | `screencold-web/lib/dashboard.ts` | M | 3.1.4 |

**Critères d'acceptation :**
- `EXPLAIN ANALYZE` sur les requêtes dashboard montre un partition pruning (scan d'1 seule partition au lieu de full scan)
- La création de partition mensuelle est automatisée (cron)
- Les données > 12 mois sont archivées automatiquement
- Aucune régression sur les write paths (création d'audit)
- Rollback possible : désactiver le partitioning, garder la table mère comme fallback

### 3.2 — Cache Distribué & Optimisation Redis

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 3.2.1 | Ajouter cache Redis sur les API keys (TTL 5 min, invalidation on rotate) | `screencold-web/lib/entitlements/cache.ts` | M |
| 3.2.2 | Ajouter cache Redis sur les plans / entitlements (TTL 10 min) | `screencold-web/lib/entitlements/cache.ts` | M |
| 3.2.3 | Ajouter cache Redis sur les métadonnées utilisateur fréquentes (TTL 2 min) | `screencold-web/middleware.ts` | S |
| 3.2.4 | Implémenter cache warming au démarrage du worker (plans, templates) | `screencold-worker/src/index.ts` | S |
| 3.2.5 | Ajouter métriques de cache hit/miss (Prometheus ou Sentry) | `screencold-web/lib/entitlements/cache.ts` | M |

### 3.3 — Optimisation Worker & Scaling

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 3.3.1 | Extraire le worker en déploiement indépendant (Dockerfile.worker standalone prêt production) | `docker-compose.yml`, `Dockerfile.worker` | L |
| 3.3.2 | Configurer le worker pour scaling horizontal (consumer group BullMQ, multiples instances) | `screencold-worker/src/worker.ts` | M |
| 3.3.3 | Ajouter métriques de saturation worker (queue length, processing time, concurrency) | `screencold-worker/src/worker.ts` | M |
| 3.3.4 | Configurer l'auto-scaling worker basé sur queue depth (webhook ou polling) | Scripts `scripts/scale-worker.sh` ou config k8s | L |
| 3.3.5 | Ajouter circuit breaker sur les appels Claude et Playwright | `screencold-worker/src/services/claude.ts`, `screencold-worker/src/services/playwright.ts` | M |
| 3.3.6 | Implémenter fallback local S3 (stockage temporaire si S3 indisponible) | `screencold-worker/src/services/s3.ts` | M |

**Critères d'acceptation :**
- 2 instances worker consomment la même queue sans duplication de job
- Le worker peut être scale up/down sans perte de job (BullMQ guarantees)
- Les appels Claude/Playwright ont un circuit breaker (3 échecs consécutifs = open circuit)
- En cas de panne S3, le worker stocke localement et retry à la reconnexion
- `docker compose up --scale worker=3` fonctionne sans conflit

### 3.4 — Indexation & Optimisation Requêtes

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 3.4.1 | Audit complet des requêtes lentes (PgHero ou `pg_stat_statements`) | — | S |
| 3.4.2 | Ajouter index composites manquants identifiés par l'audit | `packages/db/prisma/schema.prisma` | S |
| 3.4.3 | Implémenter `select` explicite sur TOUTES les queries Prisma du codebase | Tous les fichiers `lib/` et `app/api/` | M |
| 3.4.4 | Ajouter `EXPLAIN ANALYZE` au pipeline CI pour détecter les régressions | `.github/workflows/ci.yml` | S |

---

## Sprint 4 — Observabilité & Tracing (mois 4-5)

**Objectif : Tracing distribué, alerting proactif, dashboard de monitoring.**

### 4.1 — OpenTelemetry & Tracing Distribué

| # | Tâche | Fichiers | Effort | Dépendances |
|---|-------|----------|--------|-------------|
| 4.1.1 | Installer et configurer OpenTelemetry SDK (Node.js) | `packages/telemetry/src/instrumentation.ts` (nouveau), `screencold-web/instrumentation.ts` | M | — |
| 4.1.2 | Ajouter propagation de contexte (headers W3C TraceContext) dans tous les appels inter-services | `screencold-web/middleware.ts`, `screencold-worker/src/worker.ts` | M | 4.1.1 |
| 4.1.3 | Instrumenter les routes API Next.js avec spans automatiques | `screencold-web/instrumentation.ts` | M | 4.1.1 |
| 4.1.4 | Instrumenter les jobs worker (créer span par job, sub-span par étape) | `screencold-worker/src/worker.ts`, `screencold-worker/jobs/*.ts` | M | 4.1.1 |
| 4.1.5 | Instrumenter les appels externes (Claude SDK, Stripe, S3, Playwright, Resend) avec spans | `screencold-worker/src/services/*.ts`, `screencold-web/lib/stripe.ts`, `screencold-web/lib/s3.ts` | M | 4.1.1 |
| 4.1.6 | Ajouter export des traces vers Jaeger ou Grafana Tempo via OTLP | `packages/telemetry/src/exporter.ts` (nouveau), `docker-compose.yml` | M | 4.1.1 |
| 4.1.7 | Créer dashboard Grafana des traces (taux d'erreur, durée par service, heatmaps) | `grafana/dashboards/tracing.json` (nouveau) | M | 4.1.6 |
| 4.1.8 | Ajouter sampling intelligent (head-based pour req lentes, tail-based pour erreurs) | `packages/telemetry/src/sampler.ts` (nouveau) | M | 4.1.6 |

**Critères d'acceptation :**
- Une requête utilisateur est traçable du clic front-end → API → BullMQ → Worker → S3/Claude
- Chaque span a `correlationId` + `userId` + `auditId` en attributs
- Les traces sont visibles dans Jaeger/Grafana avec flame graph
- Sampling rate configurable (100% en dev, 1-10% en prod)
- Latence médiane des traces < 500ms pour les endpoints critiques

### 4.2 — Métriques & Alerting

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 4.2.1 | Exposer métriques Prometheus sur le web (/metrics endpoint) | `screencold-web/app/api/metrics/route.ts` (nouveau) | M |
| 4.2.2 | Exposer métriques Prometheus sur le worker | `screencold-worker/src/metrics.ts` (nouveau) | M |
| 4.2.3 | Ajouter métriques RED (Rate, Errors, Duration) sur toutes les routes API | `screencold-web/middleware.ts` | M |
| 4.2.4 | Ajouter métriques USE (Utilization, Saturation, Errors) sur le worker | `screencold-worker/src/worker.ts` | M |
| 4.2.5 | Configurer Prometheus + Grafana dans docker-compose | `docker-compose.yml`, `prometheus/prometheus.yml` | S |
| 4.2.6 | Définir règles d'alerte (Sentry + Grafana) pour les seuils critiques | `grafana/alerting/rules.yml` (nouveau) | M |
| 4.2.7 | Ajouter dashboard Grafana "Vue d'ensemble produit" (utilisateurs actifs, audits, jobs, erreurs) | `grafana/dashboards/product-overview.json` (nouveau) | L |
| 4.2.8 | Ajouter alertes email/Slack sur les événements critiques (queue bloquée, erreur > seuil) | `screencold-worker/src/alerting.ts` (nouveau) | M |

### 4.3 — Logging & Debugging

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 4.3.1 | Centraliser les logs (ELK, Loki, ou Axiom) | `docker-compose.yml`, `screencold-worker/src/utils/logger.ts` | M |
| 4.3.2 | Ajouter niveaux de log structurés et requêtables (json, corrélation id, service name) | `screencold-web/lib/logger.ts`, `screencold-worker/src/utils/logger.ts` | S |
| 4.3.3 | Ajouter log tail en temps réel (dashboard admin) via WebSocket | `screencold-web/app/api/admin/logs/route.ts` | L |

---

## Sprint 5 — Versioning API & Maturité (mois 5-6)

**Objectif : API versionnée, robuste, documentée et prête pour l'intégration tierce.**

### 5.1 — Versioning API

| # | Tâche | Fichiers | Effort | Dépendances |
|---|-------|----------|--------|-------------|
| 5.1.1 | Définir la stratégie de versioning (URI path /v1/, /v2/ avec header Accept-Version) | Documentation `docs/api/versioning.md` (nouveau) | M | — |
| 5.1.2 | Déplacer toutes les routes existantes sous `/api/v1/` | `screencold-web/app/api/v1/audits/`, `screencold-web/app/api/v1/campaigns/`, `screencold-web/app/api/v1/credits/` | M | 5.1.1 |
| 5.1.3 | Migrer les routes non versionnées (`/api/auth/`, `/api/webhooks/`, `/api/health/`) vers `/api/v1/` ou les laisser hors-version | `screencold-web/app/api/auth/`, `screencold-web/app/api/webhooks/`, `screencold-web/app/api/health/` | M | 5.1.1 |
| 5.1.4 | Ajouter middleware de versioning (header de dépréciation, sunset) | `screencold-web/middleware.ts` | M | 5.1.1 |
| 5.1.5 | Ajouter le support `Accept-Version` header (en plus du path) | `screencold-web/middleware.ts` | S | 5.1.4 |
| 5.1.6 | Mettre à jour le SDK client (web) pour utiliser le versioning | `screencold-web/lib/api-client.ts` (nouveau) | M | 5.1.2 |
| 5.1.7 | Documenter l'API avec OpenAPI/Swagger (auto-généré depuis Zod ou manuel) | `docs/api/openapi.yaml` (nouveau) | L | 5.1.2 |
| 5.1.8 | Ajouter changelog de l'API (breaking changes, migrations, sunset policy) | `docs/api/changelog.md` (nouveau) | S | 5.1.7 |

**Critères d'acceptation :**
- `GET /api/v1/audits` et `GET /api/v2/audits` peuvent coexister
- Un appel avec `Accept-Version: v1` fonctionne sans le préfixe dans l'URL (si configuré)
- Les endpoints dépréciés renvoient header `Sunset: date` + `Deprecation: true`
- Documentation OpenAPI générée et accessible via `/api/docs`
- `npm run build` passe sans erreur d'import (routes déplacées + imports mis à jour)

### 5.2 — API Contracts & Validation Renforcée

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 5.2.1 | Ajouter validation Zod systématique sur TOUTES les routes API (request body + query + params) | `screencold-web/app/api/v1/**/route.ts` | M |
| 5.2.2 | Standardiser les réponses API (wrapper `{ data, error, meta }`) | `screencold-web/lib/api-response.ts` (nouveau) | M |
| 5.2.3 | Ajouter pagination cursor-based sur les enums (status transitions, timeline) | `screencold-web/app/api/v1/audits/[id]/events/route.ts` | S |
| 5.2.4 | Ajouter rate limiting par endpoint spécifique (audit POST plus limité que GET) | `screencold-web/middleware.ts` | S |
| 5.2.5 | Ajouter tests de contrat (Pact) pour les intégrations critiques (web ↔ worker) | `tests/contracts/web-worker.pact.ts` (nouveau) | L |

### 5.3 — Documentation & Dev Experience

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 5.3.1 | Ajouter Playground API (Swagger UI ou Scalar) à l'URL `/api/docs` | `screencold-web/app/api/docs/route.ts` (nouveau) | M |
| 5.3.2 | Ajouter script de seed de données de démo (complet, réaliste) | `packages/db/prisma/seed-demo.ts` | M |
| 5.3.3 | Ajouter guide de contribution (CONTRIBUTING.md) avec conventions API | `CONTRIBUTING.md` | S |
| 5.3.4 | Ajouter guide de déploiement (PRODUCTION.md) | `PRODUCTION.md` | S |

---

## Sprint 6 — Sécurité & Résilience (mois 5-6, parallèle à Sprint 5)

**Objectif : Audit de sécurité complet, hardening, résilience aux pannes.**

### 6.1 — Audit de Sécurité OWASP ASVS Level 2

| # | Tâche | Fichiers | Effort | Dépendances |
|---|-------|----------|--------|-------------|
| 6.1.1 | Audit OWASP ASVS L2 complet (automatisé + manuel) | — | XL | Sprint 0 + 1.4 terminés |
| 6.1.2 | Corriger les vulnérabilités identifiées (priorité haute) | Variables selon l'audit | L | 6.1.1 |
| 6.1.3 | Ajouter 2FA/TOTP optionnel pour les comptes | `screencold-web/lib/auth.ts`, `screencold-web/app/(auth)/2fa/` | L | Sprint 2 |
| 6.1.4 | Ajouter audit logging des actions sensibles (connexion, API key creation, delete) | `screencold-web/lib/audit-log.ts` | M | — |

### 6.2 — Hardening Infra

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 6.2.1 | Ajouter scan de vulnérabilités automatique dans CI (Trivy + npm audit) | `.github/workflows/security.yml` | M |
| 6.2.2 | Hardening Docker (non-root user, read-only rootfs, seccomp) | `Dockerfile.web`, `Dockerfile.worker` | M |
| 6.2.3 | Ajouter WAF / rate limiting au niveau reverse proxy (nginx ou Caddy) | `nginx/` ou `Caddyfile` | M |
| 6.2.4 | Configurer backup DB automatisé avec test de restore hebdomadaire | `scripts/backup-db.sh`, `scripts/restore-test.sh` | M |
| 6.2.5 | Ajouter secrets rotation automatique (Stripe, Claude, S3) | Script `scripts/rotate-secrets.sh` | S |

### 6.3 — Résilience & Disaster Recovery

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| 6.3.1 | Écrire et tester le plan de disaster recovery (document + script) | `docs/ops/disaster-recovery.md` | L |
| 6.3.2 | Implémenter multi-AZ / multi-région pour les services critiques (DB, Redis) | `docker-compose.prod.yml` | XL |
| 6.3.3 | Ajouter health checks enrichis (dépendances, latence, version) | `screencold-web/app/api/health/route.ts`, `screencold-worker/src/health.ts` | M |
| 6.3.4 | Configurer le chaos engineering (Gremlin ou chaos-mesh) pour tester la résilience | Scripts `scripts/chaos/` | XL |

---

## Chantiers transverses

### Chantier Business

| # | Tâche | Sprint | Effort | Dépendances |
|---|-------|--------|--------|-------------|
| B.1 | Documenter et implémenter la règle de reset des crédits (cron mensuel) | Sprint 2 | S | — |
| B.2 | Ajouter `requireCredits` dans le middleware pour `/api/v1/audits/` | Sprint 1 | S | — |
| B.3 | Ajouter limite de campagnes par plan (via entitlements) | Sprint 2 | M | 2.1.3 (CampaignRepository) |
| B.4 | Valider les variables des templates email (déclarées vs utilisées) | Sprint 2 | S | — |
| B.5 | Vérifier la propriété des audits systématiquement (`audit.userId === session.user.id`) | Sprint 1 | S | — |
| B.6 | Ajouter notification utilisateur lors du reset des crédits (email + in-app) | Sprint 3 | S | B.1 |
| B.7 | Ajouter quota API par plan (rate limiting par utilisateur) via entitlements | Sprint 3 | M | 3.2.1 (cache API keys) |
| B.8 | Implémenter trial period pour nouveaux utilisateurs (7 jours, accès PRO) | Sprint 4 | M | — |
| B.9 | Ajouter export CSV des audits et campagnes pour les plans payants | Sprint 4 | S | 3.1.6 (partitionnement) |
| B.10 | Ajouter webhooks sortants (notifier les intégrations tierces des événements) | Sprint 5 | L | 5.1 (API versioning) |
| B.11 | Ajouter tableau de bord d'usage (crédits consommés, audits restants, dates de reset) | Sprint 3 | M | B.1 |
| B.12 | Vérification de la limite de prospects par campagne (selon plan) | Sprint 2 | S | — |

### Chantier Infrastructure & Ops

| # | Tâche | Sprint | Effort | Dépendances |
|---|-------|--------|--------|-------------|
| I.1 | Configurer pgBouncer pour le pooling de connexions | Sprint 2 | M | — |
| I.2 | Ajouter rolling updates + health checks pour zero-downtime | Sprint 2 | M | — |
| I.3 | Ajouter scan de vulnérabilités Docker (Trivy) dans CI | Sprint 3 | S | — |
| I.4 | Centraliser les variables d'environnement (vault Doppler ou 1Password) | Sprint 2 | M | — |
| I.5 | Script de rollback automatisé (docker compose rollback + DB migration revert) | Sprint 3 | S | — |
| I.6 | Migration CI/CD de GitHub Actions vers déploiement automatisé (VPS ou k8s) | Sprint 3 | L | I.2 |
| I.7 | Mettre en place un environnement de staging (pré-prod identique à prod) | Sprint 2 | L | — |
| I.8 | Configurer monitoring uptime (BetterUptime ou Grafana Cloud) avec alertes PagerDuty | Sprint 4 | S | 4.2 (métriques) |
| I.9 | Ajouter script de diagnostic rapide (health check complet + rapport) | Sprint 3 | S | — |
| I.10 | Automatiser le renouvellement des certificats SSL (Let's Encrypt / cert-manager) | Sprint 2 | S | — |
| I.11 | Configurer la rétention des logs (max 30 jours, rotation automatique) | Sprint 4 | S | 4.3.1 |
| I.12 | Ajouter backup du volume Redis (RDB/AOF) dans la stratégie de backup | Sprint 3 | S | — |

### Chantier Tests

| # | Tâche | Sprint | Effort | Dépendances |
|---|-------|--------|--------|-------------|
| T.1 | Tests unitaires sur les repositories | Sprint 2 | M | 2.1 (Repositories créés) |
| T.2 | Tests unitaires sur le middleware (auth, rate-limit, CSRF) | Sprint 1 | M | — |
| T.3 | Tests d'intégration sur les jobs worker (capture, analyze) | Sprint 3 | L | 3.3 (Worker scaling) |
| T.4 | Tests de rendu sur les composants UI (Storybook + Vitest) | Sprint 2 | M | 2.3 (Design system) |
| T.5 | Tests unitaires sur les services (entitlements, email-sequences) | Sprint 2 | M | 2.2 (Service layer) |
| T.6 | Tests d'intégration API (end-to-end, auth → création audit → polling → résultats) | Sprint 2 | L | 2.1, 2.2 |
| T.7 | Tests de charge (k6 ou artillery) sur les endpoints critiques (POST audit, GET dashboard) | Sprint 3 | L | 3.4 (Indexation) |
| T.8 | Tests de sécurité automatisés (ZAP ou Burp passive scan) | Sprint 6 | M | 6.1.1 |
| T.9 | Tests de contrat (web ↔ worker) avec Pact | Sprint 5 | L | 5.2.5 |
| T.10 | Tests de résilience (injection de pannes : Redis down, S3 down, Claude timeout) | Sprint 6 | M | 6.3 |
| T.11 | Tests de régression visuelle (Chromatic ou Percy) sur le design system | Sprint 2 | M | 2.3 |
| T.12 | Tests de performance worker (débit max, saturation queue) | Sprint 4 | M | 3.3.3 |

---

## Dépendances entre sprints

```
Sprint 0 ─── Quick Wins ──────────────────────────────────────────────────────────────┐
       (rate-limit Redis, CSRF, timeouts, contraintes DB, backup)                      │
                                                                                       ▼
Sprint 1 ─── Stabilisation ────────────────────────────────────────────────────────────┐
       │  1.1 Pagination ─────────▶ 1.5 Accessibilité                                  │
       │  1.2 Worker + Jobs ──────▶ (alimente 3.3 scaling, 4.1.4 instrumentation)       │
       │  1.3 Observabilité ──────▶ (alimente 4.1 tracing, 4.2 métriques)               │
       │  1.4 Sécurité ───────────▶ (alimente 6.1 audit sécurité)                       │
       ▼                                                                                │
Sprint 2 ─── Architecture & Design System ────────────────────────────────────────────┐│
       │  2.1 Repository ─────────▶ 2.2 Service Layer (T.1, T.5, T.6)                  ││
       │  2.3 Design System ──────▶ (T.4, T.11)                                        ││
       │  2.4 Modèle de Données ──▶ (B.1, B.3, B.4)                                    ││
       │  2.5 Front-End Archi ────▶ (améliore DX)                                      ││
       ▼                                                                                ▼│
Sprint 3 ─── Partitionnement & Performance ────────────────────────────────────────────┘│
       │  3.1 Partitionnement ────▶ 3.4 Indexation                                     │
       │  3.2 Cache Redis ────────▶ (B.7, I.12)                                        │
       │  3.3 Scaling Worker ─────▶ (T.3, T.12)                                        │
       ▼                                                                                 │
Sprint 4 ─── Observabilité & Tracing ──────────────────────────────────────────────────┘│
       │  4.1 OpenTelemetry ──────▶ 4.2 Métriques                                       │
       │  4.2 Métriques ──────────▶ 4.3 Logging centralisé                              │
       │  4.3 Logging ────────────▶ (I.8, I.11)                                         │
       ▼                                                                                 │
Sprint 5 ─── Versioning API ───────┐                                                    │
       │  5.1 Versioning ─────────▶ 5.2 Contracts ───▶ 5.3 Documentation                │
       │  5.2 Contrats ───────────▶ (T.9)                                               │
       │  5.3 Documentation                                                            │
       ▼                                                                                 │
Sprint 6 ─── Sécurité & Résilience ────────────────────────────────────────────────────┘
       │  6.1 Audit OWASP ────────▶ 6.2 Hardening ───▶ 6.3 Disaster Recovery
       │  6.2 Hardening
       │  6.3 DR
       
Flux de dépendances critiques :
  ──────────────────────────────────────────────────────────────────────────────────────
  Sprint 1.3 (Observabilité) ──▶ Sprint 4 (Tracing) : Sans corrélation ID basique,
                                  le tracing avancé manque de fondation
  Sprint 2.1 (Repository) ────▶ Tous les tests : Les tests d'intégration et unitaires
                                  dépendent de la couche repository pour être mockable
  Sprint 3.1 (Partitionnement) ──▶ Sprint 4 (Dashboards) : Les dashboards doivent
                                     requêter les partitions correctement
  Sprint 5.1 (Versioning) ────▶ Sprint 6 (Sécurité) : L'audit de sécurité se fait
                                  sur une API versionnée stabilisée

Dépendances parallélisables :
  Sprint 3.2 (Cache) + 3.4 (Indexation) : Indépendants, peuvent être faits en parallèle
  Sprint 5.1 (Versioning) + 6.1 (Audit) : Parallélisables (2 équipes différentes)
  Sprint 4.2 (Métriques) + 4.3 (Logs) : Peuvent être faits en parallèle

**Règle** : Les tâches de sécurité (Sprint 0 + 1.4 + 6.1) sont prioritaires et bloquantes pour toute mise en production.
**Règle** : La couche repository (Sprint 2.1) doit précéder tous les tests d'intégration.
**Règle** : Le versioning API (Sprint 5) doit être finalisé avant tout changement breaking.

---

## Risques et mitigations

| # | Risque | Probabilité | Impact | Mitigation |
|---|--------|------------|--------|------------|
| R.1 | Refactor repository (S2) peut casser des routes existantes | Haute | Critique | Écrire les tests d'intégration AVANT le refactor. Feature flags pour basculer progressivement |
| R.2 | Migration du design system (S2) crée des regressions visuelles | Haute | Élevé | Storybook + tests de régression visuelle (Chromatic). Migration composant par composant, pas big bang |
| R.3 | Changement de schéma DB (suppression `Campaign.prospects`, partitionnement) peut causer downtime | Moyenne | Critique | Migrations en 2+ temps : (1) ajouter nouvelle structure, (2) backfill données, (3) supprimer ancienne. `LOCK TABLE` à éviter, utiliser des batchs |
| R.4 | Chiffrement des tokens OAuth invalide les sessions existantes | Haute | Élevé | Script de migration offline : déchiffrer/re-chiffrer progressivement. Tester sur staging avec un dump de prod anonymisé |
| R.5 | Partitionnement de la table Audit (S3) mal configuré → queries lentes | Moyenne | Critique | Valider avec `EXPLAIN ANALYZE` sur un jeu de données réaliste. Prévoir un rollback (désactiver partitioning, garder table mère comme fallback) |
| R.6 | OpenTelemetry ajoute de la latence (overhead de tracing) | Moyenne | Moyen | Sampling adaptatif : 100% en dev, 1% en prod (augmenté à 10% si latence > seuil). Mesurer l'impact avant le déploiement large |
| R.7 | Scaling worker horizontal (S3) → race conditions ou double traitement | Moyenne | Critique | BullMQ guarantees (at-least-once + dedup via jobId). Idempotence obligatoire dans chaque handler de job. Tests avec 3+ workers simultanés |
| R.8 | Versioning API (S5) mal conçu → routes existantes cassées pour les clients | Haute | Élevé | Coexistence /v1/ et /v2/ pendant 2 cycles. Header `Sunset` + `Deprecation`. Migration progressive des clients web |
| R.9 | Audit OWASP (S6) révèle trop de vulnérabilités → retard sur le planning | Moyenne | Élevé | Faire un pré-audit rapide en Sprint 1. Prioriser les corrections par criticité. Ajouter du buffer (2 semaines) dans le planning |
| R.10 | Dépendance externe (Claude API, Stripe, Resend) change son contrat ou devient indisponible | Faible | Critique | Circuit breaker + fallback (message d'erreur clair + retry). Version pinning des SDK. Cache des données statiques (plans Stripe, templates) |
| R.11 | Migration Prisma → partitionnement (3.1.4) non supportée nativement → contournement complexe | Moyenne | Élevé | Utiliser raw SQL pour les queries partitionnées via Prisma `$queryRaw`. Garder Prisma pour les writes. Si trop complexe, reporter le partitionnement et utiliser l'archivage comme alternative |
| R.12 | L'équipe n'a pas la capacité de maintenir le stack monitoring (Grafana + Prometheus + OTel) | Faible | Moyen | Utiliser un service managé (Grafana Cloud, Datadog, Sentry Performance) en alternative. Préférer des solutions intégrées plutôt que du self-hosted |
| R.13 | Les migrations DB (partitionnement, index) prennent un lock exclusif sur PostgreSQL → downtime | Haute | Critique | Utiliser `CREATE INDEX CONCURRENTLY` pour les index. Pour le partitionnement, utiliser pg_partman ou une fenêtre de maintenance planifiée |
| R.14 | Le versioning API /v1/, /v2/ (5.1) alourdit la maintenance (2 versions à supporter) | Moyenne | Moyen | Stratégie de sunset claire (2 versions majeures supportées). Politique de dépréciation = 6 mois. Automatiser les tests de régression cross-version |

### Plan de mitigation transverse

```
Prévention :
  ┌─────────────────────────────────────────────────────────────────────┐
  │ Tous les refactors majeurs → feature flag désactivable              │
  │ Toutes les migrations DB → script de rollback testé                 │
  │ Toutes les dépendances externes → circuit breaker + timeout         │
  │ Tous les déploiements → staging + health checks                     │
  └─────────────────────────────────────────────────────────────────────┘

Détection :
  ┌─────────────────────────────────────────────────────────────────────┐
  │ Monitoring RED (Rate, Errors, Duration) sur toutes les routes API   │
  │ Alerting Sentry + Grafana sur les erreurs 5xx, jobs échoués         │
  │ Tests de performance CI (régression > 10% → bloque le déploiement)  │
  └─────────────────────────────────────────────────────────────────────┘

Réaction :
  ┌─────────────────────────────────────────────────────────────────────┐
  │ Rollback automatisé (git revert + docker compose rollback)          │
  │ Runbook pour chaque type d'incident (DB down, Redis down, API down) │
  │ Communication planifiée (statut incident → page status → users)     │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## Suivi

Chaque sprint doit produire :
- PR avec tests associés
- Mise à jour du CHANGELOG.md (si existant)
- Revue de code par un pair
- Vérification que `pnpm build` passe
