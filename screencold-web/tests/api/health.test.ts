/**
 * Health Check API Tests
 *
 * Covers:
 * - GET /api/health returns 200 with correct response shape
 * - GET /api/health with unhealthy database returns 503
 * - HEAD returns 200 when database is up
 * - HEAD returns 503 when database is down
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  $queryRaw: vi.fn(),
  audit: {
    count: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

// Mock ioredis for checkRedis — singleton connection
const mockRedisInstance = {
  connect: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue('PONG'),
  disconnect: vi.fn(),
  quit: vi.fn().mockResolvedValue('OK'),
};

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => mockRedisInstance),
}));

// ============================================
// Tests
// ============================================

describe('Health Check API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
    vi.stubEnv('NODE_ENV', 'test');
    // Mock process.uptime
    vi.spyOn(process, 'uptime').mockReturnValue(12345.67);
    // Mock global.fetch for worker check
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('GET /api/health', () => {
    beforeEach(() => {
      // Reset mock state between tests
      vi.clearAllMocks();
      mockRedisInstance.ping.mockResolvedValue('PONG');
      mockRedisInstance.connect.mockResolvedValue(undefined);
    });

    it('should return 200 with healthy status when all services are up', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      // Import the route handler dynamically
      const { GET } = await import('@/app/api/health/route');
      const request = { url: 'http://localhost:3000/api/health' } as Request;

      // Act
      const response = await GET(request as never);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.status).toBe('healthy');
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBe(12345.67);
      expect(body.version).toBeDefined();
      expect(body.checks).toBeDefined();
      expect(body.checks.database).toBeDefined();
      expect(body.checks.database.status).toBe('healthy');
      expect(body.checks.redis).toBeDefined();
      expect(body.checks.redis.status).toBe('healthy');
      expect(body.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return 503 when database is down', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const { GET } = await import('@/app/api/health/route');
      const request = { url: 'http://localhost:3000/api/health' } as Request;

      // Act
      const response = await GET(request as never);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(body.status).toBe('unhealthy');
      expect(body.checks.database.status).toBe('unhealthy');
    });

    it('should include proper response shape with all required fields', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const { GET } = await import('@/app/api/health/route');

      // Act
      const response = await GET({ url: 'http://localhost:3000/api/health' } as Request);
      const body = await response.json();

      // Assert - check response shape
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('checks');
      expect(body.checks).toHaveProperty('database');
      expect(body.checks).toHaveProperty('redis');
      expect(body.checks).toHaveProperty('worker');
    });

    it('should handle Redis check failure gracefully', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockRedisInstance.ping.mockRejectedValue(new Error('ECONNREFUSED'));

      const { GET } = await import('@/app/api/health/route');

      // Re-import to reset singleton for this test (first import creates the connection)
      const { GET: GET2 } = await import('@/app/api/health/route');

      // Act
      const response = await GET2({ url: 'http://localhost:3000/api/health' } as Request);
      const body = await response.json();

      // Assert
      expect(body.checks.redis.status).toBe('unhealthy');
      expect(body.checks.redis.error).toBeDefined();
    });
  });

  describe('HEAD /api/health', () => {
    it('should return 200 when database is reachable', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const { HEAD } = await import('@/app/api/health/route');

      // Act
      const response = await HEAD();

      // Assert
      expect(response.status).toBe(200);
    });

    it('should return 503 when database is unreachable', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Down'));

      const { HEAD } = await import('@/app/api/health/route');

      // Act
      const response = await HEAD();

      // Assert
      expect(response.status).toBe(503);
    });
  });
});
