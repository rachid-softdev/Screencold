/**
 * BullMQ Queue Configuration
 * Defines the audit processing queue, job types, and Dead Letter Queue
 */

import { Queue, QueueOptions } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * Queue name constants
 */
export const AUDIT_QUEUE_NAME = "audit-processing";
export const AUDIT_DLQ_NAME = "audit-processing-dlq";

/**
 * Default job options for retry and backoff
 */
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 5000,
  },
  removeOnComplete: {
    count: 100,
    age: 24 * 3600, // 24 hours
  },
  removeOnFail: {
    count: 500,
    age: 7 * 24 * 3600, // 7 days
  },
};

/**
 * DLQ job options — keep failed jobs indefinitely for manual inspection
 */
export const dlqJobOptions = {
  removeOnComplete: {
    count: 1000,
    age: 30 * 24 * 3600, // 30 days
  },
  removeOnFail: {
    count: 1000,
    age: 90 * 24 * 3600, // 90 days
  },
};

/**
 * Queue options
 */
const queueOptions: QueueOptions = {
  connection,
  defaultJobOptions,
};

/**
 * Dead Letter Queue options
 */
const dlqOptions: QueueOptions = {
  connection,
  defaultJobOptions: dlqJobOptions,
};

/**
 * Creates the audit processing queue
 */
export const auditQueue = new Queue(AUDIT_QUEUE_NAME, queueOptions);

/**
 * Creates the Dead Letter Queue for exhausted retries
 */
export const auditDlq = new Queue(AUDIT_DLQ_NAME, dlqOptions);

/**
 * Moves a failed job to the Dead Letter Queue
 */
export async function moveToDLQ(
  jobId: string,
  data: Record<string, unknown>,
  reason: string,
  attemptsMade: number,
  stacktrace?: string[],
): Promise<void> {
  await auditDlq.add("dead-letter", {
    originalQueue: AUDIT_QUEUE_NAME,
    originalJobId: jobId,
    data,
    reason,
    failedAt: new Date().toISOString(),
    attempts: attemptsMade,
    stacktrace,
  }, {
    jobId: `dlq-${jobId}`,
  });
}

/**
 * Audit job data structure
 */
export interface AuditJobData {
  auditId: string;
  prospectId: string;
  userId: string;
  url: string;
  companyName?: string;
  contactName?: string;
}

/**
 * Audit job result structure
 */
export interface AuditJobResult {
  success: boolean;
  auditId: string;
  data?: {
    screenshotUrl?: string;
    mobileUrl?: string;
    annotatedUrl?: string;
    siteType?: string;
    overallScore?: number;
    issues?: unknown[];
    emailSubject?: string;
    emailBody?: string;
    emailPs?: string;
    processingTime?: number;
  };
  error?: string;
}

/**
 * Adds an audit job to the queue
 */
export async function addAuditJob(data: AuditJobData): Promise<string> {
  const job = await auditQueue.add(
    "audit",
    data,
    defaultJobOptions
  );

  return job.id || "unknown";
}

/**
 * Gets a job by ID
 */
export async function getAuditJob(
  jobId: string
): Promise<ReturnType<Queue["getJob"]>> {
  return auditQueue.getJob(jobId);
}

/**
 * Gets all active, waiting, and completed job counts
 */
export async function getQueueStats(): Promise<{
  active: number;
  waiting: number;
  completed: number;
  failed: number;
}> {
  const [active, waiting, completed, failed] = await Promise.all([
    auditQueue.getActiveCount(),
    auditQueue.getWaitingCount(),
    auditQueue.getCompletedCount(),
    auditQueue.getFailedCount(),
  ]);

  return { active, waiting, completed, failed };
}

/**
 * Closes the queue connection
 */
export async function closeAuditQueue(): Promise<void> {
  await auditQueue.close();
}

/**
 * Closes the DLQ connection
 */
export async function closeAuditDlq(): Promise<void> {
  await auditDlq.close();
}

/**
 * Health check for the queue
 */
export async function isQueueHealthy(): Promise<boolean> {
  try {
    await connection.ping();
    return true;
  } catch {
    return false;
  }
}

export default auditQueue;