/**
 * Worker Metrics HTTP Server
 *
 * Exposes RED metrics (Rate, Errors, Duration) from the worker process
 * in Prometheus text format for scraping by the web app or monitoring tools.
 *
 * Listens on WORKER_METRICS_PORT (default 9091) and serves GET /metrics.
 */

import http from "http";
import { getMetrics } from "./metrics";
import type { REDMetricsSnapshot } from "./metrics";

// ============================================
// Constants
// ============================================

const METRICS_PORT = parseInt(
  process.env.WORKER_METRICS_PORT ?? "9091",
  10,
);

const MIME_TEXT_PLAIN = "text/plain; charset=utf-8";
const MIME_APPLICATION_JSON = "application/json; charset=utf-8";

// ============================================
// Prometheus metric names
// ============================================

const METRIC_JOBS_TOTAL = "worker_jobs_total";
const METRIC_JOB_ERRORS_TOTAL = "worker_job_errors_total";
const METRIC_JOB_DURATION_MS = "worker_job_duration_ms";

// ============================================
// Formatting helpers
// ============================================

function formatCounterLine(
  name: string,
  value: number,
  labels?: Record<string, string>,
): string {
  if (labels && Object.keys(labels).length > 0) {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
    return `${name}{${labelStr}} ${value}`;
  }
  return `${name} ${value}`;
}

function formatSummaryLine(
  name: string,
  quantile: string,
  value: number,
  labels?: Record<string, string>,
): string {
  const allLabels = { ...labels, quantile };
  const labelStr = Object.entries(allLabels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(",");
  return `${name}{${labelStr}} ${value}`;
}

/**
 * Build the full Prometheus text output from a RED metrics snapshot.
 */
function buildMetricsOutput(snapshot: REDMetricsSnapshot): string {
  const lines: string[] = [];

  // ── worker_jobs_total ──────────────────────────────────────────
  lines.push(`# HELP ${METRIC_JOBS_TOTAL} Total number of jobs started`);
  lines.push(`# TYPE ${METRIC_JOBS_TOTAL} counter`);

  const jobTypes = Object.keys(snapshot.byType).sort();
  for (const type of jobTypes) {
    lines.push(
      formatCounterLine(METRIC_JOBS_TOTAL, snapshot.byType[type].rate, {
        job_type: type,
      }),
    );
  }
  // Aggregate (no labels)
  lines.push(formatCounterLine(METRIC_JOBS_TOTAL, snapshot.rate));
  lines.push("");

  // ── worker_job_errors_total ────────────────────────────────────
  lines.push(`# HELP ${METRIC_JOB_ERRORS_TOTAL} Total number of job errors`);
  lines.push(`# TYPE ${METRIC_JOB_ERRORS_TOTAL} counter`);

  for (const type of jobTypes) {
    lines.push(
      formatCounterLine(METRIC_JOB_ERRORS_TOTAL, snapshot.byType[type].errors, {
        job_type: type,
      }),
    );
  }
  // Aggregate (no labels)
  lines.push(formatCounterLine(METRIC_JOB_ERRORS_TOTAL, snapshot.errors));
  lines.push("");

  // ── worker_job_duration_ms ─────────────────────────────────────
  lines.push(
    `# HELP ${METRIC_JOB_DURATION_MS} Job duration in milliseconds`,
  );
  lines.push(`# TYPE ${METRIC_JOB_DURATION_MS} summary`);

  for (const type of jobTypes) {
    const d = snapshot.byType[type].duration;
    lines.push(
      formatSummaryLine(METRIC_JOB_DURATION_MS, "avg", d.avg, {
        job_type: type,
      }),
    );
    lines.push(
      formatSummaryLine(METRIC_JOB_DURATION_MS, "min", d.min, {
        job_type: type,
      }),
    );
    lines.push(
      formatSummaryLine(METRIC_JOB_DURATION_MS, "max", d.max, {
        job_type: type,
      }),
    );
  }
  // Aggregate quantiles (no job_type label)
  const agg = snapshot.duration;
  lines.push(formatSummaryLine(METRIC_JOB_DURATION_MS, "avg", agg.avg));
  lines.push(formatSummaryLine(METRIC_JOB_DURATION_MS, "min", agg.min));
  lines.push(formatSummaryLine(METRIC_JOB_DURATION_MS, "max", agg.max));

  // Trailing newline (Prometheus format requires blank line at end)
  lines.push("");

  return lines.join("\n");
}

// ============================================
// Request handler
// ============================================

function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  // CORS headers (matching existing health server pattern)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? "";

  try {
    if (url === "/metrics") {
      const snapshot = getMetrics();
      const output = buildMetricsOutput(snapshot);
      res.writeHead(200, { "Content-Type": MIME_TEXT_PLAIN });
      res.end(output);
      return;
    }

    // 404 for unknown paths
    res.writeHead(404, { "Content-Type": MIME_APPLICATION_JSON });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": MIME_APPLICATION_JSON });
    res.end(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );
  }
}

// ============================================
// Factory
// ============================================

/**
 * Create and return an HTTP server that exposes RED metrics at GET /metrics.
 *
 * The caller is responsible for calling `.listen()` and `.close()`.
 */
export function createMetricsServer(): http.Server {
  return http.createServer(handleRequest);
}

/**
 * Start the metrics server on the configured port and log the binding.
 * Returns the server instance for later shutdown.
 */
export function startMetricsServer(logger?: {
  info: (msg: string) => void;
}): http.Server {
  const port = METRICS_PORT;
  const server = createMetricsServer();

  server.listen(port, "127.0.0.1", () => {
    const log = logger ?? { info: () => {} };
    log.info(`Metrics server listening on 127.0.0.1:${port}`);
  });

  // Allow the process to exit even if this server is still listening
  server.unref();

  return server;
}
