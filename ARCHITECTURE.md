# Architecture Overview

## System Design

### Components

ScreenCold is built as a monorepo using Turborepo with the following main components:

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Web App                      │
│  (Authentication, Dashboard, UI, API Routes)            │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
    ┌──────────┐          ┌──────────────┐
    │ PostgreSQL│          │    Redis     │
    │  (Data)   │          │ (Queue/Cache)│
    └──────────┘          └──────────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │ BullMQ Worker  │
                        │ - Playwright   │
                        │ - Claude AI    │
                        │ - S3 Upload    │
                        └────────────────┘
```

### Architecture Layers

1. **Presentation Layer** (Next.js App Router)
   - Landing pages (marketing)
   - Dashboard (authenticated)
   - Settings & Billing

2. **API Layer** (Next.js API Routes)
   - RESTful endpoints
   - Authentication (NextAuth.js)
   - Rate limiting (Redis)

3. **Worker Layer** (BullMQ + Node.js)
   - Async job processing
   - Screenshot capture (Playwright)
   - AI analysis (Claude Vision)
   - Email generation

4. **Data Layer** (PostgreSQL + Prisma)
   - User management
   - Audit storage
   - Campaign tracking

### Data Flow

#### Audit Creation Flow
```
1. User submits URL via dashboard
2. API validates input + checks credits
3. Creates Audit + Prospect in DB
4. Enqueues job to BullMQ
5. Worker picks up job:
   a. Playwright captures screenshots
   b. Claude analyzes screenshots
   c. Results stored in DB
6. User polls for completion
```

#### Email Sequence Flow
```
1. User creates campaign with prospects
2. Launches campaign
3. For each prospect:
   a. Create audit job
   b. Wait for audit completion
   c. Generate personalized email
   d. Send via Resend
```

## Key Decisions

### Authentication
- **NextAuth.js** with JWT strategy
- Session stored in cookie (no DB session)
- OAuth (Google) + Credentials (email/password)

### Database
- **Prisma ORM** for type-safe queries
- PostgreSQL for relational data
- Optimistic pagination (cursor-based)

### Queue System
- **BullMQ** with Redis backend
- Separate queues: audit, email, campaign
- Dead Letter Queue for failed jobs
- Exponential backoff retry

### AI Integration
- **Anthropic Claude** for analysis
- Vision API for screenshot analysis
- Structured JSON output for issues

### Rate Limiting
- Redis-based distributed limiting
- Per-IP for public endpoints
- Per-user for authenticated endpoints

## Infrastructure

### Development
- Docker Compose (PostgreSQL, Redis)
- pnpm workspaces
- Turborepo for caching

### Production Ready
- Health checks (/health/liveness, /health/readiness)
- Structured logging (Pino)
- Error tracking (Sentry)
- APM instrumentation

## Security

- CSRF protection
- Rate limiting
- Input validation (Zod)
- SSRF protection (block private IPs)
- API key hashing
- Security headers (CSP, HSTS, etc.)

## Performance

- Screenshot caching (S3)
- Database query optimization
- Cursor-based pagination
- Concurrent job processing
- Redis caching

## Monitoring

- Health checks for all services
- Metrics collection
- Error tracking
- Request tracing
- Audit logging