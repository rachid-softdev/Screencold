import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

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

function getEmailQueue(): Queue {
  const connection = getRedisConnection();
  return new Queue('email-generation', { connection });
}

// ============================================
// POST /api/audits/[id]/email - Regenerate email
// ============================================

export async function POST(
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
            url: true,
            companyName: true,
            contactName: true,
            contactEmail: true,
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

    if (audit.userId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n\'avez pas accès à cet audit' },
        { status: 403 }
      );
    }

    // Check audit is in READY state (has been processed)
    if (audit.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'AUDIT_NOT_READY', message: 'L\'audit est encore en cours de traitement' },
        { status: 400 }
      );
    }

    if (audit.status === 'FAILED') {
      return NextResponse.json(
        { error: 'AUDIT_FAILED', message: 'Impossible de régénérer l\'email pour un audit échoué' },
        { status: 400 }
      );
    }

    // Check if we have the necessary data
    if (!audit.issues || !audit.siteType) {
      return NextResponse.json(
        { error: 'MISSING_DATA', message: 'Données insuffisantes pour générer l\'email' },
        { status: 400 }
      );
    }

    // Enqueue email regeneration job
    try {
      const queue = getEmailQueue();

      await queue.add(
        'regenerate-email',
        {
          auditId: audit.id,
          userId,
          prospectId: audit.prospectId,
          url: audit.prospect.url,
          companyName: audit.prospect.companyName,
          contactName: audit.prospect.contactName,
          contactEmail: audit.prospect.contactEmail,
          siteType: audit.siteType,
          overallScore: audit.overallScore,
          issues: audit.issues,
        },
        {
          jobId: `email-regen-${audit.id}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            count: 50,
            age: 3600,
          },
          removeOnFail: {
            count: 20,
          },
        }
      );

      console.log(`[Email] Enqueued regeneration: auditId=${audit.id}`);
    } catch (queueError) {
      console.error('[Email] Failed to enqueue regeneration:', queueError);
      return NextResponse.json(
        { error: 'QUEUE_ERROR', message: 'Impossible d\'enregistrer la demande. Réessayez.' },
        { status: 500 }
      );
    }

    // Update audit status to indicate email is being regenerated
    await prisma.audit.update({
      where: { id },
      data: { status: 'PROCESSING' }, // Temporary status
    });

    return NextResponse.json({
      success: true,
      message: 'Régénération de l\'email en cours',
      status: 'PROCESSING',
    });
  } catch (error) {
    console.error('[Audit/Email] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/audits/[id]/email - Get current email
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

    const audit = await prisma.audit.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        emailSubject: true,
        emailBody: true,
        emailPs: true,
        status: true,
      },
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

    return NextResponse.json({
      emailSubject: audit.emailSubject,
      emailBody: audit.emailBody,
      emailPs: audit.emailPs,
      isReady: audit.status === 'READY' && audit.emailBody !== null,
    });
  } catch (error) {
    console.error('[Audit/Email] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}