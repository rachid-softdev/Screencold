import { NextResponse } from "next/server";

/**
 * Proxy endpoint that scrapes the worker's RED metrics in Prometheus format.
 *
 * When the worker is running, this returns the raw Prometheus text.
 * If the worker is unreachable, it returns a 503 JSON error.
 */

const WORKER_METRICS_URL =
  process.env.WORKER_METRICS_URL ?? "http://localhost:9091/metrics";

const FETCH_TIMEOUT_MS = 2_000;

export async function GET(): Promise<NextResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(WORKER_METRICS_URL, {
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    });

    if (!response.ok) {
      // Worker responded but with an error status
      return NextResponse.json(
        {
          worker: "error",
          status: response.status,
          statusText: response.statusText,
        },
        { status: 502 },
      );
    }

    const text = await response.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    // Worker is unreachable (network error, timeout, refused, etc.)
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        worker: "unreachable",
        error: message,
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
