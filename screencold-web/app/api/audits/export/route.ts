import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';
import { canUseAPI } from '@/lib/plans';

// ============================================
// GET /api/audits/export - Export audits as CSV
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { authorized, userId, user, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId || !user) {
      return errorResponse!;
    }

    // Check if user has API access (or CSV export feature)
    const userPlan = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!userPlan || !canUseAPI(userPlan.plan)) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Export CSV non disponible pour votre plan' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const format = searchParams.get('format') || 'csv';

    // Build query
    const where: Record<string, unknown> = { userId };
    if (campaignId) {
      where.prospect = { campaignId };
    }

    const audits = await prisma.audit.findMany({
      where,
      include: {
        prospect: {
          select: {
            id: true,
            url: true,
            companyName: true,
            contactName: true,
            contactEmail: true,
            notes: true,
            campaignId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to 1000 records
    });

    if (format === 'json') {
      return NextResponse.json({
        audits: audits.map((audit) => ({
          id: audit.id,
          url: audit.prospect.url,
          companyName: audit.prospect.companyName,
          contactName: audit.prospect.contactName,
          contactEmail: audit.prospect.contactEmail,
          overallScore: audit.overallScore,
          siteType: audit.siteType,
          status: audit.status,
          createdAt: audit.createdAt,
        })),
      });
    }

    // Generate CSV
    const headers = [
      'ID',
      'URL',
      'Entreprise',
      'Contact Nom',
      'Contact Email',
      'Score',
      'Type de Site',
      'Statut',
      'Date de création',
      'Temps de traitement (ms)',
    ];

    const rows = audits.map((audit) => [
      audit.id,
      audit.prospect.url,
      audit.prospect.companyName || '',
      audit.prospect.contactName || '',
      audit.prospect.contactEmail || '',
      audit.overallScore?.toString() || '',
      audit.siteType || '',
      audit.status,
      new Date(audit.createdAt).toISOString(),
      audit.processingTime?.toString() || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Return CSV file
    const filename = `audits-${new Date().toISOString().split('T')[0]}.csv`;
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Export] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}