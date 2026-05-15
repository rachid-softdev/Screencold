# Contributing to ScreenCold

Thank you for your interest in contributing to ScreenCold! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/screencold/screencold.git
cd screencold
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Initialize database:
```bash
pnpm db:generate
pnpm db:push
```

5. Start development services:
```bash
pnpm docker:up
```

6. Run development server:
```bash
pnpm dev
```

## Development Workflow

### Code Style

- **TypeScript**: Strict mode enabled, no `any` allowed
- **ESLint**: Configured for Next.js and strict rules
- **Prettier**: Auto-formatted on save
- **Testing**: Vitest for unit tests, Playwright for E2E

### Git Workflow

1. Create a feature branch from `main`:
```bash
git checkout -b feature/your-feature
```

2. Make your changes following our conventions

3. Add tests for new functionality

4. Commit using conventional commits:
```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update documentation"
```

5. Push and create a Pull Request

### Pull Request Guidelines

All CI checks must pass before merging:
- ✅ Lint passes (`pnpm lint`)
- ✅ TypeScript compiles (`pnpm typecheck`)
- ✅ Tests pass (`pnpm test`)
- ✅ Build succeeds (`pnpm build`)

## Project Structure

```
screencold/
├── apps/
│   ├── web/              # Next.js frontend
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities
│   └── worker/           # BullMQ worker
│       ├── jobs/         # Job processors
│       └── services/     # External services
├── packages/
│   ├── db/               # Prisma schema
│   └── types/            # Shared types
└── tests/                # Test files
```

## Testing

### Unit Tests
```bash
pnpm test
```

### Watch Mode
```bash
pnpm test:watch
```

### E2E Tests
```bash
# Install Playwright browsers first
npx playwright install

# Run E2E tests
npx playwright test
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint code |
| `pnpm typecheck` | TypeScript check |
| `pnpm format` | Format code |
| `pnpm db:studio` | Open Prisma Studio |

## Troubleshooting

### Database Issues
```bash
# Reset database
pnpm db:push --force
pnpm db:seed
```

### Redis Issues
```bash
# Clear Redis cache
docker compose exec redis redis-cli FLUSHALL
```

## Questions?

- Discord: [Join our server](https://discord.gg/screencold)
- Email: support@screencold.com

We appreciate your contributions! 🚀