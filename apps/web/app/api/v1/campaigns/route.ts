/**
 * API v1 - Campaigns Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  prospects: z.array(z.object({
    url: z.string().url(),
    companyName: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional(),
  })).min(1).max(100),
});

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
      user: { select: { id: true, plan: true, credits: true } },
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
// GET /api/v1/campaigns
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await authenticateApiRequest(request);

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    let campaigns;

    if (cursor) {
      campaigns = await prisma.campaign.findMany({
        where: { userId, id: { lt: cursor } },
        include: {
          prospectsList: {
            select: {
              id: true,
              url: true,
              companyName: true,
              contactName: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      });

      const hasMore = campaigns.length > limit;
      const items = hasMore ? campaigns.slice(0, -1) : campaigns;

      return NextResponse.json({
        data: items.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          prospectCount: campaign.prospectsList.length,
          prospects: campaign.prospectsList,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        })),
        pagination: {
          cursor: hasMore ? items[items.length - 1].id : null,
          hasMore,
          limit,
        },
      });
    } else {
      campaigns = await prisma.campaign.findMany({
        where: { userId },
        include: {
          prospectsList: {
            select: {
              id: true,
              url: true,
              companyName: true,
              contactName: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({
        data: campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          prospectCount: campaign.prospectsList.length,
          prospects: campaign.prospectsList,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        })),
        pagination: { limit, count: campaigns.length },
      });
    }
  } catch (error) {
    console.error('[API v1/campaigns] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/v1/campaigns
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await authenticateApiRequest(request);

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const body = await request.json();
    const validationResult = createCampaignSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, prospects } = validationResult.data;

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name,
        userId,
      },
    });

    // Create prospects
    const createdProspects = await prisma.prospect.createManyAndReturn({
      data: prospects.map((prospect) => ({
        url: prospect.url,
        companyName: prospect.companyName || null,
        contactName: prospect.contactName || null,
        contactEmail: prospect.contactEmail || null,
        campaignId: campaign.id,
        status: 'PENDING',
      })),
    });

    return NextResponse.json(
      {
        data: {
          id: campaign.id,
          name: campaign.name,
          prospectCount: createdProspects.length,
          prospects: createdProspects,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API v1/campaigns] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}