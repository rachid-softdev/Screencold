import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '@/lib/prisma';
import { debitCredits, checkCredits } from '@/lib/credits';
import { apiMiddleware, getRateLimitHeaders } from '@/middleware';
import { getPlan, getCSVLimit } from '@/lib/plans';
import { checkIpRateLimit } from '@/lib/rate-limit';

// ============================================
// Validation Schema
// ============================================

const createAuditSchema = z.object({
  url: z.string().url('URL invalide'),
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  campaignId: z.string().optional(),
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
// POST /api/audits - Create a new audit
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Apply middleware (auth + rate limit)
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: true,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    // Apply Redis-based rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await checkIpRateLimit(ip, 30, 60); // 30 requests per minute
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'RATE_LIMITED', 
          message: 'Trop de requêtes. Veuillez patienter.',
          retryAfter: rateLimitResult.resetAt - Math.ceil(Date.now() / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.resetAt - Math.ceil(Date.now() / 1000)),
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          },
        }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = createAuditSchema.safeParse(body);

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

    const { url, companyName, contactName, contactEmail, campaignId, notes } = validationResult.data;

    // Validate URL (basic SSRF protection)
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Block private IPs, localhost, etc.
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
        /^169\.254\.169\.254/, // AWS metadata
        /\.internal$/,
      ];

      for (const pattern of blockedPatterns) {
        if (pattern.test(hostname)) {
          return NextResponse.json(
            { error: 'INVALID_URL', message: 'Cette URL n\'est pas accessible' },
            { status: 400 }
          );
        }
      }

      // Only allow http/https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return NextResponse.json(
          { error: 'INVALID_URL', message: 'Seuls les protocoles HTTP et HTTPS sont acceptés' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'INVALID_URL', message: 'URL invalide' },
        { status: 400 }
      );
    }

    // Check current credits
    const currentCredits = await checkCredits(userId);

    if (currentCredits <= 0) {
      return NextResponse.json(
        {
          error: 'NO_CREDITS',
          message: 'Vous n\'avez plus de crédits. Upgradez votre plan pour continuer.',
          currentCredits: 0,
        },
        { status: 402 }
      );
    }

    // If campaignId provided, verify ownership and check CSV limit
    let campaign = null;
    if (campaignId) {
      campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, userId: true },
      });

      if (!campaign || campaign.userId !== userId) {
        return NextResponse.json(
          { error: 'CAMPAIGN_NOT_FOUND', message: 'Campagne non trouvée' },
          { status: 404 }
        );
      }

      // Count prospects to check CSV limit
      const prospectCount = await prisma.prospect.count({
        where: { campaignId },
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });

      if (user) {
        const csvLimit = getCSVLimit(user.plan);
        if (csvLimit !== -1 && prospectCount >= csvLimit) {
          return NextResponse.json(
            {
              error: 'CSV_LIMIT_REACHED',
              message: `Limite de ${csvLimit} prospects atteinte pour votre plan`,
              csvLimit,
            },
            { status: 400 }
          );
        }
      }
    } else {
      // Create a new campaign for single audit
      campaign = await prisma.campaign.create({
        data: {
          name: `Audit - ${new Date().toISOString().split('T')[0]}`,
          userId,
        },
      });
    }

    // Create prospect first
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

    // Create audit record (without debiting yet, we'll do it atomically)
    const audit = await prisma.audit.create({
      data: {
        prospectId: prospect.id,
        userId,
        status: 'PROCESSING',
      },
    });

    // Debit credits (this creates the transaction record too)
    const debited = await debitCredits(userId, audit.id);

    if (!debited) {
      // Rollback: delete the audit and prospect
      await prisma.audit.delete({ where: { id: audit.id } });
      await prisma.prospect.delete({ where: { id: prospect.id } });

      return NextResponse.json(
        {
          error: 'CREDIT_DEBIT_FAILED',
          message: 'Impossible de débiter les crédits. Réessayez.',
        },
        { status: 402 }
      );
    }

    // Enqueue job to BullMQ
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
        },
        {
          jobId: `audit-${audit.id}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            count: 100,
            age: 3600,
          },
          removeOnFail: {
            count: 50,
          },
        }
      );

      console.log(`[Audit] Enqueued: auditId=${audit.id}, prospectId=${prospect.id}`);
    } catch (queueError) {
      console.error('[Audit] Failed to enqueue job:', queueError);
      // Don't rollback here - the audit is created and can be retried
    }

    // Return success response
    return NextResponse.json(
      {
        auditId: audit.id,
        prospectId: prospect.id,
        campaignId: campaign.id,
        status: 'PROCESSING',
        creditsRemaining: currentCredits - 1,
      },
      {
        status: 201,
        headers: {
          ...getRateLimitHeaders(request),
        },
      }
    );
  } catch (error) {
    console.error('[Audits] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/audits - List user's audits (with cursor-based pagination)
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
    // Support both old pagination (page/limit) and new cursor-based
    const cursor = searchParams.get('cursor'); // cursor = audit ID
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const campaignId = searchParams.get('campaignId');
    const status = searchParams.get('status') as 'PROCESSING' | 'READY' | 'FAILED' | null;

    // Build query
    const where: Record<string, unknown> = { userId };
    if (campaignId) {
      where.prospect = { campaignId };
    }
    if (status) {
      where.status = status;
    }

    // Determine if using cursor-based pagination
    const useCursor = !!cursor;

    let audits;
    let total;

    if (useCursor) {
      // Cursor-based pagination (more efficient for large datasets)
      where.id = { lt: cursor }; // Assuming id is lexicographically sortable

      audits = await prisma.audit.findMany({
        where,
        include: {
          prospect: {
            select: {
              id: true,
              url: true,
              companyName: true,
              contactName: true,
              status: true,
              campaignId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // Take one extra to check if there's more
      });

      total = await prisma.audit.count({ where: { userId } }); // Approximate for cursor

      const hasMore = audits.length > limit;
      const items = hasMore ? audits.slice(0, -1) : audits;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      return NextResponse.json({
        audits: items.map((audit) => ({
          id: audit.id,
          status: audit.status,
          siteType: audit.siteType,
          overallScore: audit.overallScore,
          emailSubject: audit.emailSubject,
          createdAt: audit.createdAt,
          processingTime: audit.processingTime,
          prospect: {
            id: audit.prospect.id,
            url: audit.prospect.url,
            companyName: audit.prospect.companyName,
            contactName: audit.prospect.contactName,
            status: audit.prospect.status,
            campaignId: audit.prospect.campaignId,
          },
          screenshotUrl: audit.screenshotUrl,
          annotatedUrl: audit.annotatedUrl,
        })),
        pagination: {
          cursor: nextCursor,
          hasMore,
          limit,
          total,
        },
      });
    } else {
      // Legacy offset-based pagination (for backward compatibility)
      [audits, total] = await Promise.all([
        prisma.audit.findMany({
          where,
          include: {
            prospect: {
              select: {
                id: true,
                url: true,
                companyName: true,
                contactName: true,
                status: true,
                campaignId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.audit.count({ where }),
      ]);

      return NextResponse.json({
        audits: audits.map((audit) => ({
          id: audit.id,
          status: audit.status,
          siteType: audit.siteType,
          overallScore: audit.overallScore,
          emailSubject: audit.emailSubject,
          createdAt: audit.createdAt,
          processingTime: audit.processingTime,
          prospect: {
            id: audit.prospect.id,
            url: audit.prospect.url,
            companyName: audit.prospect.companyName,
            contactName: audit.prospect.contactName,
            status: audit.prospect.status,
            campaignId: audit.prospect.campaignId,
          },
          screenshotUrl: audit.screenshotUrl,
          annotatedUrl: audit.annotatedUrl,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  } catch (error) {
    console.error('[Audits] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}