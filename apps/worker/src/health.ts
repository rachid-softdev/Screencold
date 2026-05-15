/**
 * Health check for Worker service
 * Checks Redis, Database, and BullMQ queue status
 */

import IORedis from 'ioredis';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    redis: HealthCheckResult;
    database: HealthCheckResult;
    queues: QueueHealthCheck;
  };
}

interface HealthCheckResult {
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
}

interface QueueHealthCheck {
  status: 'ok' | 'error' | 'degraded';
  queues: {
    name: string;
    paused: number;
    active: number;
    waiting: number;
    failed: number;
  }[];
  error?: string;
}

/**
 * Check Redis connection
 */
async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    
    await redis.connect();
    const result = await redis.ping();
    
    await redis.quit();
    
    if (result !== 'PONG') {
      return {
        status: 'error',
        error: 'Unexpected Redis response',
        latency: Date.now() - startTime,
      };
    }
    
    return {
      status: 'ok',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Check database connection
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Use the existing prisma client from db/index.ts
    const { prisma } = await import('./db');
    
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: 'ok',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Check BullMQ queue status
 */
async function checkQueues(): Promise<QueueHealthCheck> {
  try {
    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });
    
    const queueNames = ['audit', 'email', 'campaign'];
    const queueResults = await Promise.all(
      queueNames.map(async (name) => {
        const [paused, active, waiting, failed] = await Promise.all([
          redis.llen(`bull:${name}:paused`),
          redis.llen(`bull:${name}:active`),
          redis.llen(`bull:${name}:wait`),
          redis.llen(`bull:${name}:failed`),
        ]);
        
        return {
          name,
          paused,
          active,
          waiting,
          failed,
        };
      })
    );
    
    await redis.quit();
    
    // Check if any queue has many failed jobs
    const hasManyFailed = queueResults.some(q => q.failed > 10);
    const hasActiveJobs = queueResults.some(q => q.active > 0 || q.waiting > 0);
    
    return {
      status: hasManyFailed ? 'degraded' : 'ok',
      queues: queueResults,
    };
  } catch (error) {
    return {
      status: 'error',
      queues: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main health check function
 */
export async function checkHealth(): Promise<HealthStatus> {
  const [redis, database, queues] = await Promise.all([
    checkRedis(),
    checkDatabase(),
    checkQueues(),
  ]);
  
  const overallHealthy = 
    redis.status === 'ok' && 
    database.status === 'ok' && 
    queues.status !== 'error';
  
  return {
    status: overallHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.WORKER_VERSION || '1.0.0',
    checks: {
      redis,
      database,
      queues,
    },
  };
}

/**
 * Liveness check - simple check if worker is running
 */
export function isAlive(): boolean {
  return true;
}

/**
 * Readiness check - if worker can handle jobs
 */
export async function isReady(): Promise<boolean> {
  const health = await checkHealth();
  return health.status === 'healthy';
}