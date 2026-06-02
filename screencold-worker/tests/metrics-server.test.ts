/**
 * Worker Metrics HTTP Server Tests
 *
 * Covers:
 * - Server starts and responds to GET /metrics with 200
 * - Response is valid Prometheus text format
 * - 404 for unknown paths
 * - Server shutdown
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "http";
import { createMetricsServer } from "../lib/metrics-server";

// ============================================
// Helpers
// ============================================

/**
 * Start a server on a random port (port 0) and return the address info.
 */
function startServer(server: http.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        resolve(addr.port);
      } else {
        reject(new Error("Failed to get server port"));
      }
    });
    server.on("error", reject);
  });
}

/**
 * Perform an HTTP GET request and return status code, headers, and body.
 */
function fetch(
  port: number,
  path: string,
): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      `http://127.0.0.1:${port}${path}`,
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf-8"),
            headers: res.headers,
          });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error("Request timed out"));
    });
  });
}

// ============================================
// Tests
// ============================================

describe("Metrics HTTP Server", () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    server = createMetricsServer();
    port = await startServer(server);
  });

  afterEach(() => {
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // ============================================
  // GET /metrics
  // ============================================

  describe("GET /metrics", () => {
    it("should respond with status 200", async () => {
      const res = await fetch(port, "/metrics");
      expect(res.status).toBe(200);
    });

    it("should have Content-Type text/plain; charset=utf-8", async () => {
      const res = await fetch(port, "/metrics");
      expect(res.headers["content-type"]).toBe("text/plain; charset=utf-8");
    });

    it("should return valid Prometheus text format", async () => {
      const res = await fetch(port, "/metrics");

      // Must include expected HELP and TYPE lines
      expect(res.body).toContain("# HELP worker_jobs_total Total number of jobs started");
      expect(res.body).toContain("# TYPE worker_jobs_total counter");
      expect(res.body).toContain("# HELP worker_job_errors_total Total number of job errors");
      expect(res.body).toContain("# TYPE worker_job_errors_total counter");
      expect(res.body).toContain("# HELP worker_job_duration_ms Job duration in milliseconds");
      expect(res.body).toContain("# TYPE worker_job_duration_ms summary");

      // Must include aggregate metric lines (no labels)
      expect(res.body).toMatch(/^worker_jobs_total \d+$/m);
      expect(res.body).toMatch(/^worker_job_errors_total \d+$/m);

      // Must include quantile summary lines
      expect(res.body).toMatch(/^worker_job_duration_ms\{quantile="avg"\} \d+$/m);
      expect(res.body).toMatch(/^worker_job_duration_ms\{quantile="min"\} \d+$/m);
      expect(res.body).toMatch(/^worker_job_duration_ms\{quantile="max"\} \d+$/m);

      // Should end with a trailing newline (Prometheus format convention)
      expect(res.body.endsWith("\n")).toBe(true);
    });

    it("should include per-job-type metrics when types exist", async () => {
      // Arrange - record some metrics
      const { recordJobStart, recordJobEnd, recordJobError } = await import(
        "../lib/metrics"
      );
      recordJobStart("test-type");
      recordJobStart("test-type");
      recordJobEnd("test-type", 100);
      recordJobError("test-type");

      const res = await fetch(port, "/metrics");

      // Must include job_type labels
      expect(res.body).toContain('worker_jobs_total{job_type="test-type"} 2');
      expect(res.body).toContain('worker_job_errors_total{job_type="test-type"} 1');
      expect(res.body).toContain(
        'worker_job_duration_ms{job_type="test-type",quantile="avg"} 100',
      );
      expect(res.body).toContain(
        'worker_job_duration_ms{job_type="test-type",quantile="min"} 100',
      );
      expect(res.body).toContain(
        'worker_job_duration_ms{job_type="test-type",quantile="max"} 100',
      );
    });
  });

  // ============================================
  // Unknown paths
  // ============================================

  describe("unknown paths", () => {
    it("should return 404 for /nonexistent", async () => {
      const res = await fetch(port, "/nonexistent");
      expect(res.status).toBe(404);
    });

    it('should return 404 for /health', async () => {
      const res = await fetch(port, "/health");
      expect(res.status).toBe(404);
    });

    it("should return JSON error body for 404", async () => {
      const res = await fetch(port, "/bogus");
      const body = JSON.parse(res.body);
      expect(body).toEqual({ error: "Not found" });
    });
  });

  // ============================================
  // Server shutdown
  // ============================================

  describe("server shutdown", () => {
    it("should close without error", async () => {
      // close is called in afterEach; verify it resolves cleanly
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      expect(true).toBe(true); // reached without throwing
    });

    it("should reject connections after close", async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));

      // After close, new connections should fail (ECONNREFUSED or timeout)
      const req = http.get(`http://127.0.0.1:${port}/metrics`, () => {});
      const connectionResult = await new Promise<string>((resolve) => {
        req.on("error", (err: NodeJS.ErrnoException) => {
          resolve(err.code ?? "error");
        });
        req.on("response", () => {
          resolve("unexpected-response");
        });
        req.setTimeout(1000, () => {
          req.destroy();
          resolve("timeout");
        });
      });

      // Should not get a successful response after the server is closed
      expect(connectionResult).not.toBe("unexpected-response");
    });
  });
});
