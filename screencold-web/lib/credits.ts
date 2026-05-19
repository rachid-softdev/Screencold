import prisma from '@/lib/prisma';
import { CreditTransaction, Plan } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface CreditInfo {
  credits: number;
  plan: Plan;
  transactions: CreditTransaction[];
  canRefund: boolean;
}

export interface DebitResult {
  success: boolean;
  remainingCredits: number;
  error?: 'INSUFFICIENT_CREDITS' | 'TRANSACTION_FAILED';
}

// ============================================
// Core Functions
// ============================================

/**
 * Get user's current credit balance
 */
export async function checkCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  return user?.credits ?? 0;
}

/**
 * Atomically debit 1 credit from user account
 * Uses transaction to prevent race conditions
 */
export async function debitCredits(
  userId: string,
  auditId: string
): Promise<boolean> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the user row and check credits
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits <= 0) {
        return { success: false, remainingCredits: user?.credits ?? 0 };
      }

      // Debit credits
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } },
        select: { credits: true },
      });

      // Record the transaction
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -1,
          type: 'DEBIT_AUDIT',
          auditId,
        },
      });

      return { success: true, remainingCredits: updatedUser.credits };
    });

    return result.success;
  } catch (error) {
    console.error('[Credits] Debit failed:', error);
    return false;
  }
}

/**
 * Refund 1 credit to user account
 * Used when audit fails or user cancels
 */
export async function refundCredits(
  userId: string,
  auditId: string,
  reason: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Increment credits
    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: 1 } },
    });

    // Record the refund transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: 1,
        type: 'REFUND',
        auditId,
      },
    });

    console.log(`[Credits] Refund issued: user=${userId}, audit=${auditId}, reason=${reason}`);
  });
}

/**
 * Add credits to user account (plan upgrade, bonus, monthly refill)
 */
export async function refillCredits(
  userId: string,
  amount: number,
  type: 'PURCHASE' | 'MONTHLY_REFILL' | 'BONUS' | 'PROMO' | 'ADMIN_ADJUSTMENT'
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
      },
    });

    console.log(`[Credits] Refill: user=${userId}, amount=${amount}, type=${type}`);
  });
}

/**
 * Get comprehensive credit info for a user
 */
export async function getCreditInfo(userId: string): Promise<CreditInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      plan: true,
    },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const transactions = await prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50, // Last 50 transactions
  });

  return {
    credits: user.credits,
    plan: user.plan,
    transactions,
    canRefund: user.credits > 0,
  };
}

// ============================================
// Batch Operations
// ============================================

export interface BatchDebitResult {
  success: boolean;
  debited: number;
  failed: number;
  remainingCredits: number;
}

/**
 * Debit multiple credits atomically (for batch campaigns)
 */
export async function batchDebitCredits(
  userId: string,
  auditIds: string[]
): Promise<BatchDebitResult> {
  const amount = auditIds.length;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < amount) {
        return {
          success: false,
          debited: 0,
          failed: amount,
          remainingCredits: user?.credits ?? 0,
        };
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
        select: { credits: true },
      });

      // Create transaction records for each audit
      await Promise.all(
        auditIds.map((auditId) =>
          tx.creditTransaction.create({
            data: {
              userId,
              amount: -1,
              type: 'DEBIT_AUDIT',
              auditId,
            },
          })
        )
      );

      return {
        success: true,
        debited: amount,
        failed: 0,
        remainingCredits: updatedUser.credits,
      };
    });

    return result;
  } catch (error) {
    console.error('[Credits] Batch debit failed:', error);
    return {
      success: false,
      debited: 0,
      failed: amount,
      remainingCredits: 0,
    };
  }
}

/**
 * Refund multiple credits (when batch fails)
 */
export async function batchRefundCredits(
  userId: string,
  auditIds: string[],
  reason: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: auditIds.length } },
    });

    await Promise.all(
      auditIds.map((auditId) =>
        tx.creditTransaction.create({
          data: {
            userId,
            amount: 1,
            type: 'REFUND',
            auditId,
          },
        })
      )
    );

    console.log(`[Credits] Batch refund: user=${userId}, count=${auditIds.length}, reason=${reason}`);
  });
}

// ============================================
// Credit Reset (Monthly)
// ============================================

/**
 * Reset credits for users with monthly plans
 * Should be called by a cron job or Stripe webhook
 */
export async function resetMonthlyCredits(): Promise<number> {
  const now = new Date();

  // Find users whose credits should be reset
  const usersToReset = await prisma.user.findMany({
    where: {
      plan: { in: ['STARTER', 'PRO', 'AGENCY'] },
      creditsResetsAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      plan: true,
      creditsResetsAt: true,
    },
  });

  // Calculate credits based on plan
  const planCredits: Record<string, number> = {
    STARTER: 50,
    PRO: 500,
    AGENCY: -1, // Unlimited
  };

  let resetCount = 0;

  await Promise.all(
    usersToReset.map(async (user) => {
      const credits = planCredits[user.plan];
      if (credits === -1) return; // No reset for unlimited

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            credits,
            creditsResetsAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        });

        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: credits,
            type: 'MONTHLY_REFILL',
          },
        });

        resetCount++;
      });
    })
  );

  console.log(`[Credits] Monthly reset completed: ${resetCount} users`);
  return resetCount;
}

// ============================================
// Helpers
// ============================================

/**
 * Check if user can afford a certain number of credits
 */
export async function canAffordCredits(userId: string, amount: number): Promise<boolean> {
  const credits = await checkCredits(userId);
  return credits >= amount;
}

/**
 * Get credit usage statistics for a user
 */
export async function getCreditStats(userId: string): Promise<{
  totalUsed: number;
  totalRefunded: number;
  netUsed: number;
  thisMonth: number;
}> {
  const transactions = await prisma.creditTransaction.findMany({
    where: { userId },
  });

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  let totalUsed = 0;
  let totalRefunded = 0;
  let thisMonth = 0;

  for (const tx of transactions) {
    if (tx.amount < 0) {
      totalUsed += Math.abs(tx.amount);
      if (tx.createdAt >= thisMonthStart) {
        thisMonth += Math.abs(tx.amount);
      }
    } else {
      totalRefunded += tx.amount;
    }
  }

  return {
    totalUsed,
    totalRefunded,
    netUsed: totalUsed - totalRefunded,
    thisMonth,
  };
}