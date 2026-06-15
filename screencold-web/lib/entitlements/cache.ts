import Redis from 'ioredis';

// ============================================
// Cache Service - Two-level caching (Redis + Memory)
// ============================================

// Singleton Redis client (lazy initialization)
let redisClient: Redis | null = null;
let redisConnectionAttempted = false;

// Memory cache with LRU eviction
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 100; // Max entries
  private defaultTTL = 30000; // 30 seconds

  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global memory cache instance
const memoryCache = new MemoryCache();

// Cache configuration
const CACHE_CONFIG = {
  ENTITLEMENTS_TTL: 5 * 60 * 1000, // 5 minutes (Redis)
  MEMORY_TTL: 30 * 1000, // 30 seconds (Memory fallback)
  KEY_PREFIX: 'entitlements:',
};

// ============================================
// Redis Client (Lazy Initialization)
// ============================================

function getRedisClient(): Redis | null {
  if (redisConnectionAttempted) return redisClient;
  redisConnectionAttempted = true;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[EntitlementsCache] REDIS_URL not configured, using memory fallback');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: true,
    });

    redisClient.on('error', (err) => {
      console.error('[EntitlementsCache] Redis error:', err.message);
      redisClient = null;
    });

    return redisClient;
  } catch (error) {
    console.error('[EntitlementsCache] Failed to initialize Redis:', error);
    return null;
  }
}

// ============================================
// Cache Service Interface
// ============================================

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
}

// ============================================
// Cache Service Implementation
// ============================================

export class EntitlementsCacheService implements ICacheService {
  private redis: Redis | null;
  private useRedis: boolean;

  constructor() {
    this.redis = getRedisClient();
    this.useRedis = this.redis !== null;
  }

  private getKey(key: string): string {
    return `${CACHE_CONFIG.KEY_PREFIX}${key}`;
  }

  /**
   * Get value from cache (Redis first, then memory)
   */
  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.getKey(key);

    // Try Redis first
    if (this.useRedis && this.redis) {
      try {
        const redisValue = await this.redis.get(cacheKey);
        if (redisValue) {
          const parsed = JSON.parse(redisValue) as T;
          // Also store in memory for faster subsequent access
          memoryCache.set(key, parsed, CACHE_CONFIG.MEMORY_TTL);
          return parsed;
        }
      } catch (error) {
        console.warn('[EntitlementsCache] Redis get failed, falling back to memory:', error);
      }
    }

    // Fallback to memory cache
    return memoryCache.get<T>(key);
  }

  /**
   * Set value in cache (both Redis and memory)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheKey = this.getKey(key);
    const redisTTL = ttl ?? CACHE_CONFIG.ENTITLEMENTS_TTL;
    const memoryTTL = CACHE_CONFIG.MEMORY_TTL;

    // Store in memory cache
    memoryCache.set(key, value, memoryTTL);

    // Store in Redis if available
    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(cacheKey, Math.floor(redisTTL / 1000), JSON.stringify(value));
      } catch (error) {
        console.warn('[EntitlementsCache] Redis set failed:', error);
      }
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.getKey(key);

    // Remove from memory
    memoryCache.delete(key);

    // Remove from Redis if available
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        console.warn('[EntitlementsCache] Redis delete failed:', error);
      }
    }
  }

  /**
   * Delete keys matching pattern (for fan-out invalidation)
   */
  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = this.getKey(pattern);

    // Clear matching memory entries
    const keys = Array.from(memoryCache.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern.replace(CACHE_CONFIG.KEY_PREFIX, ''))) {
        memoryCache.delete(key);
      }
    }

    // Clear matching Redis entries
    if (this.useRedis && this.redis) {
      try {
        const redisKeys = await this.redis.keys(fullPattern);
        if (redisKeys.length > 0) {
          await this.redis.del(...redisKeys);
        }
      } catch (error) {
        console.warn('[EntitlementsCache] Redis pattern delete failed:', error);
      }
    }
  }

  /**
   * Invalidate all cache for an organization (calls deletePattern for fan-out)
   */
  async invalidateOrg(orgId: string): Promise<void> {
    await this.delete(orgId);
  }

  /**
   * Publish cache invalidation to other instances (if Redis pub/sub available)
   */
  async publishInvalidation(orgId: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.publish('entitlements:invalidate', orgId);
      } catch (error) {
        console.warn('[EntitlementsCache] Failed to publish invalidation:', error);
      }
    }
  }

  /**
   * Subscribe to invalidation events (for multi-instance support)
   */
  async subscribeToInvalidations(callback: (orgId: string) => void): Promise<void> {
    if (this.useRedis && this.redis) {
      const subscriber = this.redis.duplicate();
      await subscriber.subscribe('entitlements:invalidate');
      subscriber.on('message', (_channel, message) => {
        callback(message);
      });
    }
  }
}

// Singleton instance
let cacheService: EntitlementsCacheService | null = null;

export function getCacheService(): EntitlementsCacheService {
  if (!cacheService) {
    cacheService = new EntitlementsCacheService();
  }
  return cacheService;
}

export { CACHE_CONFIG };

/**
 * Clear the global memory cache (used in tests to prevent stale state)
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}