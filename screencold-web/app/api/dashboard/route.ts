import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import {
  parsePaginationParams,
  paginatedResponse,
} from '@/lib/pagination';

// Cache control for client-side fallback - 30 seconds stale-while-revalidate
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const userId = token.id as string;

    // Get user with credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        credits: true,
        creditsResetsAt: true,
        createdAt: true,
        integrations: {
          where: { type: 'GMAIL' },
          select: { id: true, status: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Get stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // This month's audits
    const thisMonthAudits = await prisma.audit.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });

    // Last month's audits (for comparison)
    const lastMonthAudits = await prisma.audit.count({
      where: {
        userId,
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Total audits
    const totalAudits = await prisma.audit.count({
      where: { userId },
    });

    // Recent audits with optional cursor-based pagination
    const { searchParams } = new URL(request.url);
    const recentCursor = searchParams.get('recentCursor');
    const recentLimitParam = parseInt(searchParams.get('recentLimit') || '10', 10);
    const recentLimit = Math.min(Math.max(recentLimitParam, 1), 100);

    const auditInclude = {
      prospect: {
        select: {
          id: true,
          url: true,
          companyName: true,
          contactName: true,
          status: true,
        },
      },
    };

    const mapRecentAudit = (audit: {
      id: string;
      status: string;
      overallScore: number | null;
      screenshotUrl: string | null;
      createdAt: Date;
      prospect: Record<string, unknown>;
    }) => ({
      id: audit.id,
      status: audit.status,
      overallScore: audit.overallScore,
      screenshotUrl: audit.screenshotUrl,
      createdAt: audit.createdAt,
      prospect: audit.prospect,
    });

    let recentAudits;
    let recentPagination: Record<string, unknown> | undefined;

    if (recentCursor) {
      recentAudits = await prisma.audit.findMany({
        where: { userId },
        include: auditInclude,
        orderBy: { createdAt: 'desc' },
        take: recentLimit + 1,
        cursor: { id: recentCursor },
        skip: 1,
      });

      const result = paginatedResponse(recentAudits, recentLimit);
      recentAudits = result.data;
      recentPagination = result.pagination as unknown as Record<string, unknown>;
    } else {
      recentAudits = await prisma.audit.findMany({
        where: { userId },
        include: auditInclude,
        orderBy: { createdAt: 'desc' },
        take: recentLimit,
      });
    }

    // Credits used this month
    const creditsUsed = await prisma.creditTransaction.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
        type: 'audit',
      },
      _sum: {
        amount: true,
      },
    });

    // Check if Gmail is connected
    const gmailIntegration = user.integrations?.[0];
    const gmailConnected = gmailIntegration?.status === 'ACTIVE';

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        credits: user.credits,
        creditsResetsAt: user.creditsResetsAt,
        memberSince: user.createdAt,
        gmailConnected,
      },
      stats: {
        thisMonthAudits,
        lastMonthAudits,
        totalAudits,
        auditsChange: lastMonthAudits > 0 
          ? Math.round(((thisMonthAudits - lastMonthAudits) / lastMonthAudits) * 100) 
          : 0,
        creditsUsed: creditsUsed._sum.amount || 0,
      },
      recentAudits: recentAudits.map(mapRecentAudit),
      recentPagination,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}