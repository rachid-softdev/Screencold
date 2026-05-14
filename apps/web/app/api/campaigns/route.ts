import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

// ============================================
// Types
// ============================================

interface CampaignWithStats {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  stats: {
    total: number;
    pending: number;
    processing: number;
    done: number;
    failed: number;
  };
}

// ============================================
// Validation Schema
// ============================================

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
});

// ============================================
// GET /api/campaigns - List campaigns with stats
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

    // Fetch campaigns with prospect stats
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: {
        prospectsList: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Count total for pagination
    const total = await prisma.campaign.count({ where: { userId } });

    // Transform to include stats
    const campaignsWithStats: CampaignWithStats[] = campaigns.map((campaign) => {
      const stats = {
        total: campaign.prospectsList.length,
        pending: campaign.prospectsList.filter((p) => p.status === 'PENDING').length,
        processing: campaign.prospectsList.filter((p) => p.status === 'PROCESSING').length,
        done: campaign.prospectsList.filter((p) => p.status === 'DONE').length,
        failed: campaign.prospectsList.filter((p) => p.status === 'FAILED').length,
      };

      return {
        id: campaign.id,
        name: campaign.name,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        stats,
      };
    });

    return NextResponse.json({
      campaigns: campaignsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Campaigns] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/campaigns - Create new campaign
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = createCampaignSchema.safeParse(body);

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

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name,
        userId,
      },
    });

    console.log(`[Campaign] Created: id=${campaign.id}, name=${name}, userId=${userId}`);

    return NextResponse.json(
      {
        id: campaign.id,
        name: campaign.name,
        createdAt: campaign.createdAt,
        stats: {
          total: 0,
          pending: 0,
          processing: 0,
          done: 0,
          failed: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Campaigns] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}