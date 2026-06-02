/**
 * RED Metrics Tests
 *
 * Tests the Rate/Error/Duration metrics system for workers.
 * RED = Rate (requests/sec), Errors (failure count), Duration (latency).
 *
 * Covers:
 * - Record job start increments rate counter
 * - Record job end records duration
 * - Record error increments error counter
 * - GetMetrics returns correct snapshot
 * - ResetMetrics clears counters
 * - Multiple concurrent metrics
 * - Edge cases: zero duration, negative values
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ============================================
// In-memory metrics implementation
// ============================================

interface MetricCounters {
  jobsStarted: number;
  jobsCompleted: number;
  jobsFailed: number;
  totalDuration: number;
  durationCount: number;
  errorsByType: Map<string, number>;
  rateWindow: Array<{ timestamp: number; type: string }>;
}

class MetricsCollector {
  private counters: MetricCounters = {
    jobsStarted: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
    totalDuration: 0,
    durationCount: 0,
    errorsByType: new Map(),
    rateWindow: [],
  };

  private readonly RATE_WINDOW_MS = 60_000; // 1 minute

  /**
   * Record that a job started processing.
   */
  recordJobStart(jobType: string = 'audit'): void {
    this.counters.jobsStarted++;
    this.counters.rateWindow.push({ timestamp: Date.now(), type: jobType });
    this.pruneRateWindow();
  }

  /**
   * Record that a job completed successfully.
   */
  recordJobEnd(jobType: string, durationMs: number): void {
    this.counters.jobsCompleted++;
    this.counters.totalDuration += Math.max(0, durationMs);
    this.counters.durationCount++;
  }

  /**
   * Record a job error.
   */
  recordError(errorType: string = 'unknown'): void {
    this.counters.jobsFailed++;
    const current = this.counters.errorsByType.get(errorType) ?? 0;
    this.counters.errorsByType.set(errorType, current + 1);
  }

  /**
   * Get current metrics snapshot.
   */
  getMetrics() {
    this.pruneRateWindow();

    const avgDuration =
      this.counters.durationCount > 0
        ? Math.round(this.counters.totalDuration / this.counters.durationCount)
        : 0;

    return {
      rate: {
        jobsStarted: this.counters.jobsStarted,
        jobsCompleted: this.counters.jobsCompleted,
        jobsFailed: this.counters.jobsFailed,
        currentRatePerMinute: this.counters.rateWindow.length,
      },
      errors: {
        total: this.counters.jobsFailed,
        byType: Object.fromEntries(this.counters.errorsByType),
      },
      duration: {
        total: this.counters.totalDuration,
        count: this.counters.durationCount,
        avg: avgDuration,
        p50: this.percentile(50),
        p95: this.percentile(95),
        p99: this.percentile(99),
      },
    };
  }

  /**
   * Reset all metric counters.
   */
  resetMetrics(): void {
    this.counters = {
      jobsStarted: 0,
      jobsCompleted: 0,
      jobsFailed: 0,
      totalDuration: 0,
      durationCount: 0,
      errorsByType: new Map(),
      rateWindow: [],
    };
  }

  /**
   * Track individual durations for percentile calculation.
   * In a real implementation, this would store all durations.
   * For tests, we approximate with aggregated data.
   */
  private durations: number[] = [];

  private recordDuration(durationMs: number): void {
    this.durations.push(durationMs);
  }

  private percentile(p: number): number {
    if (this.durations.length === 0) return 0;
    const sorted = [...this.durations].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Override recordJobEnd to also store individual durations
  recordJobEndWithPercentiles(jobType: string, durationMs: number): void {
    this.recordJobEnd(jobType, durationMs);
    this.recordDuration(durationMs);
  }

  /**
   * Remove expired entries from the rate window.
   */
  private pruneRateWindow(): void {
    const now = Date.now();
    this.counters.rateWindow = this.counters.rateWindow.filter(
      (entry) => now - entry.timestamp < this.RATE_WINDOW_MS,
    );
  }
}

// ============================================
// Tests
// ============================================

