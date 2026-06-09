import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { apiMiddleware, verifyCsrfToken } from '@/middleware';
import {
  parsePaginationParams,
  paginatedResponse,
} from '@/lib/pagination';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ module: 'campaigns-api' });

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
    const { cursor, limit } = parsePaginationParams(searchParams);

    const baseInclude = {
      prospectsList: {
        select: {
          status: true,
        },
      },
    } as const;

    const toCampaignWithStats = (campaign: {
      id: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
      prospectsList: Array<{ status: string }>;
    }): CampaignWithStats => {
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
    };

    if (cursor) {
      // Cursor-based pagination
      const campaigns = await prisma.campaign.findMany({
        where: { userId },
        include: baseInclude,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        cursor: { id: cursor },
        skip: 1,
      });

      const { data, pagination } = paginatedResponse(campaigns, limit);

      return NextResponse.json({
        data: data.map(toCampaignWithStats),
        pagination,
      });
    }

    // Legacy offset-based pagination (backward compatibility)
    const page = parseInt(searchParams.get('page') || '1', 10);

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: baseInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.campaign.count({ where: { userId } });

    return NextResponse.json({
      campaigns: campaigns.map(toCampaignWithStats),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, 'GET error');
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

    if (!await verifyCsrfToken(request)) {
      return NextResponse.json(
        { error: 'CSRF_TOKEN_INVALID', message: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
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

    logger.info({ campaignId: campaign.id, name, userId }, 'Campaign created');

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
    logger.error({ error }, 'POST error');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}