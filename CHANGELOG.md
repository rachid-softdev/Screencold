# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-15

### Added

- **Email Templates**: Personnalisation des emails de prospection
- **Team Management**: Gestion des membres d'équipe (invitations, rôles)
- **API Access**: Accès API pour les plans Pro et Agency
- **Dark Mode**: Support du mode sombre
- **Resend Integration**: Envoi réel des emails de prospection
- **Email Notifications**: Notifications lors de la complétion des audits

### Changed

- **Pricing Page**: Utilisation dynamique des prix depuis `plans.ts`
- **CI/CD**: Correction du workflow de déploiement preview

### Fixed

- **Pricing**: Incohérence des prix entre la page et la config
- **Email**: Les emails de prospection sont maintenant réellement envoyés

## [0.1.0] - 2025-12-01

### Added

- **Core Features**
  - Audit automatique de sites web via screenshots
  - Analyse IA avec Claude (Computer Vision)
  - Génération d'emails de prospection personnalisés
  - Dashboard utilisateur avec stats

- **Authentication**
  - NextAuth.js avec Google OAuth
  - Authentification par email/mot de passe
  - Gestion des sessions JWT

- **Billing**
  - Système de crédits
  - 4 plans (Free, Starter, Pro, Agency)
  - Stripe intégration (checkout, webhooks)
  - Renouvellement mensuel automatique

- **Campaigns**
  - Création et gestion de campagnes
  - Import CSV de prospects
  - Suivi du statut des prospects

- **Infrastructure**
  - Docker Compose pour l'environnement local
  - GitHub Actions CI/CD
  - Worker BullMQ pour les tâches asynchrones
  - PostgreSQL + Prisma
  - Redis pour les queues

### Fixed

- Rate limiting de base
- Protection SSRF pour les URLs
- Validation des entrées Zod

---

## Versions futures (Roadmap)

### [0.3.0] - Planned

- [ ] Storybook pour les composants
- [ ] Tests E2E avec Playwright
- [ ] Intégration CRM (HubSpot, Pipedrive)
- [ ] Métriques et monitoring avancé
- [ ] Cursor-based pagination
- [ ] Compression d'images côté worker

### [0.4.0] - Planned

- [ ] Export PDF des rapports
- [ ] Liens de partage publics
- [ ] Comparaison side-by-side des audits
- [ ] WebSockets pour notifications temps réel

---

## Comment contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines.

---

## Migrations de version

Pour les mises à jour depuis des versions précédentes, voir [MIGRATIONS.md](MIGRATIONS.md).

---

<p align="center">
  Generated with ❤️ by ScreenCold
</p>