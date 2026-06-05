import IORedis from 'ioredis';

function getRedis(): IORedis {
  return new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Configuration for rate limit fail behavior.
 *
 * RATE_LIMIT_FAIL_OPEN env var:
 * - "true"  (default): Fail open  allow requests when Redis is down.
 * - "false":           Fail closed  deny requests when Redis is down.
 *
 * Auth endpoints always fail-closed regardless of this setting
 * to prevent brute-force attacks during Redis outages.
 */
function shouldFailOpen(isAuthEndpoint: boolean = false): boolean {
  // Auth endpoints always fail closed (security-critical)
  if (isAuthEndpoint) {
    return false;
  }

  // For other endpoints, respect the env var (default: fail open)
  return process.env.RATE_LIMIT_FAIL_OPEN !== 'false';
}

/**
 * Rate limiter using Redis for distributed rate limiting
 * Uses sliding window algorithm
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number = 60,
  isAuthEndpoint: boolean = false
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const redisKey = `ratelimit:${key}`;

  try {
    // Use Redis transaction for atomic operations
    const pipeline = getRedis().pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(redisKey);
    
    // Get oldest entry for reset calculation
    pipeline.zrange(redisKey, 0, 0, 'WITHSCORES');
    
    const results = await pipeline.exec();
    
    const currentCount = results?.[1]?.[1] as number || 0;
    const oldestEntry = results?.[2]?.[1] as string[] || [];
    
    if (currentCount >= limit) {
      const resetAt = oldestEntry.length > 1 
        ? Math.ceil(Number(oldestEntry[1]) / 1000) + windowSeconds 
        : Math.ceil(now / 1000) + windowSeconds;
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add new request to the window
    const requestId = `${now}-${Math.random().toString(36).substr(2, 9)}`;
    await getRedis().zadd(redisKey, now, requestId);
    await getRedis().expire(redisKey, windowSeconds);

    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetAt: Math.ceil(now / 1000) + windowSeconds,
    };
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    
    // Respect fail-open/fail-closed configuration
    if (!shouldFailOpen(isAuthEndpoint)) {
      // Fail closed  deny request when Redis is down
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil(now / 1000) + windowSeconds,
      };
    }

    // Fail open  allow request if Redis is down (for non-auth endpoints)
    return {
      allowed: true,
      remaining: limit,
      resetAt: Math.ceil(now / 1000) + windowSeconds,
    };
  }
}

/**
 * Rate limit by user ID (for authenticated requests)
 */
export async function checkUserRateLimit(
  userId: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  return checkRateLimit(`user:${userId}`, limit, windowSeconds);
}

/**
 * Rate limit by IP address (for public endpoints)
 */
export async function checkIpRateLimit(
  ip: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  // Sanitize IP for use as key
  const sanitizedIp = ip.replace(/[:.]/g, '_');
  return checkRateLimit(`ip:${sanitizedIp}`, limit, windowSeconds);
}

/**
 * Rate limit by API key
 */
export async function checkApiKeyRateLimit(
  keyId: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  return checkRateLimit(`apikey:${keyId}`, limit, windowSeconds);
}


