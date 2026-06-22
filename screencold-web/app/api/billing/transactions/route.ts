import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

// ============================================
// GET /api/billing/transactions - Get billing history
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.creditTransaction.count({ where: { userId } }),
    ]);

    // Format transactions for display
    const formattedTransactions = transactions.map((t) => {
      let description = '';
      let typeLabel = '';

      switch (t.type) {
        case 'PURCHASE':
          description = 'Achat de crédits';
          typeLabel = 'Crédit';
          break;
        case 'RESET':
          description = 'Renouvellement mensuel';
          typeLabel = 'Crédit';
          break;
        case 'AUDIT_DEBIT':
          description = 'Audit de site';
          typeLabel = 'Débit';
          break;
        case 'REFUND':
          description = 'Remboursement audit';
          typeLabel = 'Crédit';
          break;
        default:
          description = t.type;
          typeLabel = t.amount > 0 ? 'Crédit' : 'Débit';
      }

      return {
        id: t.id,
        date: t.createdAt,
        description,
        type: typeLabel,
        amount: t.amount,
      };
    });

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Transactions] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}