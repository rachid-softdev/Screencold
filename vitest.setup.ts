import { vi } from "vitest";

// Mock pino (not installed, declared only for TypeScript)
vi.mock("pino", () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => mockLogger),
  };
  const pino = vi.fn(() => mockLogger);
  pino.destination = vi.fn();
  pino.transport = vi.fn();
  return { default: pino, pino };
});

// Provide a fallback DATABASE_URL for tests that touch Prisma
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/test?schema=public";
}
