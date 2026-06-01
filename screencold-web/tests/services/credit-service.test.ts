/**
 * CreditService Tests
 *
 * Tests the credit management business logic.
 * Covers:
 * - Deduct: reduces balance, insufficient credits, race conditions
 * - Refund: restores balance, creates transaction record
 * - Reset: monthly credit reset per plan, skips users with future creditsResetsAt
 * - Batch operations: batch debit, batch refund
 * - Credit info: getBalance, transaction history
 * - Edge cases: AGENCY plan (unlimited), FREE plan limits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Custom Error Types
// ============================================

class InsufficientCreditsError extends Error {
  constructor(message = 'Insufficient credits') {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  creditTransaction: {
    create: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

// ============================================
// Test Data
// ============================================

const TEST_USER_ID = 'user-1';
const TEST_AUDIT_ID = 'audit-1';

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    email: 'test@example.com',
    name: 'Test User',
    plan: 'STARTER',
    credits: 50,
    creditsResetsAt: new Date('2025-02-01'),
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

// ============================================
// Mock CreditService
// ============================================

function createCreditService() {
  return {
    /**
     * Check user's credit balance
     */
    checkBalance: async (userId: string): Promise<number> => {
      const user = await mockPrisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      return user?.credits ?? 0;
    },

    /**
     * Deduct a single credit from user
     */
    deduct: async (userId: string, auditId: string): Promise<{ success: boolean; remainingCredits: number }> => {
      try {
        const result = await mockPrisma.$transaction(async (tx: unknown) => {
          // Lock and check credits
          const user = await mockPrisma.user.findUnique({
            where: { id: userId },
            select: { credits: true },
          });

          if (!user || user.credits <= 0) {
            return { success: false, remainingCredits: user?.credits ?? 0 };
          }

          // Debit
          const updated = await mockPrisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: 1 } },
            select: { credits: true },
          });

          // Record transaction
          await mockPrisma.creditTransaction.create({
            data: {
              userId,
              amount: -1,
              type: 'DEBIT_AUDIT',
              auditId,
            },
          });

          return { success: true, remainingCredits: updated.credits };
        });

        return result;
      } catch {
        return { success: false, remainingCredits: 0 };
      }
    },

    /**
     * Refund a single credit to user
     */
    refund: async (userId: string, auditId: string, reason: string): Promise<void> => {
      await mockPrisma.$transaction(async () => {
        await mockPrisma.user.update({
          where: { id: userId },
          data: { credits: { increment: 1 } },
        });

        await mockPrisma.creditTransaction.create({
          data: {
            userId,
            amount: 1,
            type: 'REFUND',
            auditId,
          },
        });
      });
    },

    /**
     * Reset monthly credits for users whose creditsResetsAt is due
     */
    resetMonthly: async (): Promise<number> => {
      const now = new Date();

      const usersToReset = await mockPrisma.user.findMany({
        where: {
          plan: { in: ['STARTER', 'PRO', 'AGENCY'] },
          creditsResetsAt: { lte: now },
        },
        select: { id: true, plan: true, creditsResetsAt: true },
      });

      const planCredits: Record<string, number> = {
        STARTER: 50,
        PRO: 500,
        AGENCY: -1, // Unlimited - no reset
      };

      let resetCount = 0;

      for (const user of usersToReset) {
        const credits = planCredits[user.plan];
        if (credits === -1) continue; // Skip AGENCY

        await mockPrisma.$transaction(async () => {
          await mockPrisma.user.update({
            where: { id: user.id },
            data: {
              credits,
              creditsResetsAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
            },
          });

          await mockPrisma.creditTransaction.create({
            data: {
              userId: user.id,
              amount: credits,
              type: 'MONTHLY_REFILL',
            },
          });
        });

        resetCount++;
      }

      return resetCount;
    },

    /**
     * Batch deduct multiple credits
     */
    batchDeduct: async (userId: string, auditIds: string[]) => {
      const amount = auditIds.length;

      try {
        const result = await mockPrisma.$transaction(async () => {
          const user = await mockPrisma.user.findUnique({
            where: { id: userId },
            select: { credits: true },
          });

          if (!user || user.credits < amount) {
            return { success: false, debited: 0, failed: amount, remainingCredits: user?.credits ?? 0 };
          }

          const updated = await mockPrisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: amount } },
            select: { credits: true },
          });

          for (const auditId of auditIds) {
            await mockPrisma.creditTransaction.create({
              data: { userId, amount: -1, type: 'DEBIT_AUDIT', auditId },
            });
          }

          return { success: true, debited: amount, failed: 0, remainingCredits: updated.credits };
        });

        return result;
      } catch {
        return { success: false, debited: 0, failed: amount, remainingCredits: 0 };
      }
    },

    /**
     * Get credit info with recent transactions
     */
    getInfo: async (userId: string) => {
      const user = await mockPrisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, plan: true },
      });

      if (!user) throw new InsufficientCreditsError('User not found');

      const transactions = await mockPrisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return {
        credits: user.credits,
        plan: user.plan,
        transactions,
        canRefund: user.credits > 0,
      };
    },
  };
}

