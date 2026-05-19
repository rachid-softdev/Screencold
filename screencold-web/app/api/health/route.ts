import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    // Simple TCP check - try to connect
    const { createConnection } = await import('net');
    const url = new URL(redisUrl);
    return new Promise((resolve) => {
      const socket = createConnection({
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        timeout: 3000,
      });
      socket.on('connect', () => {
        socket.destroy();
        resolve({ status: 'healthy', time: Date.now() - start });
      });
      socket.on('error', (err) => {
        socket.destroy();
        resolve({
          status: 'unhealthy',
          error: err.message,
          time: Date.now() - start,
        });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          status: 'unhealthy',
          error: 'Connection timeout',
          time: Date.now() - start,
        });
      });
    });
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Redis error',
      time: Date.now() - start,
    };
  }
}

async function checkQueueDepth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Check if we can reach the queue by checking pending audits
    const pendingCount = await prisma.audit.count({
      where: { status: 'PROCESSING' },
    });
    const status = pendingCount > 100 ? 'degraded' : 'healthy';
    return { status, time: Date.now() - start };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Queue check error',
      time: Date.now() - start,
    };
  }
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  const checks: Record<string, HealthCheck> = {};

  try {
    // Run all checks in parallel
    const [dbResult, redisResult, queueResult] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkQueueDepth(),
    ]);

    checks.database = dbResult;
    checks.redis = redisResult;
    checks.queue = queueResult;

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
