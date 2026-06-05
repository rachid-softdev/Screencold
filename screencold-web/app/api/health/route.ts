import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Redis } from 'ioredis';

interface HealthCheck {
  status: string;
  time?: number;
  error?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', time: Date.now() - start };
  } catch {
    return {
      status: 'unhealthy',
      error: 'Database check failed',
      time: Date.now() - start,
    };
  }
}

// Singleton Redis connection for health checks — avoids creating a new
// connection on every request (which caused port exhaustion under load).
let redisConnection: Redis | null = null;

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!redisConnection) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      redisConnection = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: () => null,
      });
      await redisConnection.connect();
    }

    await redisConnection.ping();
    return { status: 'healthy', time: Date.now() - start };
  } catch {
    // Connection lost — recreate on next check
    redisConnection = null;
    return {
      status: 'unhealthy',
      error: 'Redis check failed',
      time: Date.now() - start,
    };
  }
}

async function checkWorker(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const workerMetricsUrl =
      process.env.WORKER_METRICS_URL ?? 'http://localhost:9091/metrics';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(workerMetricsUrl, {
        signal: controller.signal,
        headers: { Accept: 'text/plain' },
      });

      if (response.ok) {
        return { status: 'healthy', time: Date.now() - start };
      }

      return {
        status: 'degraded',
        error: 'Worker responded with error status',
        time: Date.now() - start,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return {
      status: 'unreachable',
      error: 'Worker metrics unreachable',
      time: Date.now() - start,
    };
  }
}

export async function GET(_request: NextRequest) {
  const start = Date.now();
  const checks: Record<string, HealthCheck> = {};

  try {
    // Run all checks in parallel
    const [dbResult, redisResult, workerResult] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkWorker(),
    ]);

    checks.database = dbResult;
    checks.redis = redisResult;
    checks.worker = workerResult;

    const totalTime = Date.now() - start;
    const allHealthy = Object.values(checks).every(
      (check) => check.status === 'healthy'
    );
    const anyUnhealthy = Object.values(checks).some(
      (check) => check.status === 'unhealthy'
    );

    const overallStatus = anyUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded';

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime?.() || 0,
      version: process.env.npm_package_version || '1.0.0',
      checks,
      responseTime: totalTime,
    }, {
      status: overallStatus === 'unhealthy' ? 503 : 200,
    });
  } catch (error) {
    console.error('[Health] Check failed:', error);

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      checks,
    }, { status: 503 });
  }
}

// Basic HEAD request for load balancer health checks
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
