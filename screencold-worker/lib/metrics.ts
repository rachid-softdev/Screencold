/**
 * RED Metrics — Rate, Errors, Duration tracking for worker jobs.
 *
 * Simple in-memory counters that track:
 *   - Rate: number of jobs started
 *   - Errors: number of job failures
 *   - Duration: min / max / sum / count for average timing
 *
 * Designed for logging and operational visibility, not persistence.
 */

// ============================================
// Types
// ============================================

export interface REDMetricsSnapshot {
  rate: number;
  errors: number;
  duration: {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
  };
  /** Per-job-type breakdown */
  byType: Record<string, {
    rate: number;
    errors: number;
    duration: { count: number; sum: number; min: number; max: number; avg: number };
  }>;
  /** Timestamp of this snapshot */
  timestamp: string;
}

// ============================================
// Module-level state
// ============================================

interface JobTypeStats {
  rate: number;
  errors: number;
  durationCount: number;
  durationSum: number;
  durationMin: number;
  durationMax: number;
}

const jobCounters = new Map<string, JobTypeStats>();

let totalRate = 0;
let totalErrors = 0;
let totalDurationCount = 0;
let totalDurationSum = 0;
let totalDurationMin = Infinity;
let totalDurationMax = 0;

// ============================================
// Public API
// ============================================

/**
 * Record that a job of the given type has started execution.
 */
export function recordJobStart(jobType: string): void {
  totalRate++;
  const stats = getOrCreateStats(jobType);
  stats.rate++;
}

/**
 * Record that a job of the given type completed successfully.
 * @param jobType - The type of job (e.g. "audit", "email")
 * @param durationMs - Execution duration in milliseconds
 */
export function recordJobEnd(jobType: string, durationMs: number): void {
  const stats = getOrCreateStats(jobType);

  // Update per-type duration
  stats.durationCount++;
  stats.durationSum += durationMs;
  if (durationMs < stats.durationMin) stats.durationMin = durationMs;
  if (durationMs > stats.durationMax) stats.durationMax = durationMs;

  // Update total duration
  totalDurationCount++;
  totalDurationSum += durationMs;
  if (durationMs < totalDurationMin) totalDurationMin = durationMs;
  if (durationMs > totalDurationMax) totalDurationMax = durationMs;
}

/**
 * Record that a job of the given type failed.
 */
export function recordJobError(jobType: string, _error?: string): void {
  totalErrors++;
  const stats = getOrCreateStats(jobType);
  stats.errors++;
}

/**
 * Return a frozen snapshot of current RED metrics.
 */
export function getMetrics(): REDMetricsSnapshot {
  const byType: REDMetricsSnapshot["byType"] = {};

  for (const [type, stats] of jobCounters) {
    byType[type] = {
      rate: stats.rate,
      errors: stats.errors,
      duration: {
        count: stats.durationCount,
        sum: stats.durationSum,
        min: stats.durationCount > 0 ? stats.durationMin : 0,
        max: stats.durationCount > 0 ? stats.durationMax : 0,
        avg: stats.durationCount > 0 ? Math.round(stats.durationSum / stats.durationCount) : 0,
      },
    };
  }

  return {
    rate: totalRate,
    errors: totalErrors,
    duration: {
      count: totalDurationCount,
      sum: totalDurationSum,
      min: totalDurationCount > 0 ? totalDurationMin : 0,
      max: totalDurationCount > 0 ? totalDurationMax : 0,
      avg: totalDurationCount > 0 ? Math.round(totalDurationSum / totalDurationCount) : 0,
    },
    byType,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Reset all counters (for testing or periodic reset).
 */
export function resetMetrics(): void {
  jobCounters.clear();
  totalRate = 0;
  totalErrors = 0;
  totalDurationCount = 0;
  totalDurationSum = 0;
  totalDurationMin = Infinity;
  totalDurationMax = 0;
}

// ============================================
// Internal helpers
// ============================================

function getOrCreateStats(jobType: string): JobTypeStats {
  let stats = jobCounters.get(jobType);
  if (!stats) {
    stats = {
      rate: 0,
      errors: 0,
      durationCount: 0,
      durationSum: 0,
      durationMin: Infinity,
      durationMax: 0,
    };
    jobCounters.set(jobType, stats);
  }
  return stats;
}
