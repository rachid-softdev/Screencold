/**
 * API v1 - Audits Endpoint
 * Public API for Pro/Agency plans with API key authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '@/lib/prisma';
import { checkCredits, debitCredits } from '@/lib/credits';
import { checkApiKeyRateLimit } from '@/lib/rate-limit';
import { canUseAPI } from '@/lib/plans';
import {
  parsePaginationParams,
  paginatedResponse,
} from '@/lib/pagination';
import { getCorrelationId } from '@/lib/correlation-id';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ module: 'v1-audits-api' });

// ============================================
// Validation Schemas
// ============================================

const createAuditSchema = z.object({
  url: z.string().url('URL invalide'),
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

// ============================================
// Redis & Queue Setup
// ============================================

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

function getAuditQueue(): Queue {
  const connection = getRedisConnection();
  return new Queue('audit-processing', { connection });
}

// ============================================
// Auth Middleware for API v1
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

  // Find API key in database (hashed)
  const crypto = await import('crypto');
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: {
      user: {
        select: {
          id: true,
          plan: true,
          credits: true,
        },
      },
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

  // Check if user plan allows API access
  if (!canUseAPI(keyRecord.user.plan)) {
    return {
      authorized: false,
      userId: null,
      errorResponse: NextResponse.json(
        { error: 'PLAN_REQUIRED', message: 'API access requires Pro or Agency plan' },
        { status: 403 }
      ),
    };
  }

  // Check rate limit for this API key
  const rateLimitResult = await checkApiKeyRateLimit(keyRecord.id, keyRecord.rateLimit, 60);

  if (!rateLimitResult.allowed) {
    return {
      authorized: false,
      userId: null,
      errorResponse: NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Rate limit exceeded',
          retryAfter: rateLimitResult.resetAt - Math.ceil(Date.now() / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.resetAt - Math.ceil(Date.now() / 1000)),
            'X-RateLimit-Limit': String(keyRecord.rateLimit),
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    };
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    authorized: true,
    userId: keyRecord.user.id,
    errorResponse: null,
  };
}

// ============================================
// GET /api/v1/audits - List audits
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await authenticateApiRequest(request);

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { searchParams } = new URL(request.url);
    const { cursor, limit } = parsePaginationParams(searchParams);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status;
    }

    const baseInclude = {
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

    const mapAudit = (audit: {
      id: string;
      status: string;
      siteType: string | null;
      overallScore: number | null;
      emailSubject: string | null;
      emailBody: string | null;
      emailPs: string | null;
      createdAt: Date;
      screenshotUrl: string | null;
      annotatedUrl: string | null;
      prospect: Record<string, unknown>;
    }) => ({
      id: audit.id,
      status: audit.status,
      siteType: audit.siteType,
      overallScore: audit.overallScore,
      emailSubject: audit.emailSubject,
      emailBody: audit.emailBody,
      emailPs: audit.emailPs,
      createdAt: audit.createdAt,
      prospect: audit.prospect,
      screenshotUrl: audit.screenshotUrl,
      annotatedUrl: audit.annotatedUrl,
    });

    if (cursor) {
      // Cursor-based pagination
      const audits = await prisma.audit.findMany({
        where,
        include: baseInclude,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        cursor: { id: cursor },
        skip: 1,
      });

      const { data, pagination } = paginatedResponse(audits, limit);

      return NextResponse.json({
        data: data.map(mapAudit),
        pagination,
      });
    }

    // Offset-based pagination (backward compat)
    const audits = await prisma.audit.findMany({
      where,
      include: baseInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      data: audits.map(mapAudit),
      pagination: {
        limit,
        count: audits.length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'GET error');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/v1/audits - Create audit
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await authenticateApiRequest(request);

    if (!authorized || !userId) {
      return errorResponse!;
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = createAuditSchema.safeParse(body);

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

    const { url, companyName, contactName, contactEmail, notes } = validationResult.data;

    // Validate URL (basic SSRF protection)
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      const blockedPatterns = [
        /^localhost$/i,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^0\./,
        /^::1$/,
        /^fc00:/,
        /^fe80:/,
        /^169\.254\.169\.254/,
        /\.internal$/,
      ];

      for (const pattern of blockedPatterns) {
        if (pattern.test(hostname)) {
          return NextResponse.json(
            { error: 'INVALID_URL', message: 'URL is not accessible' },
            { status: 400 }
          );
        }
      }

      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return NextResponse.json(
          { error: 'INVALID_URL', message: 'Only HTTP and HTTPS protocols allowed' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'INVALID_URL', message: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check credits
    const currentCredits = await checkCredits(userId);

    if (currentCredits <= 0) {
      return NextResponse.json(
        {
          error: 'NO_CREDITS',
          message: 'No credits remaining',
          currentCredits: 0,
        },
        { status: 402 }
      );
    }

    // Create campaign for this audit
    const campaign = await prisma.campaign.create({
      data: {
        name: `API Audit - ${new Date().toISOString().split('T')[0]}`,
        userId,
      },
    });

    // Create prospect
    const prospect = await prisma.prospect.create({
      data: {
        url,
        companyName: companyName || null,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        notes: notes || null,
        campaignId: campaign.id,
        status: 'PENDING',
      },
    });

    // Create audit
    const audit = await prisma.audit.create({
      data: {
        prospectId: prospect.id,
        userId,
        status: 'PROCESSING',
      },
    });

    // Debit credits
    const debited = await debitCredits(userId, audit.id);

    if (!debited) {
      await prisma.audit.delete({ where: { id: audit.id } });
      await prisma.prospect.delete({ where: { id: prospect.id } });
      await prisma.campaign.delete({ where: { id: campaign.id } });

      return NextResponse.json(
        { error: 'CREDIT_DEBIT_FAILED', message: 'Failed to debit credits' },
        { status: 402 }
      );
    }

    // Enqueue job
    try {
      const queue = getAuditQueue();
      await queue.add(
        'process-audit',
        {
          auditId: audit.id,
          prospectId: prospect.id,
          userId,
          url,
          companyName,
          contactName,
          correlationId: getCorrelationId(),
        },
        {
          jobId: `audit-${audit.id}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        }
      );
    } catch (queueError) {
      logger.error({ error: queueError }, 'Failed to enqueue job');
    }

    return NextResponse.json(
      {
        data: {
          id: audit.id,
          status: audit.status,
          prospectId: prospect.id,
          campaignId: campaign.id,
        },
        creditsRemaining: currentCredits - 1,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error }, 'POST error');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}