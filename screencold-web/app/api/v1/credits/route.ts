/**
 * API v1 - Credits Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ============================================
// Auth Middleware
// ============================================

async function authenticateApiRequest(request: NextRequest): Promise<{
  authorized: boolean;
  userId: string | null;
  errorResponse: NextResponse | null;
}> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      userId: null,
      errorResponse: NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'API key required' },
        { status: 401 }
      ),
    };
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey) {
    return {
      authorized: false,
      userId: null,
      errorResponse: NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'API key required' },
        { status: 401 }
      ),
    };
  }

  const crypto = await import('crypto');
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: {
      user: { select: { id: true, plan: true, credits: true, creditsResetsAt: true } },
    },
  });

  if (!keyRecord || !keyRecord.user) {
    return {
      authorized: false,
      userId: null,
      errorResponse: NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid API key' },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    userId: keyRecord.user.id,
    errorResponse: null,
  };
}

// ============================================
// GET /api/v1/credits
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await authenticateApiRequest(request);

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        plan: true,
        creditsResetsAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // Get credit transactions
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        type: true,
        createdAt: true,
      },
    });

    // Calculate usage stats
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const usedThisMonth = await prisma.creditTransaction.aggregate({
      where: {
        userId,
        createdAt: { gte: thisMonthStart },
        type: 'AUDIT_DEBIT',
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      data: {
        credits: user.credits,
        plan: user.plan,
        creditsResetsAt: user.creditsResetsAt,
        usedThisMonth: usedThisMonth._sum?.amount || 0,
        transactions: transactions.map((t) => ({
          id: t.id,
          amount: t.amount,
          type: t.type,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('[API v1/credits] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}