/**
 * Job Tracking — Idempotency for Worker Jobs
 *
 * Records the lifecycle of each job step (capture / analyze / annotate)
 * so that re-delivered BullMQ jobs are silently skipped instead of
 * being reprocessed.
 *
 * Uses Prisma via the @screencold/db package.
 */

import prisma from "@screencold/db";

export type JobStep = "capture" | "analyze" | "annotate";

export type JobStepResult = Record<string, unknown> | null;

/**
 * Mark a job step as started (status = PROCESSING).
 * Creates the tracking row if it does not exist, otherwise no-ops.
 */
export async function markJobStarted(
  jobId: string,
  auditId: string,
  step: JobStep,
): Promise<void> {
  await prisma.jobTracking.upsert({
    where: {
      jobId_auditId_step: { jobId, auditId, step },
    },
    update: {
      status: "PROCESSING",
    },
    create: {
      jobId,
      auditId,
      step,
      status: "PROCESSING",
    },
  });
}

/**
 * Mark a job step as completed.
 */
export async function markJobCompleted(
  jobId: string,
  auditId: string,
  step: JobStep,
  result?: JobStepResult,
): Promise<void> {
  await prisma.jobTracking.upsert({
    where: {
      jobId_auditId_step: { jobId, auditId, step },
    },
    update: {
      status: "COMPLETED",
      result: result ?? undefined,
    },
    create: {
      jobId,
      auditId,
      step,
      status: "COMPLETED",
      result: result ?? undefined,
    },
  });
}

/**
 * Mark a job step as failed (e.g. on error).
 */
export async function markJobFailed(
  jobId: string,
  auditId: string,
  step: JobStep,
  error?: string,
): Promise<void> {
  await prisma.jobTracking.upsert({
    where: {
      jobId_auditId_step: { jobId, auditId, step },
    },
    update: {
      status: "FAILED",
      error: error ?? null,
    },
    create: {
      jobId,
      auditId,
      step,
      status: "FAILED",
      error: error ?? null,
    },
  });
}

/**
 * Check whether a job step has already been completed successfully.
 * Returns `true` when the tracking record exists with status COMPLETED.
 */
export async function isJobAlreadyProcessed(
  jobId: string,
  auditId: string,
  step: JobStep,
): Promise<boolean> {
  const record = await prisma.jobTracking.findUnique({
    where: {
      jobId_auditId_step: { jobId, auditId, step },
    },
  });

  return record?.status === "COMPLETED";
}
