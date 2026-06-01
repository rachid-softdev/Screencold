/**
 * Rate Limit Tests (lib/rate-limit.ts)
 *
 * Covers:
 * - checkRateLimit - sliding window algorithm, allowed/blocked states
 * - checkUserRateLimit - per-user rate limiting
 * - checkIpRateLimit - per-IP rate limiting
 * - checkApiKeyRateLimit - per-API-key rate limiting
 * - Sliding window behavior (old entries removed, count accurate)
 * - Overflow protection (limit reached -> blocked)
 * - Fail-open behavior when Redis is unavailable
 * - Proper resetAt calculation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// Mocks -- ioredis is created at module import time
// We must mock before any imports of rate-limit.
// Use vi.hoisted() so variables exist before vi.mock() factories run.
// ============================================

const { mockPipeline, mockRedisInstance } = vi.hoisted(() => {
  const mPipeline = vi.fn();
  const mRedisInstance = {
    pipeline: mPipeline,
    zadd: vi.fn(),
    expire: vi.fn(),
    on: vi.fn().mockReturnThis(),
    status: 'ready',
    quit: vi.fn().mockResolvedValue('OK'),
  };
  return { mockPipeline: mPipeline, mockRedisInstance: mRedisInstance };
});

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedisInstance),
}));

import {
  checkRateLimit,
  checkUserRateLimit,
  checkIpRateLimit,
  checkApiKeyRateLimit,
} from '@/lib/rate-limit';

// ============================================
// Helpers
// ============================================

/**
 * Sets up pipeline.exec() to return given results.
 * Each result is [error, value] as per ioredis pipeline convention.
 *
 * @param zremResult  Value returned for ZREMRANGEBYSCORE
 * @param zcardResult Value returned for ZCARD (current count in window)
 * @param zrangeResult Value returned for ZRANGE WITHSCORES
 *   Format: [member1, score1, member2, score2, ...]
 *   Pass empty array for no oldest entry.
 */
function setupPipelineResults(
  zremResult: number | null = 0,
  zcardResult: number = 0,
  zrangeResult: string[] = []
) {
  const mockExec = vi.fn().mockResolvedValue([
    [null, zremResult],
    [null, zcardResult],
    [null, zrangeResult],
  ]);

  const mockPipelineObj = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    zrange: vi.fn().mockReturnThis(),
    exec: mockExec,
  };

  mockPipeline.mockReturnValue(mockPipelineObj);

  // Ensure zadd and expire succeed by default
  mockRedisInstance.zadd.mockResolvedValue(1);
  mockRedisInstance.expire.mockResolvedValue(1);

  return { mockPipelineObj, mockExec };
}

// ============================================
// Rate Limit Tests
// ============================================

