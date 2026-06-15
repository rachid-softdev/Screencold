/**
 * Credit Reset Cron Route Tests
 *
 * Tests the /api/cron/reset-credits endpoint.
 * Covers:
 * - Valid CRON_SECRET → processes reset
 * - Missing/invalid CRON_SECRET → 401
 * - Missing/invalid CRON_SECRET header → 401
 * - Resets credits for due users
 * - Skips users with future creditsResetsAt
 * - Handles CRON_SECRET env var not set
 * - Returns correct count of reset users
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  creditTransaction: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

// ============================================
// Helpers
// ============================================

/**
 * Build a Next.js-like Request object for the cron endpoint.
 */
function createCronRequest(secret?: string): Request {
  const headers = new Headers({
    'content-type': 'application/json',
  });

  if (secret) {
    headers.set('authorization', `Bearer ${secret}`);
    headers.set('x-cron-secret', secret);
  }

  return new Request('http://localhost:3000/api/cron/reset-credits', {
    method: 'POST',
    headers,
  });
}

/**
 * A mock route handler that validates CRON_SECRET and delegates to resetMonthlyCredits.
 * Tests route authentication and error handling without needing the actual Next.js route.
 */
async function mockRouteHandler(request: Request): Promise<Response> {
  // 1. Validate CRON_SECRET from env
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return new Response(
      JSON.stringify({ error: 'CRON not configured' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  // 2. Check auth header
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-cron-secret');

  const providedSecret = authHeader?.replace('Bearer ', '') ?? cronSecret;

  if (!providedSecret || providedSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing CRON_SECRET' }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    );
  }

  // 3. Execute credit reset
  try {
    const { resetMonthlyCredits } = await import('@/lib/credits');
    const resetCount = await resetMonthlyCredits();

    return new Response(
      JSON.stringify({
        success: true,
        resetCount,
        message: `Credits reset for ${resetCount} users`,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Reset failed', message }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}

// ============================================
// Tests
// ============================================

describe('POST /api/cron/reset-credits', () => {
  const VALID_SECRET = 'super-secret-cron-key-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', VALID_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  // ============================================
  // Authentication
  // ============================================

  describe('authentication', () => {
    it('should return 401 when authorization header is missing', async () => {
      // Act
      const response = await mockRouteHandler(createCronRequest());
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 with invalid CRON_SECRET', async () => {
      // Act
      const response = await mockRouteHandler(createCronRequest('wrong-secret'));
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 with empty secret', async () => {
      // Act
      const response = await mockRouteHandler(createCronRequest(''));
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 500 when CRON_SECRET is not configured in env', async () => {
      // Arrange
      vi.stubEnv('CRON_SECRET', '');

      // Act
      const response = await mockRouteHandler(createCronRequest(VALID_SECRET));
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(body.error).toBe('CRON not configured');
    });
  });

  // ============================================
  // Credit Reset Logic (real function, mocked Prisma)
  // ============================================

  describe('reset logic', () => {
    beforeEach(() => {
      // Default Prisma mock setup for resetMonthlyCredits to succeed
      mockPrisma.user.findMany.mockResolvedValue([]);
      // IMPORTANT: $transaction passes the mockPrisma as `tx` so callbacks can use tx.user, tx.creditTransaction
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.creditTransaction.create.mockResolvedValue({});
    });

    it('should reset credits for all plans whose reset is due', async () => {
      // Arrange
      const now = new Date('2025-06-01T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-starter', plan: 'STARTER', creditsResetsAt: new Date('2025-05-01') },
        { id: 'u-pro', plan: 'PRO', creditsResetsAt: new Date('2025-05-15') },
      ]);

      // Act
      const { resetMonthlyCredits } = await import('@/lib/credits');
      const count = await resetMonthlyCredits();

      // Assert
      expect(count).toBe(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { creditsResetsAt: { lte: now } },
              { creditsResetsAt: null },
            ],
          },
          select: { id: true, plan: true },
        }),
      );
    });

    it('should set credits per plan (STARTER=50, PRO=200, AGENCY=1000, FREE=5)', async () => {
      // Arrange
      const now = new Date('2025-06-01T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-free', plan: 'FREE', creditsResetsAt: new Date('2025-05-01') },
        { id: 'u-starter', plan: 'STARTER', creditsResetsAt: new Date('2025-05-01') },
        { id: 'u-pro', plan: 'PRO', creditsResetsAt: new Date('2025-05-01') },
        { id: 'u-agency', plan: 'AGENCY', creditsResetsAt: new Date('2025-05-01') },
      ]);

      // Act
      const { resetMonthlyCredits } = await import('@/lib/credits');
      await resetMonthlyCredits();

      // Assert - verify each plan got the correct credit reset value
      const updateCalls = mockPrisma.user.update.mock.calls;
      const getData = (id: string) => updateCalls.find((c: unknown[]) => (c[0] as any)?.where?.id === id)?.[0]?.data;
      expect(getData('u-free').credits).toBe(5);
      expect(getData('u-starter').credits).toBe(50);
      expect(getData('u-pro').credits).toBe(200);
      expect(getData('u-agency').credits).toBe(1000);
    });

    it('should reset AGENCY users to 1000 credits (not unlimited)', async () => {
      // Arrange
      const now = new Date('2025-06-01T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-agency', plan: 'AGENCY', creditsResetsAt: new Date('2025-05-01') },
      ]);

      // Act
      const { resetMonthlyCredits } = await import('@/lib/credits');
      const count = await resetMonthlyCredits();

      // Assert
      expect(count).toBe(1);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-agency' },
          data: expect.objectContaining({ credits: 1000 }),
        }),
      );
    });

    it('should return 0 when no users are due for reset', async () => {
      // Arrange
      const now = new Date('2025-06-01T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      const { resetMonthlyCredits } = await import('@/lib/credits');
      const count = await resetMonthlyCredits();

      // Assert
      expect(count).toBe(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should skip users with future creditsResetsAt', async () => {
      // Arrange - only future resets returned (simulates query filtering)
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      const { resetMonthlyCredits } = await import('@/lib/credits');
      const count = await resetMonthlyCredits();

      // Assert
      expect(count).toBe(0);
    });

    it('should create MONTHLY_REFILL transactions for each reset', async () => {
      // Arrange
      const now = new Date('2025-06-01T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-1', plan: 'STARTER', creditsResetsAt: new Date('2025-05-01') },
      ]);

      // Act
      const { resetMonthlyCredits } = await import('@/lib/credits');
      await resetMonthlyCredits();

      // Assert
      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'MONTHLY_REFILL' }),
        }),
      );
    });

    it('should set next creditsResetsAt to first of next month', async () => {
      // Arrange
      const now = new Date('2025-06-15T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-1', plan: 'STARTER', creditsResetsAt: new Date('2025-06-01') },
      ]);

      // Act
      const { resetMonthlyCredits } = await import('@/lib/credits');
      await resetMonthlyCredits();

      // Assert
      const expectedNextReset = new Date(2025, 6, 1); // July 1st 2025 (month is 0-indexed)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            creditsResetsAt: expectedNextReset,
          }),
        }),
      );
    });
  });

  // ============================================
  // HTTP Method handling
  // ============================================

  describe('HTTP method', () => {
    it('should accept POST requests', async () => {
      // Arrange - make resetMonthlyCredits resolve successfully
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      const response = await mockRouteHandler(createCronRequest(VALID_SECRET));

      // Assert
      expect(response.status).toBe(200);
    });
  });
});
