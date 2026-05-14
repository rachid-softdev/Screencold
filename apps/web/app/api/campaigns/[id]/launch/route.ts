import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';
import { checkCredits, batchDebitCredits, batchRefundCredits } from '@/lib/credits';

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
// POST /api/campaigns/[id]/launch - Launch batch audits
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

    const { id: campaignId } = await params;

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        userId: true,
        prospectsList: {
          where: { status: 'PENDING' },
          select: {
            id: true,
            url: true,
            companyName: true,
            contactName: true,
            contactEmail: true,
          },
        },
      },
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

    const pendingProspects = campaign.prospectsList;

    if (pendingProspects.length === 0) {
      return NextResponse.json(
        { error: 'NO_PENDING_PROSPECTS', message: 'Aucun prospect en attente' },
        { status: 400 }
      );
    }

    // Check user has enough credits
    const currentCredits = await checkCredits(userId);

    if (currentCredits < pendingProspects.length) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Crédits insuffisants. Vous avez ${currentCredits} crédit(s) mais ${pendingProspects.length} sont nécessaires.`,
          required: pendingProspects.length,
          available: currentCredits,
        },
        { status: 402 }
      );
    }

    // Create audits and debit credits atomically
    const auditIds: string[] = [];

    // First, create all audit records
    for (const prospect of pendingProspects) {
      const audit = await prisma.audit.create({
        data: {
          prospectId: prospect.id,
          userId,
          status: 'PROCESSING',
        },
      });
      auditIds.push(audit.id);
    }

    // Batch debit credits
    const debitResult = await batchDebitCredits(userId, auditIds);

    if (!debitResult.success) {
      // Rollback: delete created audits
      await prisma.audit.deleteMany({
        where: { id: { in: auditIds } },
      });

      return NextResponse.json(
        {
          error: 'CREDIT_DEBIT_FAILED',
          message: 'Impossible de débiter les crédits',
        },
        { status: 402 }
      );
    }

    // Enqueue jobs for each audit
    const queue = getAuditQueue();
    let enqueuedCount = 0;
    const failedProspects: string[] = [];

    try {
      for (let i = 0; i < pendingProspects.length; i++) {
        const prospect = pendingProspects[i];
        const auditId = auditIds[i];

        try {
          await queue.add(
            'process-audit',
            {
              auditId,
              prospectId: prospect.id,
              userId,
              url: prospect.url,
              companyName: prospect.companyName,
              contactName: prospect.contactName,
            },
            {
              jobId: `audit-${auditId}`,
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

          // Update prospect status
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: { status: 'PROCESSING' },
          });

          enqueuedCount++;
        } catch (jobError) {
          console.error(`[Launch] Failed to enqueue audit ${auditId}:`, jobError);
          failedProspects.push(prospect.id);

          // Refund credit for failed job
          await batchRefundCredits(userId, [auditId], 'Queue enqueue failed');

          // Delete the audit
          await prisma.audit.delete({ where: { id: auditId } });
        }
      }

      console.log(`[Campaign Launch] campaign=${campaignId}, launched=${enqueuedCount}, failed=${failedProspects.length}`);
    } catch (queueError) {
      console.error('[Campaign Launch] Queue error:', queueError);

      // Refund all credits and cleanup
      await batchRefundCredits(userId, auditIds, 'Batch queue failed');

      // Delete audits
      await prisma.audit.deleteMany({
        where: { id: { in: auditIds } },
      });

      return NextResponse.json(
        {
          error: 'QUEUE_ERROR',
          message: 'Erreur lors de l\'envoi des jobs. Aucun crédit n\'a été débité.',
        },
        { status: 500 }
      );
    }

    // Calculate remaining credits
    const remainingCredits = currentCredits - enqueuedCount;

    return NextResponse.json({
      success: true,
      launched: enqueuedCount,
      failed: failedProspects.length,
      total: pendingProspects.length,
      remainingCredits,
      message: enqueuedCount === pendingProspects.length
        ? `${enqueuedCount} audit(s) lancé(s) avec succès`
        : `${enqueuedCount} audit(s) lancé(s), ${failedProspects.length} échoué(s)`,
    });
  } catch (error) {
    console.error('[Campaign/Launch] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}