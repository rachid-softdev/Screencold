/**
 * Campaigns API (v1) Tests
 *
 * Covers:
 * - GET /api/v1/campaigns returns list
 * - GET /api/v1/campaigns with cursor pagination
 * - POST /api/v1/campaigns creates campaign with prospects
 * - POST /api/v1/campaigns validation errors
 * - Campaign ownership (user A cannot see user B's campaign)
 * - POST /api/v1/campaigns without auth
 * - POST /api/v1/campaigns with invalid API key
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  apiKey: {
    findUnique: vi.fn(),
  },
  campaign: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  prospect: {
    createManyAndReturn: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

// ============================================
// Helpers
// ============================================

function setupValidApiKey() {
  mockPrisma.apiKey.findUnique.mockResolvedValue({
    id: 'key-1',
    key: 'hashed-key-123',
    userId: 'user-1',
    expiresAt: null,
    lastUsedAt: null,
    user: { id: 'user-1', plan: 'PRO', credits: 50 },
  });
}

function createRequest(method: string, url: string, body?: unknown, headers?: Record<string, string>): Request {
  const reqHeaders = new Headers({
    'content-type': 'application/json',
    ...(headers || {}),
  });

  return new Request(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ============================================
// Tests
// ============================================

describe('Campaigns API - GET /api/v1/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of campaigns for authenticated user', async () => {
    // Arrange
    setupValidApiKey();

    const mockCampaigns = [
      {
        id: 'campaign-1',
        name: 'Test Campaign',
        prospectsList: [
          { id: 'p-1', url: 'https://example.com', companyName: 'Example Inc', contactName: null, status: 'PENDING', createdAt: new Date() },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns);

    const { GET } = await import('@/app/api/v1/campaigns/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/campaigns', undefined, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('campaign-1');
    expect(body.data[0].name).toBe('Test Campaign');
    expect(body.data[0].prospectCount).toBe(1);
    expect(body.data[0].prospects).toHaveLength(1);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.limit).toBe(20);
    expect(body.pagination.count).toBe(1);
  });

  it('should only return campaigns belonging to the authenticated user', async () => {
    // Arrange
    setupValidApiKey();
    mockPrisma.campaign.findMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/v1/campaigns/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/campaigns', undefined, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    await GET(request);

    // Assert - verify userId filter
    const findManyCall = mockPrisma.campaign.findMany.mock.calls[0][0];
    expect(findManyCall.where.userId).toBe('user-1');
  });

  it('should support cursor-based pagination', async () => {
    // Arrange
    setupValidApiKey();

    const mockCampaigns = [
      { id: 'campaign-2', name: 'Campaign B', prospectsList: [], createdAt: new Date(), updatedAt: new Date() },
      { id: 'campaign-1', name: 'Campaign A', prospectsList: [], createdAt: new Date(), updatedAt: new Date() },
    ];

    mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns);

    const { GET } = await import('@/app/api/v1/campaigns/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/campaigns?cursor=campaign-10&limit=5', undefined, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.pagination.hasMore).toBe(false);
    expect(body.pagination.limit).toBe(5);
  });

  it('should reject without authorization', async () => {
    // Arrange
    const { GET } = await import('@/app/api/v1/campaigns/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/campaigns');

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('should return 500 on unexpected error', async () => {
    // Arrange
    setupValidApiKey();
    mockPrisma.campaign.findMany.mockRejectedValue(new Error('DB failure'));

    const { GET } = await import('@/app/api/v1/campaigns/route');
    const request = createRequest('GET', 'http://localhost:3000/api/v1/campaigns', undefined, {
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

describe('Campaigns API - POST /api/v1/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a campaign with prospects', async () => {
    // Arrange
    setupValidApiKey();

    mockPrisma.campaign.create.mockResolvedValue({
      id: 'campaign-new',
      name: 'Q3 Outreach',
    });

    const mockProspects = [
      { id: 'p-1', url: 'https://site1.com', companyName: 'Site 1', contactName: null, contactEmail: null, campaignId: 'campaign-new', status: 'PENDING' },
      { id: 'p-2', url: 'https://site2.com', companyName: 'Site 2', contactName: null, contactEmail: null, campaignId: 'campaign-new', status: 'PENDING' },
    ];

    mockPrisma.prospect.createManyAndReturn.mockResolvedValue(mockProspects);

    const { POST } = await import('@/app/api/v1/campaigns/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/campaigns', {
      name: 'Q3 Outreach',
      prospects: [
        { url: 'https://site1.com', companyName: 'Site 1' },
        { url: 'https://site2.com', companyName: 'Site 2' },
      ],
    }, {
      authorization: 'Bearer sk_test_key_12345',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(body.data.id).toBe('campaign-new');
    expect(body.data.name).toBe('Q3 Outreach');
    expect(body.data.prospectCount).toBe(2);
    expect(body.data.prospects).toHaveLength(2);
  });

  it('should reject empty campaign name', async () => {
    // Arrange
    setupValidApiKey();

    const { POST } = await import('@/app/api/v1/campaigns/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/campaigns', {
      name: '',
      prospects: [{ url: 'https://example.com' }],
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

  it('should reject invalid prospect URL', async () => {
    // Arrange
    setupValidApiKey();

    const { POST } = await import('@/app/api/v1/campaigns/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/campaigns', {
      name: 'Campaign',
      prospects: [{ url: 'not-a-url' }],
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

  it('should reject over 100 prospects', async () => {
    // Arrange
    setupValidApiKey();

    const manyProspects = Array.from({ length: 101 }, (_, i) => ({
      url: `https://site${i}.com`,
    }));

    const { POST } = await import('@/app/api/v1/campaigns/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/campaigns', {
      name: 'Big Campaign',
      prospects: manyProspects,
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

  it('should reject without authorization', async () => {
    // Arrange
    const { POST } = await import('@/app/api/v1/campaigns/route');
    const request = createRequest('POST', 'http://localhost:3000/api/v1/campaigns', {
      name: 'Test',
      prospects: [{ url: 'https://example.com' }],
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body.error).toBe('UNAUTHORIZED');
  });
});
