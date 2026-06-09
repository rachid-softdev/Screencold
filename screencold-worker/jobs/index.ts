/**
 * Job Functions Export
 * Re-exports all job functions for use by the processor
 */

import { prisma } from "../src/db";

export async function checkJobIdempotency(
  jobId: string,
  auditId: string,
  step: string
): Promise<boolean> {
  const existing = await prisma.jobTracking.findUnique({
    where: {
      jobId_auditId_step: {
        jobId,
        auditId,
        step,
      },
    },
  });

  if (existing?.status === 'COMPLETED') {
    return true;
  }

  await prisma.jobTracking.upsert({
    where: {
      jobId_auditId_step: {
        jobId,
        auditId,
        step,
      },
    },
    update: { status: 'PROCESSING' },
    create: {
      jobId,
      auditId,
      step,
      status: 'PROCESSING',
    },
  });

  return false;
}

export async function markJobComplete(
  jobId: string,
  auditId: string,
  step: string,
  result?: Record<string, unknown>
): Promise<void> {
  await prisma.jobTracking.update({
    where: {
      jobId_auditId_step: {
        jobId,
        auditId,
        step,
      },
    },
    data: {
      status: 'COMPLETED',
      result: result ?? undefined,
    },
  });
}

export async function markJobFailed(
  jobId: string,
  auditId: string,
  step: string,
  error: string
): Promise<void> {
  await prisma.jobTracking.update({
    where: {
      jobId_auditId_step: {
        jobId,
        auditId,
        step,
      },
    },
    data: {
      status: 'FAILED',
      error,
    },
  });
}

// Capture job
export {
  captureWebsite,
  captureWebsite as capture,
  isCaptureValid,
  type CaptureResult,
} from "./capture";

// Upload jobs
export {
  uploadScreenshots,
  uploadScreenshots as upload,
  uploadAnnotatedScreenshot,
  uploadAnnotatedScreenshot as uploadAnnotated,
  type UploadResult,
} from "./upload";

// Analysis job
export {
  analyzeSite,
  analyzeSite as analyze,
  isAnalysisValid,
  type AnalysisResult,
} from "./analyze";

// Annotation job
export {
  annotateScreenshot,
  annotateScreenshot as annotate,
  type AnnotationResult,
} from "./annotate";

// Email generation job
export {
  generateOutreachEmail,
  generateOutreachEmail as generateEmail,
  insertImagePlaceholder,
  isEmailValid,
  type EmailGenerationResult,
} from "./generate-email";