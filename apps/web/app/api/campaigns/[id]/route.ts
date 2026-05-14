import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

// ============================================
// Validation Schema
// ============================================

const updateCampaignSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
});

// ============================================
// GET /api/campaigns/[id] - Get campaign with all prospects
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

    // Fetch campaign with ownership check
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        prospectsList: {
          include: {
            audit: {
              select: {
                id: true,
                status: true,
                screenshotUrl: true,
                annotatedUrl: true,
                overallScore: true,
                emailSubject: true,
                processingTime: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Campagne non trouvée' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (campaign.userId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n\'avez pas accès à cette campagne' },
        { status: 403 }
      );
    }

    // Calculate stats
    const stats = {
      total: campaign.prospectsList.length,
      pending: campaign.prospectsList.filter((p) => p.status === 'PENDING').length,
      processing: campaign.prospectsList.filter((p) => p.status === 'PROCESSING').length,
      done: campaign.prospectsList.filter((p) => p.status === 'DONE').length,
      failed: campaign.prospectsList.filter((p) => p.status === 'FAILED').length,
    };

    // Transform prospects
    const prospects = campaign.prospectsList.map((prospect) => ({
      id: prospect.id,
      url: prospect.url,
      companyName: prospect.companyName,
      contactName: prospect.contactName,
      contactEmail: prospect.contactEmail,
      notes: prospect.notes,
      status: prospect.status,
      createdAt: prospect.createdAt,
      audit: prospect.audit ? {
        id: prospect.audit.id,
        status: prospect.audit.status,
        screenshotUrl: prospect.audit.screenshotUrl,
        annotatedUrl: prospect.audit.annotatedUrl,
        overallScore: prospect.audit.overallScore,
        emailSubject: prospect.audit.emailSubject,
        processingTime: prospect.audit.processingTime,
        createdAt: prospect.audit.createdAt,
      } : null,
    }));

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      stats,
      prospects,
    });
  } catch (error) {
    console.error('[Campaign] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/campaigns/[id] - Update campaign name
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

    // Verify campaign exists and ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true, userId: true, name: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Campagne non trouvée' },
        { status: 404 }
      );
    }

    if (campaign.userId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n\'avez pas accès à cette campagne' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = updateCampaignSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;

    // Update campaign
    const updated = await prisma.campaign.update({
      where: { id },
      data: { name },
    });

    console.log(`[Campaign] Updated: id=${id}, name=${name}`);

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('[Campaign] PATCH error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/campaigns/[id] - Delete campaign and all prospects
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

    // Verify campaign exists and ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Campagne non trouvée' },
        { status: 404 }
      );
    }

    if (campaign.userId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n\'avez pas accès à cette campagne' },
        { status: 403 }
      );
    }

    // Delete campaign (cascades to prospects, which cascades to audits)
    await prisma.campaign.delete({
      where: { id },
    });

    console.log(`[Campaign] Deleted: id=${id}, userId=${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Campagne supprimée',
    });
  } catch (error) {
    console.error('[Campaign] DELETE error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}