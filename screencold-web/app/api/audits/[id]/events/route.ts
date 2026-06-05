import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

// ============================================
// SSE Event Types
// ============================================

type SSEEventType = 'status' | 'progress' | 'complete' | 'error';

interface SSEEvent {
  type: SSEEventType;
  status?: string;
  step?: string;
  progress?: number;
  timestamp: string;
  data?: Record<string, unknown>;
}

// ============================================
// GET /api/audits/[id]/events - SSE stream for audit progress
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const encoder = new TextEncoder();

  // Verify authentication first
  const { authorized, userId } = await apiMiddleware(request, {
    requireAuth: true,
    requireCredits: false,
  });

  if (!authorized || !userId) {
    // Return a minimal response for auth errors
    const response = new Response('Unauthorized', { status: 401 });
    return response;
  }

  const { id: auditId } = await params;

  // Verify audit ownership
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: { id: true, userId: true, status: true },
  });

  if (!audit || audit.userId !== userId) {
    const response = new Response('Not found or forbidden', { status: 404 });
    return response;
  }

  // If audit is already complete or failed, send final event and close
  if (audit.status === 'READY' || audit.status === 'FAILED') {
    const stream = new ReadableStream({
      start(controller) {
        const event: SSEEvent = {
          type: audit.status === 'READY' ? 'complete' : 'error',
          status: audit.status,
          timestamp: new Date().toISOString(),
          data: audit.status === 'FAILED' ? { error: 'Audit has failed' } : undefined,
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  // Poll-based SSE stream for processing audits
  const stream = new ReadableStream({
    async start(controller) {
      console.log(`[SSE] Starting stream for audit: ${auditId}`);

      // Send initial status
      const initialEvent: SSEEvent = {
        type: 'status',
        status: 'PROCESSING',
        step: 'Initializing',
        progress: 0,
        timestamp: new Date().toISOString(),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`));

      let isComplete = false;
      let pollCount = 0;
      const maxPolls = 150; // 5 minutes max (150 * 2s = 300s)

      // Poll database every 2 seconds
      while (!isComplete && pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        pollCount++;

        try {
          // Fetch latest audit status
          const updatedAudit = await prisma.audit.findUnique({
            where: { id: auditId },
            select: { status: true, errorMessage: true, processingTime: true },
          });

          if (!updatedAudit) {
            const errorEvent: SSEEvent = {
              type: 'error',
              status: 'FAILED',
              step: 'Audit not found',
              timestamp: new Date().toISOString(),
              data: { error: 'Audit was deleted' },
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
            break;
          }

          // Determine step based on processing time and current state
          const step = determineStep(updatedAudit.status, pollCount);

          const event: SSEEvent = {
            type: updatedAudit.status === 'READY' ? 'complete' :
                  updatedAudit.status === 'FAILED' ? 'error' : 'progress',
            status: updatedAudit.status,
            step,
            progress: calculateProgress(updatedAudit.status, pollCount),
            timestamp: new Date().toISOString(),
            data: updatedAudit.status === 'FAILED' ? { error: updatedAudit.errorMessage } : undefined,
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

          if (updatedAudit.status === 'READY' || updatedAudit.status === 'FAILED') {
            isComplete = true;
            console.log(`[SSE] Stream ended for audit: ${auditId}, status: ${updatedAudit.status}`);
          }
        } catch (pollError) {
          console.error('[SSE] Poll error:', pollError);
          // Continue polling despite errors
        }
      }

      if (!isComplete) {
        // Timeout reached
        const timeoutEvent: SSEEvent = {
          type: 'error',
          status: 'PROCESSING',
          step: 'Timeout',
          timestamp: new Date().toISOString(),
          data: { error: 'Connection timeout - audit may still be processing' },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(timeoutEvent)}\n\n`));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ============================================
// Helper Functions
// ============================================

function determineStep(status: string, pollCount: number): string {
  if (status !== 'PROCESSING') {
    return status === 'READY' ? 'Complete' : 'Failed';
  }

  // Estimate step based on time elapsed
  if (pollCount <= 5) return 'Capturing screenshot';
  if (pollCount <= 10) return 'Analyzing with AI';
  if (pollCount <= 15) return 'Creating annotations';
  if (pollCount <= 20) return 'Generating email';
  return 'Finalizing results';
}

function calculateProgress(status: string, pollCount: number): number {
  if (status === 'READY') return 100;
  if (status === 'FAILED') return 0;

  // Estimate progress (0-90% for processing, 100% when done)
  const estimatedProgress = Math.min(90, pollCount * 4.5);
  return Math.round(estimatedProgress);
}