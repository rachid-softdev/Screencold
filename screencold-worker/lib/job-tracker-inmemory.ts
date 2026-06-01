/**
 * In-Memory Job Tracker — Idempotency for Worker Jobs
 *
 * Lightweight in-memory store used for testing job idempotency.
 * Tracks job lifecycle: pending → processing → completed / failed.
 */

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

const jobStore = new Map<string, JobStatus>();

/**
 * Reset the in-memory store (for test isolation).
 */
export function resetStore(): void {
  jobStore.clear();
}

/**
 * Mark a job as pending (idempotent — no-op if already tracked).
 */
export async function markJobPending(jobId: string): Promise<void> {
  if (!jobStore.has(jobId)) {
    jobStore.set(jobId, {
      status: 'pending',
      createdAt: new Date(),
    });
  }
}

/**
 * Try to acquire a job for processing.
 * Returns `true` if the job is new or pending, `false` if already
 * processing / completed / failed.
 */
export async function tryAcquireJob(jobId: string): Promise<boolean> {
  const existing = jobStore.get(jobId);

  if (!existing) {
    jobStore.set(jobId, {
      status: 'processing',
      createdAt: new Date(),
    });
    return true;
  }

  if (existing.status === 'pending') {
    existing.status = 'processing';
    return true;
  }

  // Already processing, completed, or failed — skip
  return false;
}

/**
 * Mark a job as completed.
 * Throws if the job does not exist in the store.
 */
export async function markJobCompleted(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  job.status = 'completed';
  job.completedAt = new Date();
}

/**
 * Mark a job as failed.
 * Throws if the job does not exist in the store.
 */
export async function markJobFailed(jobId: string, error?: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  job.status = 'failed';
  job.error = error;
}

/**
 * Get the current status of a job, or `undefined` if not tracked.
 */
export function getJobStatus(jobId: string): JobStatus | undefined {
  return jobStore.get(jobId);
}
