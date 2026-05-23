/**
 * Test setup and utilities
 */

import { beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

// Test database URL
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgresql://postgres:password@localhost:5432/screencold_test";

// Global prisma client for tests
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
});

// Clean database before all tests
export async function cleanupDatabase() {
  // Delete in order to respect foreign keys
  await prisma.auditEvent.deleteMany();
  await prisma.sentEmail.deleteMany();
  await prisma.creditTransaction.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.teamInvitation.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.prospect.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.integrationToken.deleteMany().catch(() => {}); // May not exist
  await prisma.webhookDelivery.deleteMany().catch(() => {});
  await prisma.webhook.deleteMany().catch(() => {});
  await prisma.sequenceEnrollment.deleteMany().catch(() => {});
  await prisma.sequenceStep.deleteMany().catch(() => {});
  await prisma.emailSequence.deleteMany().catch(() => {});
  await prisma.user.deleteMany();
}

// Create test user
export async function createTestUser(overrides = {}) {
  return await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
      plan: "FREE",
      credits: 5,
      ...overrides,
    },
  });
}

// Create test campaign
export async function createTestCampaign(userId: string, overrides = {}) {
  return await prisma.campaign.create({
    data: {
      name: "Test Campaign",
      userId,
      ...overrides,
    },
  });
}

// Create test prospect
export async function createTestProspect(campaignId: string, overrides = {}) {
  return await prisma.prospect.create({
    data: {
      url: "https://example.com",
      campaignId,
      status: "PENDING",
      ...overrides,
    },
  });
}

// Create test audit
export async function createTestAudit(prospectId: string, userId: string, overrides = {}) {
  return await prisma.audit.create({
    data: {
      prospectId,
      userId,
      status: "PROCESSING",
      ...overrides,
    },
  });
}

// Mock JWT token for testing
export function createMockToken(userId: string, plan = "FREE", credits = 5) {
  return {
    sub: userId,
    id: userId,
    email: "test@example.com",
    name: "Test User",
    plan,
    credits,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

// Mock request with auth
export function createMockRequest(overrides = {}) {
  return {
    headers: {
      get: (key: string) => {
        const headers: Record<string, string> = {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.1",
          ...overrides.headers,
        };
        return headers[key] || null;
      },
    },
    json: async () => overrides.body || {},
    nextUrl: {
      searchParams: new URLSearchParams(overrides.searchParams || ""),
    },
    method: overrides.method || "GET",
    ...overrides,
  };
}

// Setup global mocks
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = "test";
  process.env.NEXTAUTH_SECRET = "test-secret-for-testing";
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  // Mock rate limiting to always allow
  vi.mock("@/lib/rate-limit", () => ({
    checkIpRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 30,
      resetAt: Date.now() + 60000,
    }),
  }));

  // Mock next-auth/jwt
  vi.mock("next-auth/jwt", () => ({
    getToken: vi.fn().mockResolvedValue(createMockToken("test-user-id")),
  }));
});

afterAll(async () => {
  // Cleanup
  await cleanupDatabase().catch(console.error);
  await prisma.$disconnect().catch(console.error);
});
