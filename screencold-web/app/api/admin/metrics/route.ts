import { NextResponse } from "next/server";
import Redis from "ioredis";
import { requireAdmin } from "@/lib/auth/require-admin";

const QUEUE_NAMES = ["audit", "email", "email-generation", "campaign"];

/**
 * GET /api/admin/metrics
 *
 * Returns BullMQ queue-level metrics for all worker queues.
 * Reads Redis directly using ioredis (BullMQ stores queue state as Redis lists/sets).
 * Admin-only access.
 */
export async function GET() {
  try {
    await requireAdmin();

    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
      lazyConnect: true,
    });

    try {
      await connection.connect();
    } catch {
      return NextResponse.json(
        { error: "Failed to connect to Redis" },
        { status: 503 }
      );
    }

    const queueMetrics: Record<string, unknown> = {};
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const name of QUEUE_NAMES) {
      const prefix = `bull:${name}`;
      try {
        // BullMQ stores job counts as list/set lengths in Redis
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          connection.llen(`${prefix}:wait`),
          connection.llen(`${prefix}:active`),
          connection.llen(`${prefix}:completed`),
          connection.llen(`${prefix}:failed`),
          connection.scard(`${prefix}:delayed`),
        ]);

        queueMetrics[name] = {
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed,
        };

        totalCompleted += completed;
        totalFailed += failed;
      } catch (err) {
        queueMetrics[name] = {
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }

    await connection.quit();

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      queues: queueMetrics,
      totals: {
        completed: totalCompleted,
        failed: totalFailed,
      },
    });
  } catch (e: unknown) {
    if (e instanceof Error && "status" in e) {
      return NextResponse.json(
        { error: e.message },
        { status: (e as any).status }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
