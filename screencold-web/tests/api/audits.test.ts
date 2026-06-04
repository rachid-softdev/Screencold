/**
 * Audits API (v1) Tests
 *
 * Covers:
 * - POST /api/v1/audits with valid URL
 * - POST /api/v1/audits with invalid URL (validation error)
 * - POST /api/v1/audits without auth
 * - POST /api/v1/audits with private IP (SSRF protection)
 * - POST /api/v1/audits with insufficient credits
 * - GET /api/v1/audits returns list
 * - GET /api/v1/audits with cursor pagination
 * - GET /api/v1/audits with status filter
 * - Audit ownership (user A cannot see user B's audit)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  audit: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  prospect: {
    create: vi.fn(),
    delete: vi.fn(),
  },
  campaign: {
    create: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

vi.mock('@/lib/credits', () => ({
  checkCredits: vi.fn(),
  debitCredits: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkApiKeyRateLimit: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  canUseAPI: vi.fn(),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn(() => ({
    add: vi.fn(),
  })),
}));

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    disconnect: vi.fn(),
    duplicate: vi.fn(),
  })),
}));

import { checkCredits, debitCredits } from '@/lib/credits';
import { checkApiKeyRateLimit } from '@/lib/rate-limit';
import { canUseAPI } from '@/lib/plans';

// ============================================
// Helpers
// ============================================

function setupValidApiKey() {
  const mockKeyRecord = {
    id: 'key-1',
    key: 'hashed-key-123',
    userId: 'user-1',
    plan: 'PRO',
    rateLimit: 60,
    expiresAt: null,
    lastUsedAt: null,
    user: {
      id: 'user-1',
      plan: 'PRO',
      credits: 50,
    },
  };

  mockPrisma.apiKey.findUnique.mockResolvedValue(mockKeyRecord);
  mockPrisma.apiKey.update.mockResolvedValue(mockKeyRecord);
  vi.mocked(canUseAPI).mockReturnValue(true);
  vi.mocked(checkApiKeyRateLimit).mockResolvedValue({ allowed: true, remaining: 59, resetAt: Math.ceil(Date.now() / 1000) + 60 });
  vi.mocked(checkCredits).mockResolvedValue(50);
  vi.mocked(debitCredits).mockResolvedValue(true);
}

function createRequest(method: string, url: string, body?: unknown, headers?: Record<string, string>): Request {
  const reqHeaders = new Headers({
    'content-type': 'application/json',
    ...(headers || {}),
  });

  const request = new Request(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  return request;
}

// ============================================
// Tests
// ============================================

describe('POST /api/v1/audits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should create an audit with valid URL and API key', async () => {
    // Arrange
    setupValidApiKey();

    mockPrisma.campaign.create.mockResolvedValue({ id: 'campaign-1' });
    mockPrisma.prospect.create.mockResolvedValue({ id: 'prospect-1', url: 'https://example.com' });
    mockPrisma.audit.create.mockResolvedValue({ id: 'audit-1', status: 'PROCESSING', prospectId: 'prospect-1' });

    const { POST } = await import('@/app/api/v1/audits/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/audits', {
      url: 'https://example.com',
      companyName: 'Example Inc',
    }, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe('audit-1');
    expect(body.data.status).toBe('PROCESSING');
    expect(body.creditsRemaining).toBe(49);
  });

  it('should reject request without authorization header', async () => {
    // Arrange
    const { POST } = await import('@/app/api/v1/audits/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/audits', {
      url: 'https://example.com',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('should reject request with invalid API key', async () => {
    // Arrange
    mockPrisma.apiKey.findUnique.mockResolvedValue(null);

    const { POST } = await import('@/app/api/v1/audits/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/audits', {
      url: 'https://example.com',
    }, {
      authorization: 'Bearer sk_invalid_key',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('should reject request with invalid URL format', async () => {
    // Arrange
    setupValidApiKey();

    const { POST } = await import('@/app/api/v1/audits/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/audits', {
      url: 'not-a-valid-url',
    }, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should reject URL with private IP (SSRF protection)', async () => {
    // Arrange
    setupValidApiKey();

    const { POST } = await import('@/app/api/v1/audits/route');

    // Test with localhost
    const request1 = createRequest('POST', 'http://localhost:3000/api/v1/audits', {
      url: 'http://127.0.0.1:8080',
    }, { authorization: 'Bearer sk_test_key_12345' });

    const response1 = await POST(request1);
    const body1 = await response1.json();

    expect(response1.status).toBe(400);
    expect(body1.error).toBe('INVALID_URL');
  });

  it('should reject URL with non-HTTP protocol', async () => {
    // Arrange
    setupValidApiKey();

    const { POST } = await import('@/app/api/v1/audits/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/audits', {
      url: 'ftp://files.example.com',
    }, { authorization: 'Bearer sk_test_key_12345' });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('INVALID_URL');
  });

  it('should reject request when user has no credits', async () => {
    // Arrange
    setupValidApiKey();
    vi.mocked(checkCredits).mockResolvedValue(0);

    const { POST } = await import('@/app/api/v1/audits/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/audits', {
      url: 'https://example.com',
    }, { authorization: 'Bearer sk_test_key_12345' });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(402);
    expect(body.error).toBe('NO_CREDITS');
  });

  it('should reject request with plan that does not allow API access', async () => {
    // Arrange
    const mockKeyRecord = {
      id: 'key-1',
      key: 'hashed-key',
      userId: 'user-1',
      plan: 'FREE',
      rateLimit: 60,
      expiresAt: null,
      lastUsedAt: null,
      user: {
        id: 'user-1',
        plan: 'FREE',
        credits: 5,
      },
    };

    mockPrisma.apiKey.findUnique.mockResolvedValue(mockKeyRecord);
    vi.mocked(canUseAPI).mockReturnValue(false);

    const { POST } = await import('@/app/api/v1/audits/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/audits', {
      url: 'https://example.com',
    }, { authorization: 'Bearer sk_free_key' });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(body.error).toBe('PLAN_REQUIRED');
  });

  it('should handle rate limited API key', async () => {
    // Arrange
    setupValidApiKey();
    vi.mocked(checkApiKeyRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Math.ceil(Date.now() / 1000) + 60,
    });

    const { POST } = await import('@/app/api/v1/audits/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/audits', {
      url: 'https://example.com',
    }, { authorization: 'Bearer sk_test_key_12345' });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(429);
    expect(body.error).toBe('RATE_LIMITED');
  });

  it('should handle credit debit failure with rollback', async () => {
    // Arrange
    setupValidApiKey();
    vi.mocked(debitCredits).mockResolvedValue(false);

    mockPrisma.campaign.create.mockResolvedValue({ id: 'campaign-1' });
    mockPrisma.prospect.create.mockResolvedValue({ id: 'prospect-1' });
    mockPrisma.audit.create.mockResolvedValue({ id: 'audit-1', status: 'PROCESSING' });

    const { POST } = await import('@/app/api/v1/audits/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/audits', {
      url: 'https://example.com',
    }, { authorization: 'Bearer sk_test_key_12345' });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(402);
    expect(body.error).toBe('CREDIT_DEBIT_FAILED');

    // Verify rollback - cleanup was called
    expect(mockPrisma.audit.delete).toHaveBeenCalledWith({ where: { id: 'audit-1' } });
    expect(mockPrisma.prospect.delete).toHaveBeenCalledWith({ where: { id: 'prospect-1' } });
    expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({ where: { id: 'campaign-1' } });
  });
});

describe('GET /api/v1/audits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of audits for authenticated user', async () => {
    // Arrange
    setupValidApiKey();

    const mockAudits = [
      {
        id: 'audit-1',
        status: 'COMPLETED',
        siteType: 'E_COMMERCE',
        overallScore: 72,
        emailSubject: 'Test Subject',
        emailBody: 'Test body',
        emailPs: 'PS',
        createdAt: new Date(),
        prospect: {
          id: 'prospect-1',
          url: 'https://example.com',
          companyName: 'Example Inc',
          contactName: null,
          status: 'CONTACTED',
        },
        screenshotUrl: null,
        annotatedUrl: null,
      },
    ];

    mockPrisma.audit.findMany.mockResolvedValue(mockAudits);

    const { GET } = await import('@/app/api/v1/audits/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/audits', undefined, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('audit-1');
    expect(body.data[0].status).toBe('COMPLETED');
    expect(body.data[0].overallScore).toBe(72);
    expect(body.data[0].prospect.companyName).toBe('Example Inc');
    expect(body.pagination).toBeDefined();
    expect(body.pagination.limit).toBe(20);
    expect(body.pagination.count).toBe(1);
  });

  it('should support cursor-based pagination', async () => {
    // Arrange
    setupValidApiKey();

    const mockAudits = [
      { id: 'audit-2', status: 'COMPLETED', siteType: null, overallScore: null, emailSubject: null, emailBody: null, emailPs: null, createdAt: new Date(), prospect: { id: 'p-2', url: 'https://b.com', companyName: null, contactName: null, status: 'PENDING' }, screenshotUrl: null, annotatedUrl: null },
      { id: 'audit-1', status: 'COMPLETED', siteType: null, overallScore: null, emailSubject: null, emailBody: null, emailPs: null, createdAt: new Date(), prospect: { id: 'p-1', url: 'https://a.com', companyName: null, contactName: null, status: 'PENDING' }, screenshotUrl: null, annotatedUrl: null },
    ];

    // When cursor is provided, findMany is called with take: limit + 1
    mockPrisma.audit.findMany.mockResolvedValue(mockAudits);

    const { GET } = await import('@/app/api/v1/audits/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/audits?cursor=audit-5&limit=10', undefined, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    // Since we requested limit=10 but got 2 items, hasMore = false (2 <= 10)
    expect(body.pagination.hasMore).toBe(false);
    expect(body.pagination.nextCursor).toBeNull();
  });

  it('should filter by status when provided', async () => {
    // Arrange
    setupValidApiKey();
    mockPrisma.audit.findMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/v1/audits/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/audits?status=PROCESSING', undefined, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    await GET(request);

    // Assert - verify the status filter was passed
    const findManyCall = mockPrisma.audit.findMany.mock.calls[0][0];
    expect(findManyCall.where.status).toBe('PROCESSING');
  });

  it('should only return audits belonging to the authenticated user', async () => {
    // Arrange
    setupValidApiKey();
    mockPrisma.audit.findMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/v1/audits/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/audits', undefined, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    await GET(request);

    // Assert - verify the userId filter was passed
    const findManyCall = mockPrisma.audit.findMany.mock.calls[0][0];
    expect(findManyCall.where.userId).toBe('user-1');
  });

  it('should enforce maximum limit of 100', async () => {
    // Arrange
    setupValidApiKey();
    mockPrisma.audit.findMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/v1/audits/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/audits?limit=999', undefined, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    await GET(request);

    // Assert - verify the limit was capped at 100
    const findManyCall = mockPrisma.audit.findMany.mock.calls[0][0];
    expect(findManyCall.take).toBe(100);
  });

  it('should return 500 when prisma throws unexpected error', async () => {
    // Arrange
    setupValidApiKey();
    mockPrisma.audit.findMany.mockRejectedValue(new Error('Unexpected DB error'));

    const { GET } = await import('@/app/api/v1/audits/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/audits', undefined, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe('INTERNAL_ERROR');
  });
});
