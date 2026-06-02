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
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database error',
      time: Date.now() - start,
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  let connection: Redis | null = null;
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    connection = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: () => null, // No retries for health check
    });
    await connection.connect();
    await connection.ping();
    return { status: 'healthy', time: Date.now() - start };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Redis error',
      time: Date.now() - start,
    };
  } finally {
    if (connection) {
      try {
        await connection.quit();
      } catch {
        // Ignore disconnect errors
      }
    }
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
        error: `Worker responded with status ${response.status}`,
        time: Date.now() - start,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return {
      status: 'unreachable',
      error: error instanceof Error ? error.message : 'Worker unreachable',
      time: Date.now() - start,
    };
  }
}

export async function GET(request: NextRequest) {
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
