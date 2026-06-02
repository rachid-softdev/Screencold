/**
 * RED Alert Evaluator
 *
 * Fetches worker RED metrics (Rate / Errors / Duration) from the app's
 * /api/metrics endpoint (which proxies to the worker's Prometheus endpoint),
 * evaluates them against configurable thresholds, and sends a Slack alert
 * when thresholds are exceeded.
 *
 * Default thresholds:
 *   - errorRatePercent: 5  (alert if error rate > 5%)
 *   - p99LatencyMs:    5000 (alert if p99 latency > 5000ms)
 */

import { sendSlackAlert } from "./slack";
import type { SlackAttachment } from "./slack";

// ============================================
// Types
// ============================================

export interface AlertThresholds {
  errorRatePercent: number;
  p99LatencyMs: number;
}

interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

// ============================================
// Defaults
// ============================================

const DEFAULT_THRESHOLDS: AlertThresholds = {
  errorRatePercent: 5,
  p99LatencyMs: 5000,
};

// ============================================
// Prometheus text parser (minimal)
// ============================================

/**
 * Parse a Prometheus text-format response into structured metric samples.
 * Only handles the subset emitted by the worker metrics server:
 *   - Counter lines:   metric_name{labels} value
 *   - Untagged lines:  metric_name value
 * Comments (# HELP / # TYPE) are ignored.
 */
function parsePrometheusText(text: string): MetricSample[] {
  const samples: MetricSample[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments, TYPE/HELP lines, and blanks
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    // Try with labels: metric_name{key="val",key2="val2"} value
    const labelMatch = trimmed.match(
      /^(\w+)\{(.+)\}\s+(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/,
    );
    if (labelMatch) {
      const [, name, labelsStr, valueStr] = labelMatch;
      const labels: Record<string, string> = {};
      for (const pair of labelsStr.matchAll(/(\w+)="([^"]*)"/g)) {
        labels[pair[1]] = pair[2];
      }
      samples.push({ name, labels, value: parseFloat(valueStr) });
      continue;
    }

    // Try without labels: metric_name value
    const simpleMatch = trimmed.match(
      /^(\w+)\s+(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/,
    );
    if (simpleMatch) {
      samples.push({
        name: simpleMatch[1],
        labels: {},
        value: parseFloat(simpleMatch[2]),
      });
    }
  }

  return samples;
}

// ============================================
// Metric extraction helpers
// ============================================

interface ErrorRateResult {
  errorRatePercent: number;
  totalJobs: number;
  totalErrors: number;
}

/**
 * Compute the overall error rate from worker_jobs_total and
 * worker_job_errors_total metrics (aggregate — no labels).
 */
function computeErrorRate(samples: MetricSample[]): ErrorRateResult | null {
  let totalJobs = 0;
  let totalErrors = 0;
  let foundJobs = false;
  let foundErrors = false;

  for (const s of samples) {
    // Aggregate (no label) entries have no labels
    if (s.name === "worker_jobs_total" && Object.keys(s.labels).length === 0) {
      totalJobs = s.value;
      foundJobs = true;
    }
    if (
      s.name === "worker_job_errors_total" &&
      Object.keys(s.labels).length === 0
    ) {
      totalErrors = s.value;
      foundErrors = true;
    }
  }

  if (!foundJobs) return null;

  const rate =
    totalJobs > 0 ? (totalErrors / totalJobs) * 100 : foundErrors ? 100 : 0;

  return {
    errorRatePercent: Math.round(rate * 100) / 100,
    totalJobs,
    totalErrors,
  };
}

/**
 * Find the p99 duration value from worker_job_duration_ms samples.
 * Looks for a sample with quantile="0.99" or quantile="p99".
 */
function findP99LatencyMs(samples: MetricSample[]): number | null {
  for (const s of samples) {
    if (
      s.name === "worker_job_duration_ms" &&
      (s.labels["quantile"] === "0.99" || s.labels["quantile"] === "p99")
    ) {
      return s.value;
    }
  }
  return null;
}

// ============================================
// Public API
// ============================================

/**
 * Fetch RED metrics from /api/metrics and send a Slack alert if any
 * threshold is exceeded.
 *
 * If the metrics endpoint is unreachable or returns non-Prometheus data,
 * the function logs a warning and returns without alerting (no false
 * positives for infra issues).
 */
export async function evaluateAndAlert(
  thresholds?: Partial<AlertThresholds>,
): Promise<void> {
  const resolved: AlertThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...thresholds,
  };

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const metricsUrl = `${baseUrl.replace(/\/+$/, "")}/api/metrics`;

  let text: string;

  try {
    const response = await fetch(metricsUrl, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout?.(5000) ??
        // Fallback for older Node where AbortSignal.timeout isn't available
        abortSignalWithTimeout(5000),
    });

    if (!response.ok) {
      console.warn(
        `[REDAlert] /api/metrics returned ${response.status} — skipping evaluation`,
      );
      return;
    }

    text = await response.text();
  } catch (error) {
    console.warn(
      "[REDAlert] Could not fetch /api/metrics:",
      error instanceof Error ? error.message : String(error),
    );
    return;
  }

  const samples = parsePrometheusText(text);
  if (samples.length === 0) {
    console.warn("[REDAlert] No metrics found in response — skipping evaluation");
    return;
  }

  const violations: string[] = [];
  const attachmentFields: Array<{ title: string; value: string; short: boolean }> = [];

  // ── Error rate check ───────────────────────────────────────────
  const errorResult = computeErrorRate(samples);
  if (errorResult) {
    attachmentFields.push(
      { title: "Error Rate", value: `${errorResult.errorRatePercent}%`, short: true },
      { title: "Total Jobs", value: String(errorResult.totalJobs), short: true },
      { title: "Total Errors", value: String(errorResult.totalErrors), short: true },
    );

    if (errorResult.errorRatePercent > resolved.errorRatePercent) {
      violations.push(
        `Error rate ${errorResult.errorRatePercent}% exceeds threshold of ${resolved.errorRatePercent}%`,
      );
    }
  } else {
    attachmentFields.push({
      title: "Error Rate",
      value: "N/A (metrics not found)",
      short: false,
    });
  }

  // ── P99 latency check ──────────────────────────────────────────
  const p99 = findP99LatencyMs(samples);
  if (p99 !== null) {
    attachmentFields.push({
      title: "P99 Latency",
      value: `${p99}ms`,
      short: true,
    });

    if (p99 > resolved.p99LatencyMs) {
      violations.push(
        `P99 latency ${p99}ms exceeds threshold of ${resolved.p99LatencyMs}ms`,
      );
    }
  } else {
    attachmentFields.push({
      title: "P99 Latency",
      value: "N/A (metric not found)",
      short: false,
    });
  }

  if (violations.length === 0) {
    // All within thresholds — no alert needed
    return;
  }

  // ── Send Slack alert ───────────────────────────────────────────
  const attachments: SlackAttachment[] = [
    {
      color: "danger",
      title: "RED Metrics Threshold Breach",
      fields: attachmentFields,
      ts: Math.floor(Date.now() / 1000),
    },
  ];

  const summary =
    violations.length === 1
      ? violations[0]
      : `${violations.length} RED metric violations detected`;

  await sendSlackAlert({
    text: `[RED Alert] ${summary}`,
    attachments,
  });
}

// ============================================
// Helper: fallback timeout when AbortSignal.timeout is unavailable
// ============================================

function abortSignalWithTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}
