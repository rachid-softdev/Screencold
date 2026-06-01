import IORedis from 'ioredis';
import { NextRequest } from 'next/server';

// Use the same Redis connection as rate-limit.ts
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    // Exponential backoff, max 30s between retries
    return Math.min(times * 50, 30000);
  },
});

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Key prefix for Redis */
  prefix: string;
  /** Whether this endpoint should fail closed (deny) when Redis is down */
  failClosed?: boolean;
}

/**
 * Default rate limit configurations per route type
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  public: { limit: 60, windowSeconds: 60, prefix: 'rl:ip', failClosed: false },
  authenticated: { limit: 200, windowSeconds: 60, prefix: 'rl:user', failClosed: false },
  api: { limit: 300, windowSeconds: 60, prefix: 'rl:api', failClosed: false },
  auth: { limit: 10, windowSeconds: 60, prefix: 'rl:auth', failClosed: true }, // Strict for login/register
};

/**
 * Configuration for rate limit fail behavior.
 *
 * RATE_LIMIT_FAIL_OPEN env var:
 * - "true"  (default): Fail open — allow requests when Redis is down.
 * - "false":           Fail closed — deny requests when Redis is down.
 *
 * Auth endpoints always fail-closed regardless of this setting,
 * but the per-config failClosed flag takes precedence.
 */
function shouldFailOpen(config: RateLimitConfig): boolean {
  // If the route is explicitly configured as fail-closed, respect that
  if (config.failClosed) {
    return false;
  }

  // For other endpoints, respect the env var (default: fail open)
  return process.env.RATE_LIMIT_FAIL_OPEN !== 'false';
}

/**
 * Determine the rate limit config based on the request path
 */
function getConfigForRequest(request: NextRequest): RateLimitConfig {
  const path = request.nextUrl.pathname;

  // Auth endpoints get stricter limits and fail-closed behavior
  if (
    path.startsWith('/api/auth/') ||
    path.startsWith('/api/register')
  ) {
    return RATE_LIMIT_CONFIGS.auth;
  }

  // Public API endpoints
  if (path.startsWith('/api/')) {
    return RATE_LIMIT_CONFIGS.api;
  }

  return RATE_LIMIT_CONFIGS.public;
}

/**
 * Extract identifier for rate limiting (IP or user ID)
 */
function getRateLimitKey(request: NextRequest): string {
  // Try to get the user ID from the x-user-id header set by apiMiddleware
  const userId = request.headers.get('x-user-id');
  if (userId) {
    const config = RATE_LIMIT_CONFIGS.authenticated;
    return `${config.prefix}:${userId}`;
  }

  // Fall back to IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const config = getConfigForRequest(request);
  const sanitizedIp = ip.replace(/[:.]/g, '_');
  return `${config.prefix}:${sanitizedIp}`;
}

/**
 * Check rate limit using Redis fixed-window counter.
 * Returns rate limit headers to attach to the response.
 */
export async function getRateLimitHeaders(
  request: NextRequest
): Promise<Record<string, string>> {
  const config = getConfigForRequest(request);
  const key = getRateLimitKey(request);
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `${key}:${Math.floor(now / config.windowSeconds)}`;

  try {
    const multi = redis.multi();
    multi.incr(windowKey);
    multi.expire(windowKey, config.windowSeconds);
    const results = await multi.exec();

    const count = (results?.[0]?.[1] as number) ?? 0;
    const remaining = Math.max(0, config.limit - count);
    const resetAt = (Math.floor(now / config.windowSeconds) + 1) * config.windowSeconds;

    return {
      'X-RateLimit-Limit': String(config.limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(resetAt),
    };
  } catch (error) {
    console.error('[RedisRateLimit] Error:', error);
    
    // Respect fail-open/fail-closed configuration
    if (!shouldFailOpen(config)) {
      // Fail closed — return headers indicating rate limit exceeded
      return {
        'X-RateLimit-Limit': String(config.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(now + config.windowSeconds),
      };
    }

    // Fail open — allow request if Redis is down (for non-auth endpoints)
    return {
      'X-RateLimit-Limit': String(config.limit),
      'X-RateLimit-Remaining': String(config.limit),
      'X-RateLimit-Reset': String(now + config.windowSeconds),
    };
  }
}

/**
 * Check if request is within rate limit (boolean).
 * Used in middleware before allowing the request through.
 */
export async function checkRateLimit(
  request: NextRequest
): Promise<boolean> {
  const config = getConfigForRequest(request);
  const key = getRateLimitKey(request);
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `${key}:${Math.floor(now / config.windowSeconds)}`;

  try {
    const multi = redis.multi();
    multi.incr(windowKey);
    multi.expire(windowKey, config.windowSeconds);
    const results = await multi.exec();

    const count = (results?.[0]?.[1] as number) ?? 0;
    return count <= config.limit;
  } catch (error) {
    console.error('[RedisRateLimit] Error:', error);
    
    // Respect fail-open/fail-closed configuration
    if (!shouldFailOpen(config)) {
      // Fail closed — deny request when Redis is down
      return false;
    }

    // Fail open — allow request if Redis is down (for non-auth endpoints)
    return true;
  }
}

export default redis;