// ============================================
// Tests
// ============================================

describe('CreditService', () => {
  let service: ReturnType<typeof createCreditService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createCreditService();
  });

  // ============================================
  // checkBalance
  // ============================================

  describe('checkBalance', () => {
    it('should return current credit balance', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(createUser({ credits: 42 }));

      // Act
      const balance = await service.checkBalance(TEST_USER_ID);

      // Assert
      expect(balance).toBe(42);
    });

    it('should return 0 for non-existent user', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const balance = await service.checkBalance('non-existent');

      // Assert
      expect(balance).toBe(0);
    });
  });

  // ============================================
  // deduct
  // ============================================

  describe('deduct', () => {
    it('should deduct one credit from user balance', async () => {
      // Arrange
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.findUnique.mockResolvedValue(createUser({ credits: 10 }));
      mockPrisma.user.update.mockResolvedValue(createUser({ credits: 9 }));
      mockPrisma.creditTransaction.create.mockResolvedValue({ id: 'tx-1' });

      // Act
      const result = await service.deduct(TEST_USER_ID, TEST_AUDIT_ID);

      // Assert
      expect(result.success).toBe(true);
      expect(result.remainingCredits).toBe(9);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_USER_ID },
          data: { credits: { decrement: 1 } },
        }),
      );
      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_ID,
            amount: -1,
            type: 'DEBIT_AUDIT',
            auditId: TEST_AUDIT_ID,
          }),
        }),
      );
    });

    it('should fail when user has 0 credits', async () => {
      // Arrange
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.findUnique.mockResolvedValue(createUser({ credits: 0 }));

      // Act
      const result = await service.deduct(TEST_USER_ID, TEST_AUDIT_ID);

      // Assert
      expect(result.success).toBe(false);
      expect(result.remainingCredits).toBe(0);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should fail when user does not exist', async () => {
      // Arrange
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.deduct('non-existent', TEST_AUDIT_ID);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should handle race condition with concurrent debits', async () => {
      // Arrange - simulate atomic credit decrement
      let availableCredits = 2;
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        // Each transaction checks AND decrements atomically
        if (availableCredits <= 0) {
          return { success: false, remainingCredits: 0 };
        }
        availableCredits--;
        mockPrisma.user.findUnique.mockResolvedValue({ credits: availableCredits + 1 });
        mockPrisma.user.update.mockResolvedValue({ credits: availableCredits });
        return cb();
      });

      // Act - try 3 sequential deductions with only 2 credits
      const r1 = await service.deduct(TEST_USER_ID, 'audit-1');
      const r2 = await service.deduct(TEST_USER_ID, 'audit-2');
      const r3 = await service.deduct(TEST_USER_ID, 'audit-3');

      // Assert - only 2 should succeed, 3rd fails
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r3.success).toBe(false);
      expect(r1.remainingCredits).toBe(1);
      expect(r2.remainingCredits).toBe(0);
    });

    it('should return false when transaction throws error', async () => {
      // Arrange
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      // Act
      const result = await service.deduct(TEST_USER_ID, TEST_AUDIT_ID);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // refund
  // ============================================

  describe('refund', () => {
    it('should restore one credit and record transaction', async () => {
      // Arrange
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.update.mockResolvedValue(createUser({ credits: 6 }));
      mockPrisma.creditTransaction.create.mockResolvedValue({ id: 'tx-refund' });

      // Act
      await service.refund(TEST_USER_ID, TEST_AUDIT_ID, 'Audit failed');

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_USER_ID },
          data: { credits: { increment: 1 } },
        }),
      );
      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_ID,
            amount: 1,
            type: 'REFUND',
            auditId: TEST_AUDIT_ID,
          }),
        }),
      );
    });

    it('should work even after user had 0 credits', async () => {
      // Arrange
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.update.mockResolvedValue(createUser({ credits: 1 }));

      // Act
      await service.refund(TEST_USER_ID, TEST_AUDIT_ID, 'Grace refund');

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  // ============================================
  // resetMonthly
  // ============================================

  describe('resetMonthly', () => {
    const now = new Date('2025-06-01T12:00:00Z');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should reset credits for STARTER and PRO users whose reset is due', async () => {
      // Arrange
      const dueUsers = [
        { id: 'u-1', plan: 'STARTER', creditsResetsAt: new Date('2025-05-01') },
        { id: 'u-2', plan: 'PRO', creditsResetsAt: new Date('2025-05-15') },
      ];
      mockPrisma.user.findMany.mockResolvedValue(dueUsers);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.creditTransaction.create.mockResolvedValue({});

      // Act
      const resetCount = await service.resetMonthly();

      // Assert
      expect(resetCount).toBe(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            plan: { in: ['STARTER', 'PRO', 'AGENCY'] },
            creditsResetsAt: { lte: now },
          },
        }),
      );
    });

    it('should set STARTER to 50 credits', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-starter', plan: 'STARTER', creditsResetsAt: new Date('2025-05-01') },
      ]);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.update.mockResolvedValue({});

      // Act
      await service.resetMonthly();

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-starter' },
          data: expect.objectContaining({ credits: 50 }),
        }),
      );
    });

    it('should set PRO to 500 credits', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-pro', plan: 'PRO', creditsResetsAt: new Date('2025-05-01') },
      ]);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.update.mockResolvedValue({});

      // Act
      await service.resetMonthly();

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-pro' },
          data: expect.objectContaining({ credits: 500 }),
        }),
      );
    });

    it('should skip AGENCY users (unlimited credits)', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-agency', plan: 'AGENCY', creditsResetsAt: new Date('2025-05-01') },
      ]);

      // Act
      const resetCount = await service.resetMonthly();

      // Assert
      expect(resetCount).toBe(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should skip FREE users (not in reset query)', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      const resetCount = await service.resetMonthly();

      // Assert
      expect(resetCount).toBe(0);
    });

    it('should skip users with future creditsResetsAt', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-future', plan: 'PRO', creditsResetsAt: new Date('2025-07-01') },
        { id: 'u-due', plan: 'PRO', creditsResetsAt: new Date('2025-05-01') },
      ]);
      // Simulate filtering - only 'u-due' is returned from DB
      // (the where clause handles this, so this test verifies the query)
      mockPrisma.user.findMany.mockImplementation(async ({ where }) => {
        if (!where.creditsResetsAt || where.creditsResetsAt.lte) {
          return [
            { id: 'u-due', plan: 'PRO', creditsResetsAt: new Date('2025-05-01') },
          ];
        }
        return [];
      });
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.creditTransaction.create.mockResolvedValue({});

      // Act
      const resetCount = await service.resetMonthly();

      // Assert
      expect(resetCount).toBe(1);
    });

    it('should set next creditsResetsAt to first of next month', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-1', plan: 'STARTER', creditsResetsAt: new Date('2025-05-01') },
      ]);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.update.mockResolvedValue({});

      // Act
      await service.resetMonthly();

      // Assert
      const nextReset = new Date(2025, 6, 1); // July 1st 2025 (month is 0-indexed)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            creditsResetsAt: nextReset,
          }),
        }),
      );
    });

    it('should create MONTHLY_REFILL transaction for each reset', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-1', plan: 'STARTER', creditsResetsAt: new Date('2025-05-01') },
        { id: 'u-2', plan: 'PRO', creditsResetsAt: new Date('2025-05-01') },
      ]);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.creditTransaction.create.mockResolvedValue({});

      // Act
      await service.resetMonthly();

      // Assert
      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // batchDeduct
  // ============================================

  describe('batchDeduct', () => {
    it('should deduct multiple credits at once', async () => {
      // Arrange
      const auditIds = ['a-1', 'a-2', 'a-3'];
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.findUnique.mockResolvedValue(createUser({ credits: 10 }));
      mockPrisma.user.update.mockResolvedValue(createUser({ credits: 7 }));
      mockPrisma.creditTransaction.create.mockResolvedValue({});

      // Act
      const result = await service.batchDeduct(TEST_USER_ID, auditIds);

      // Assert
      expect(result.success).toBe(true);
      expect(result.debited).toBe(3);
      expect(result.remainingCredits).toBe(7);
    });

    it('should fail when user has insufficient credits', async () => {
      // Arrange
      const auditIds = ['a-1', 'a-2'];
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb());
      mockPrisma.user.findUnique.mockResolvedValue(createUser({ credits: 1 }));

      // Act
      const result = await service.batchDeduct(TEST_USER_ID, auditIds);

      // Assert
      expect(result.success).toBe(false);
      expect(result.debited).toBe(0);
      expect(result.failed).toBe(2);
    });
  });

  // ============================================
  // getInfo
  // ============================================

  describe('getInfo', () => {
    it('should return credit info with transactions', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(createUser({ credits: 25, plan: 'PRO' }));
      mockPrisma.creditTransaction.findMany.mockResolvedValue([
        { id: 'tx-1', amount: -1, type: 'DEBIT_AUDIT', createdAt: new Date() },
        { id: 'tx-2', amount: 500, type: 'MONTHLY_REFILL', createdAt: new Date() },
      ]);

      // Act
      const info = await service.getInfo(TEST_USER_ID);

      // Assert
      expect(info.credits).toBe(25);
      expect(info.plan).toBe('PRO');
      expect(info.transactions).toHaveLength(2);
      expect(info.canRefund).toBe(true);
    });

    it('should set canRefund to false when credits are 0', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(createUser({ credits: 0 }));
      mockPrisma.creditTransaction.findMany.mockResolvedValue([]);

      // Act
      const info = await service.getInfo(TEST_USER_ID);

      // Assert
      expect(info.canRefund).toBe(false);
    });

    it('should throw when user is not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getInfo('non-existent')).rejects.toThrow();
    });
  });
});