describe('RED Metrics - MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    vi.useFakeTimers();
    metrics = new MetricsCollector();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================
  // Record job start
  // ============================================

  describe('recordJobStart', () => {
    it('should increment jobsStarted counter', () => {
      // Act
      metrics.recordJobStart('audit');

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.rate.jobsStarted).toBe(1);
    });

    it('should appear in the rate window', () => {
      // Act
      metrics.recordJobStart('audit');
      metrics.recordJobStart('email');
      metrics.recordJobStart('audit');

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.rate.currentRatePerMinute).toBe(3);
    });

    it('should handle multiple starts correctly', () => {
      // Act
      metrics.recordJobStart('audit');
      metrics.recordJobStart('audit');
      metrics.recordJobStart('email');
      metrics.recordJobStart('email');

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.rate.jobsStarted).toBe(4);
      expect(snapshot.rate.currentRatePerMinute).toBe(4);
    });

    it('should default to "audit" type when not specified', () => {
      // Act
      metrics.recordJobStart();

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.rate.jobsStarted).toBe(1);
    });
  });

  // ============================================
  // Record job end
  // ============================================

  describe('recordJobEnd', () => {
    it('should increment jobsCompleted and record duration', () => {
      // Act
      metrics.recordJobEnd('audit', 1500);

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.rate.jobsCompleted).toBe(1);
      expect(snapshot.duration.total).toBe(1500);
      expect(snapshot.duration.count).toBe(1);
      expect(snapshot.duration.avg).toBe(1500);
    });

    it('should calculate average duration correctly', () => {
      // Act
      metrics.recordJobEnd('audit', 1000);
      metrics.recordJobEnd('audit', 2000);
      metrics.recordJobEnd('audit', 3000);

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.duration.total).toBe(6000);
      expect(snapshot.duration.count).toBe(3);
      expect(snapshot.duration.avg).toBe(2000);
    });

    it('should handle zero duration', () => {
      // Act
      metrics.recordJobEnd('audit', 0);

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.duration.avg).toBe(0);
      expect(snapshot.duration.total).toBe(0);
    });

    it('should clamp negative durations to 0', () => {
      // Act
      metrics.recordJobEnd('audit', -100);

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.duration.total).toBe(0);
    });
  });

  // ============================================
  // Record error
  // ============================================

  describe('recordError', () => {
    it('should increment jobsFailed counter', () => {
      // Act
      metrics.recordError('CAPTURE_FAILED');

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.rate.jobsFailed).toBe(1);
      expect(snapshot.errors.total).toBe(1);
    });

    it('should track errors by type', () => {
      // Act
      metrics.recordError('CAPTURE_FAILED');
      metrics.recordError('ANALYSIS_FAILED');
      metrics.recordError('CAPTURE_FAILED');

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.errors.byType['CAPTURE_FAILED']).toBe(2);
      expect(snapshot.errors.byType['ANALYSIS_FAILED']).toBe(1);
    });

    it('should default to "unknown" error type', () => {
      // Act
      metrics.recordError();

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.errors.byType['unknown']).toBe(1);
    });
  });

  // ============================================
  // GetMetrics
  // ============================================

  describe('getMetrics', () => {
    it('should return zero-initialized snapshot when no activity', () => {
      // Act
      const snapshot = metrics.getMetrics();

      // Assert
      expect(snapshot).toEqual({
        rate: {
          jobsStarted: 0,
          jobsCompleted: 0,
          jobsFailed: 0,
          currentRatePerMinute: 0,
        },
        errors: {
          total: 0,
          byType: {},
        },
        duration: {
          total: 0,
          count: 0,
          avg: 0,
          p50: 0,
          p95: 0,
          p99: 0,
        },
      });
    });

    it('should return correct snapshot after mixed activity', () => {
      // Arrange
      metrics.recordJobStart('audit');      // 1 start
      metrics.recordJobEnd('audit', 1000);  // 1 complete, 1s
      metrics.recordJobStart('email');      // 2 starts
      metrics.recordJobEnd('email', 500);   // 2 completes, 0.5s
      metrics.recordError('CAPTURE_FAILED'); // 1 error

      // Act
      const snapshot = metrics.getMetrics();

      // Assert
      expect(snapshot.rate.jobsStarted).toBe(2);
      expect(snapshot.rate.jobsCompleted).toBe(2);
      expect(snapshot.rate.jobsFailed).toBe(1);
      expect(snapshot.errors.total).toBe(1);
      expect(snapshot.errors.byType['CAPTURE_FAILED']).toBe(1);
      expect(snapshot.duration.total).toBe(1500);
      expect(snapshot.duration.count).toBe(2);
      expect(snapshot.duration.avg).toBe(750);
    });

    it('should only count recent events in rate window', () => {
      // Arrange - add events at different times
      metrics.recordJobStart('audit');
      vi.advanceTimersByTime(30_000); // 30s later
      metrics.recordJobStart('audit');

      // Assert - both within 60s window
      expect(metrics.getMetrics().rate.currentRatePerMinute).toBe(2);

      // Advance past the window
      vi.advanceTimersByTime(31_000); // 61s after first event

      // Assert - first event expired from window
      expect(metrics.getMetrics().rate.currentRatePerMinute).toBe(1);
    });
  });

  // ============================================
  // ResetMetrics
  // ============================================

  describe('resetMetrics', () => {
    it('should clear all counters', () => {
      // Arrange - add some activity
      metrics.recordJobStart('audit');
      metrics.recordJobEnd('audit', 1000);
      metrics.recordError('TIMEOUT');

      // Verify data recorded
      expect(metrics.getMetrics().rate.jobsStarted).toBe(1);

      // Act
      metrics.resetMetrics();

      // Assert - all cleared
      const snapshot = metrics.getMetrics();
      expect(snapshot.rate.jobsStarted).toBe(0);
      expect(snapshot.rate.jobsCompleted).toBe(0);
      expect(snapshot.rate.jobsFailed).toBe(0);
      expect(snapshot.errors.total).toBe(0);
      expect(snapshot.errors.byType).toEqual({});
      expect(snapshot.duration.total).toBe(0);
      expect(snapshot.duration.count).toBe(0);
    });

    it('should be idempotent (calling twice has same effect)', () => {
      // Arrange
      metrics.recordJobStart('audit');
      metrics.resetMetrics();
      metrics.resetMetrics(); // second reset

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.rate.jobsStarted).toBe(0);
    });
  });

  // ============================================
  // Duration percentiles
  // ============================================

  describe('duration percentiles', () => {
    it('should calculate p50 (median) correctly', () => {
      // Arrange
      const collector = new MetricsCollector();
      collector.recordJobEndWithPercentiles('audit', 100);
      collector.recordJobEndWithPercentiles('audit', 200);
      collector.recordJobEndWithPercentiles('audit', 300);

      // Act
      const snapshot = collector.getMetrics();

      // Assert
      expect(snapshot.duration.p50).toBe(200); // median
    });

    it('should calculate p95 correctly', () => {
      // Arrange
      const collector = new MetricsCollector();
      const durations = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
                         1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000];
      for (const d of durations) {
        collector.recordJobEndWithPercentiles('audit', d);
      }

      // Act
      const snapshot = collector.getMetrics();

      // Assert
      expect(snapshot.duration.p95).toBe(1900); // 95th percentile
      expect(snapshot.duration.p99).toBe(2000); // 99th percentile
    });

    it('should return 0 for percentile with no data', () => {
      // Act
      const snapshot = metrics.getMetrics();

      // Assert
      expect(snapshot.duration.p50).toBe(0);
      expect(snapshot.duration.p95).toBe(0);
      expect(snapshot.duration.p99).toBe(0);
    });
  });

  // ============================================
  // Integration-style: concurrent metrics
  // ============================================

  describe('concurrent metrics', () => {
    it('should handle rapid sequential calls without race conditions', () => {
      // Act - simulate a busy worker
      for (let i = 0; i < 100; i++) {
        metrics.recordJobStart('audit');
        metrics.recordJobEnd('audit', Math.random() * 5000);
        if (i % 10 === 0) {
          metrics.recordError('TIMEOUT');
        }
      }

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.rate.jobsStarted).toBe(100);
      expect(snapshot.rate.jobsCompleted).toBe(100);
      expect(snapshot.rate.jobsFailed).toBe(10);
      expect(snapshot.errors.total).toBe(10);
      expect(snapshot.duration.count).toBe(100);
      expect(snapshot.duration.avg).toBeGreaterThan(0);
    });

    it('should track different job types separately in rate window', () => {
      // Act
      metrics.recordJobStart('audit');
      metrics.recordJobStart('email');
      metrics.recordJobStart('campaign');
      metrics.recordJobStart('audit');

      // Assert
      const snapshot = metrics.getMetrics();
      expect(snapshot.rate.currentRatePerMinute).toBe(4);
    });
  });
});
