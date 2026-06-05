import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

// ============================================
// GET /api/audits/[id] - Get audit details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { id } = await params;

    // Fetch audit with ownership check
    const audit = await prisma.audit.findUnique({
      where: { id },
      include: {
        prospect: {
          select: {
            id: true,
            url: true,
            companyName: true,
            contactName: true,
            contactEmail: true,
            notes: true,
            status: true,
            campaignId: true,
            campaign: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            plan: true,
          },
        },
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Audit non trouvé' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (audit.userId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n\'avez pas accès à cet audit' },
        { status: 403 }
      );
    }

    // Build SSE URL for real-time updates
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const sseUrl = `${baseUrl}/api/audits/${audit.id}/events`;

    return NextResponse.json({
      id: audit.id,
      status: audit.status,
      screenshotUrl: audit.screenshotUrl,
      annotatedUrl: audit.annotatedUrl,
      mobileUrl: audit.mobileUrl,
      issues: audit.issues,
      siteType: audit.siteType,
      overallScore: audit.overallScore,
      emailSubject: audit.emailSubject,
      emailBody: audit.emailBody,
      emailPs: audit.emailPs,
      errorMessage: audit.errorMessage,
      processingTime: audit.processingTime,
      createdAt: audit.createdAt,
      updatedAt: audit.updatedAt,
      sseUrl,
      prospect: {
        id: audit.prospect.id,
        url: audit.prospect.url,
        companyName: audit.prospect.companyName,
        contactName: audit.prospect.contactName,
        contactEmail: audit.prospect.contactEmail,
        notes: audit.prospect.notes,
        status: audit.prospect.status,
        campaignId: audit.prospect.campaignId,
        campaign: audit.prospect.campaign,
      },
    });
  } catch (error) {
    console.error('[Audit] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/audits/[id] - Update audit (email editing)
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { id } = await params;

    // Fetch and verify ownership
    const audit = await prisma.audit.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Audit non trouvé' },
        { status: 404 }
      );
    }

    if (audit.userId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n\'avez pas accès à cet audit' },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    const { emailSubject, emailBody, emailPs } = body;

    // Update only provided fields
    const updateData: Record<string, unknown> = {};
    if (emailSubject !== undefined) updateData.emailSubject = emailSubject;
    if (emailBody !== undefined) updateData.emailBody = emailBody;
    if (emailPs !== undefined) updateData.emailPs = emailPs;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'NO_UPDATE', message: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    const updated = await prisma.audit.update({
      where: { id },
      data: updateData,
      include: {
        prospect: {
          select: {
            id: true,
            url: true,
            companyName: true,
            contactName: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      emailSubject: updated.emailSubject,
      emailBody: updated.emailBody,
      emailPs: updated.emailPs,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('[Audit] PATCH error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/audits/[id] - Delete audit
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { id } = await params;

    // Fetch and verify ownership
    const audit = await prisma.audit.findUnique({
      where: { id },
      select: { id: true, userId: true, prospectId: true },
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Audit non trouvé' },
        { status: 404 }
      );
    }

    if (audit.userId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n\'avez pas accès à cet audit' },
        { status: 403 }
      );
    }

    // Delete audit (cascade will handle prospect cleanup if configured)
    await prisma.audit.delete({
      where: { id },
    });

    // Note: We don't delete the prospect here to keep campaign history intact
    // Prospect will be updated to remove auditId reference via onDelete: SetNull

    return NextResponse.json({
      success: true,
      message: 'Audit supprimé',
    });
  } catch (error) {
    console.error('[Audit] DELETE error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}