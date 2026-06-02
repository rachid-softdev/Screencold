import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/require-admin";

/**
 * Proxy endpoint that scrapes the worker's RED metrics in Prometheus format.
 *
 * When the worker is running, this returns the raw Prometheus text.
 * If the worker is unreachable, it returns a 503 JSON error.
 *
 * Admin-only access — uses requireAdmin() to guard.
 */

const WORKER_METRICS_URL =
  process.env.WORKER_METRICS_URL ?? "http://localhost:9091/metrics";

const FETCH_TIMEOUT_MS = 2_000;

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

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
    return NextResponse.json(
      {
        worker: "unreachable",
        error: "Worker metrics unreachable",
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