describe('rate limit', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // Reset calls AND implementations
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ============================================
  // checkRateLimit
  // ============================================

  describe('checkRateLimit', () => {
    it('should allow request when under the limit', async () => {
      setupPipelineResults(0, 3, []);

      const result = await checkRateLimit('test-key', 10, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(6); // 10 - 3 - 1 = 6
      expect(result.resetAt).toBeGreaterThan(0);

      // Pipeline was constructed
      expect(mockPipeline).toHaveBeenCalledOnce();
      const pipelineObj = mockPipeline.mock.results[0].value;
      expect(pipelineObj.zremrangebyscore).toHaveBeenCalled();
      expect(pipelineObj.zcard).toHaveBeenCalled();
      expect(pipelineObj.zrange).toHaveBeenCalledWith(
        expect.any(String),
        0,
        0,
        'WITHSCORES'
      );

      // New entry was added
      expect(mockRedisInstance.zadd).toHaveBeenCalledOnce();
      expect(mockRedisInstance.expire).toHaveBeenCalledWith(
        expect.any(String),
        60
      );
    });

    it('should include request-specific random ID in Redis entry', async () => {
      setupPipelineResults(0, 0, []);

      await checkRateLimit('key-1', 10, 60);

      // zadd called with 3 args: key, score, member
      expect(mockRedisInstance.zadd).toHaveBeenCalledWith(
        'ratelimit:key-1',
        expect.any(Number),
        expect.stringMatching(/^\d+-[a-z0-9]{9}$/)
      );
    });

    it('should set correct remaining count at various usage levels', async () => {
      setupPipelineResults(0, 2, []);
      const result50 = await checkRateLimit('key-half', 10, 60);
      expect(result50.allowed).toBe(true);
      expect(result50.remaining).toBe(7); // 10 - 2 - 1

      // Re-setup for next call
      setupPipelineResults(0, 8, []);
      const result90 = await checkRateLimit('key-90', 10, 60);
      expect(result90.allowed).toBe(true);
      expect(result90.remaining).toBe(1); // 10 - 8 - 1
    });

    it('should allow request at exactly limit - 1', async () => {
      setupPipelineResults(0, 9, []);

      const result = await checkRateLimit('key-9', 10, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should block request when at the limit', async () => {
      setupPipelineResults(0, 10, []);

      const result = await checkRateLimit('key-limit', 10, 60);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetAt).toBeGreaterThan(0);

      // NO new entry was added when blocked
      expect(mockRedisInstance.zadd).not.toHaveBeenCalled();
      expect(mockRedisInstance.expire).not.toHaveBeenCalled();
    });

    it('should block request when over the limit', async () => {
      setupPipelineResults(0, 15, []);

      const result = await checkRateLimit('key-over', 10, 60);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should calculate resetAt from oldest entry timestamp when blocked', async () => {
      const now = Date.now();
      const oldestTimestamp = now - 30000; // 30 seconds ago

      // WITHSCORES returns [member, score, ...]
      setupPipelineResults(0, 10, ['oldest-entry-id', String(oldestTimestamp)]);

      const result = await checkRateLimit('key-reset', 10, 60);

      // resetAt = ceil(score/1000) + windowSeconds
      const expectedResetAt = Math.ceil(oldestTimestamp / 1000) + 60;
      expect(result.allowed).toBe(false);
      expect(result.resetAt).toBe(expectedResetAt);
    });

    it('should remove old entries outside the sliding window', async () => {
      const now = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      setupPipelineResults(0, 2, []);

      await checkRateLimit('key-window', 10, 60);

      const pipelineObj = mockPipeline.mock.results[0].value;
      const windowStart = now - 60000;
      expect(pipelineObj.zremrangebyscore).toHaveBeenCalledWith(
        'ratelimit:key-window',
        0,
        windowStart
      );

      vi.useRealTimers();
    });

    it('should fail open when Redis pipeline throws an error', async () => {
      // Pipeline exec throws
      const mockExec = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const mockPipelineObj = {
        zremrangebyscore: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        zrange: vi.fn().mockReturnThis(),
        exec: mockExec,
      };
      mockPipeline.mockReturnValue(mockPipelineObj);

      const result = await checkRateLimit('key-error', 10, 60);

      // fail-open: request allowed, full remaining
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
      expect(result.resetAt).toBeGreaterThan(0);
    });

    it('should fail open when zadd fails after pipeline succeeds', async () => {
      setupPipelineResults(0, 2, []);
      mockRedisInstance.zadd.mockRejectedValue(new Error('Redis down'));

      const result = await checkRateLimit('key-zadd-fail', 10, 60);

      // The catch block returns fail-open values
      expect(result.allowed).toBe(true);
    });

    it('should respect custom limit values', async () => {
      setupPipelineResults(0, 5, []);

      const result = await checkRateLimit('key-custom', 5, 60);

      expect(result.allowed).toBe(false);
    });

    it('should respect custom window durations', async () => {
      setupPipelineResults(0, 2, []);

      await checkRateLimit('key-window-custom', 10, 10);

      // Expire was called with TTL = 10s
      expect(mockRedisInstance.expire).toHaveBeenCalledWith(
        'ratelimit:key-window-custom',
        10
      );
    });

    it('should use fallback resetAt when oldest entry is missing', async () => {
      // Empty zrange result (no oldest entry)
      setupPipelineResults(0, 10, []);

      const result = await checkRateLimit('key-no-oldest', 10, 60);

      expect(result.allowed).toBe(false);
      // Should use now + window as fallback
      expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  // ============================================
  // checkUserRateLimit
  // ============================================

  describe('checkUserRateLimit', () => {
    it('should prefix key with "user:" and use default limit of 100', async () => {
      setupPipelineResults(0, 1, []);

      const result = await checkUserRateLimit('user-1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(98); // 100 - 1 - 1 = 98
      expect(mockRedisInstance.zadd).toHaveBeenCalledWith(
        'ratelimit:user:user-1',
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should accept custom limits and windows', async () => {
      setupPipelineResults(0, 1, []);

      const result = await checkUserRateLimit('user-2', 50, 30);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(48); // 50 - 1 - 1 = 48
    });

    it('should block user when over limit', async () => {
      setupPipelineResults(0, 100, []);

      const result = await checkUserRateLimit('user-busy', 100, 60);

      expect(result.allowed).toBe(false);
    });
  });

  // ============================================
  // checkIpRateLimit
  // ============================================

  describe('checkIpRateLimit', () => {
    it('should prefix key with "ip:" and sanitize dots', async () => {
      setupPipelineResults(0, 0, []);

      await checkIpRateLimit('192.168.1.1');

      expect(mockRedisInstance.zadd).toHaveBeenCalledWith(
        'ratelimit:ip:192_168_1_1',
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should sanitize IPv6 colons', async () => {
      setupPipelineResults(0, 0, []);

      await checkIpRateLimit('2001:db8::1');

      expect(mockRedisInstance.zadd).toHaveBeenCalledWith(
        'ratelimit:ip:2001_db8__1',
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should use default limit of 60 for IPs', async () => {
      // 59 entries, limit 60 -> remaining = 60 - 59 - 1 = 0
      setupPipelineResults(0, 59, []);

      const result = await checkIpRateLimit('10.0.0.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should block aggressive IP at limit', async () => {
      setupPipelineResults(0, 60, []);

      const result = await checkIpRateLimit('10.0.0.2');

      expect(result.allowed).toBe(false);
    });
  });

  // ============================================
  // checkApiKeyRateLimit
  // ============================================

  describe('checkApiKeyRateLimit', () => {
    it('should prefix key with "apikey:"', async () => {
      setupPipelineResults(0, 0, []);

      await checkApiKeyRateLimit('key-1');

      expect(mockRedisInstance.zadd).toHaveBeenCalledWith(
        'ratelimit:apikey:key-1',
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should use default limit of 100', async () => {
      setupPipelineResults(0, 0, []);

      const result = await checkApiKeyRateLimit('key-default');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 0 - 1
    });

    it('should accept custom limits', async () => {
      setupPipelineResults(0, 100, []);

      const result = await checkApiKeyRateLimit('premium-key', 500, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(399); // 500 - 100 - 1
    });

    it('should block rate-limited API key', async () => {
      setupPipelineResults(0, 300, []);

      const result = await checkApiKeyRateLimit('rate-limited-key', 300, 60);

      expect(result.allowed).toBe(false);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should allow first request when limit is 1', async () => {
      setupPipelineResults(0, 0, []);

      const result = await checkRateLimit('single-key', 1, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should block second request when limit is 1', async () => {
      setupPipelineResults(0, 1, []);

      const result = await checkRateLimit('single-key-2', 1, 60);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle null/undefined pipeline results gracefully', async () => {
      const mockExec = vi.fn().mockResolvedValue(null);
      const mockPipelineObj = {
        zremrangebyscore: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        zrange: vi.fn().mockReturnThis(),
        exec: mockExec,
      };
      mockPipeline.mockReturnValue(mockPipelineObj);

      // Should not crash, count defaults to 0
      const result = await checkRateLimit('null-key', 10, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 0 - 1
    });

    it('should handle partial pipeline results without crashing', async () => {
      const mockExec = vi.fn().mockResolvedValue([[null, 1]]);
      const mockPipelineObj = {
        zremrangebyscore: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        zrange: vi.fn().mockReturnThis(),
        exec: mockExec,
      };
      mockPipeline.mockReturnValue(mockPipelineObj);

      const result = await checkRateLimit('partial-key', 10, 60);

      // Should not crash; count defaults to 0
      expect(result.allowed).toBe(true);
    });
  });
});
