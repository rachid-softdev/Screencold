import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ============================================
// GET /api/health - Health check endpoint
// ============================================

export async function GET(request: NextRequest) {
  const start = Date.now();
  const checks: Record<string, { status: string; time?: number; error?: string }> = {};

  try {
    // Check database
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        time: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database error',
      };
    }

    // Check Redis (optional - just verify we can create a connection)
    const redisStart = Date.now();
    try {
      // In production, you'd actually check Redis
      // For now, we'll just note it's not checked in this simple version
      checks.redis = {
        status: 'not_checked',
        time: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Redis error',
      };
    }

    const totalTime = Date.now() - start;
    const allHealthy = Object.values(checks).every(
      (check) => check.status === 'healthy' || check.status === 'not_checked'
    );

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime?.() || 0,
      version: process.env.npm_package_version || '1.0.0',
      checks,
      responseTime: totalTime,
    }, {
      status: allHealthy ? 200 : 503,
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
export async function HEAD(request: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}