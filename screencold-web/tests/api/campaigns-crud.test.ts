/**
 * Campaigns CRUD (Session-based) Integration Tests
 *
 * Covers:
 * - GET  /api/campaigns         — list user campaigns
 * - POST /api/campaigns         — create campaign
 * - GET  /api/campaigns/[id]    — get single campaign with prospects
 * - PATCH /api/campaigns/[id]   — update campaign name
 * - DELETE /api/campaigns/[id]  — delete campaign
 * - POST /api/campaigns/[id]/prospects — import CSV prospects
 * - POST /api/campaigns/[id]/launch   — launch campaign audits
 *
 * Pattern: mock @/middleware (apiMiddleware), @/lib/prisma, and other deps.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  campaign: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  prospect: {
    findMany: vi.fn(),
    count: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
  },
  audit: {
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

vi.mock('@/middleware', () => ({
  apiMiddleware: vi.fn(),
}));

vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: vi.fn(),
  paginatedResponse: vi.fn(),
}));

vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
  },
  parse: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  getCSVLimit: vi.fn(),
}));

vi.mock('@/lib/credits', () => ({
  checkCredits: vi.fn(),
  batchDebitCredits: vi.fn(),
  batchRefundCredits: vi.fn(),
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

import { apiMiddleware } from '@/middleware';
import { parsePaginationParams, paginatedResponse } from '@/lib/pagination';
import { getCSVLimit } from '@/lib/plans';
import { checkCredits, batchDebitCredits, batchRefundCredits } from '@/lib/credits';
import Papa from 'papaparse';

// ============================================
// Shared Helpers
// ============================================

function createRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test', plan: 'FREE', credits: 5 };

function setupAuth(authResult?: Partial<ReturnType<typeof apiMiddleware> extends Promise<infer T> ? T : never>) {
  vi.mocked(apiMiddleware).mockResolvedValue({
    authorized: true,
    userId: 'user-1',
    user: mockUser,
    correlationId: 'corr-1',
    ...authResult,
  } as any);
}

function setupAuthFailure() {
  vi.mocked(apiMiddleware).mockResolvedValue({
    authorized: false,
    errorResponse: new Response(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Authentication required' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }),
  } as any);
}

// ============================================
// GET /api/campaigns — List
// ============================================

describe('GET /api/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of campaigns for authenticated user', async () => {
    // Arrange
    setupAuth();
    vi.mocked(parsePaginationParams).mockReturnValue({ cursor: undefined, limit: 20 });

    const mockCampaigns = [
      {
        id: 'c-1',
        name: 'Campaign A',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
        prospectsList: [
          { status: 'PENDING' },
          { status: 'DONE' },
          { status: 'DONE' },
        ],
      },
    ];
    mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns);
    mockPrisma.campaign.count.mockResolvedValue(1);

    const { GET } = await import('@/app/api/campaigns/route');
    const request = createRequest('GET', 'http://localhost:3000/api/campaigns');

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.campaigns).toHaveLength(1);
    expect(body.campaigns[0].id).toBe('c-1');
    expect(body.campaigns[0].name).toBe('Campaign A');
    expect(body.campaigns[0].stats).toBeDefined();
    expect(body.campaigns[0].stats.total).toBe(3);
    expect(body.campaigns[0].stats.pending).toBe(1);
    expect(body.campaigns[0].stats.done).toBe(2);
    expect(body.pagination).toBeDefined();
  });

  it('should filter campaigns by userId', async () => {
    // Arrange
    setupAuth();
    vi.mocked(parsePaginationParams).mockReturnValue({ cursor: undefined, limit: 20 });
    mockPrisma.campaign.findMany.mockResolvedValue([]);
    mockPrisma.campaign.count.mockResolvedValue(0);

    const { GET } = await import('@/app/api/campaigns/route');
    const request = createRequest('GET', 'http://localhost:3000/api/campaigns');

    // Act
    await GET(request);

    // Assert — only user's campaigns
    expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      }),
    );
  });

  it('should support cursor-based pagination', async () => {
    // Arrange
    setupAuth();
    vi.mocked(parsePaginationParams).mockReturnValue({ cursor: 'c-10', limit: 5 });

    const mockCampaigns = [
      { id: 'c-11', name: 'C', createdAt: new Date(), updatedAt: new Date(), prospectsList: [] },
      { id: 'c-10', name: 'B', createdAt: new Date(), updatedAt: new Date(), prospectsList: [] },
    ];
    mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns);
    vi.mocked(paginatedResponse).mockReturnValue({
      data: mockCampaigns,
      pagination: { hasMore: false, nextCursor: null, limit: 5 },
    });

    const { GET } = await import('@/app/api/campaigns/route');
    const request = createRequest('GET', 'http://localhost:3000/api/campaigns?cursor=c-10&limit=5');

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.pagination).toBeDefined();
  });

  it('should return 401 without auth', async () => {
    // Arrange
    setupAuthFailure();

    const { GET } = await import('@/app/api/campaigns/route');
    const request = createRequest('GET', 'http://localhost:3000/api/campaigns');

    // Act
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(401);
  });

  it('should return 500 on unexpected error', async () => {
    // Arrange
    setupAuth();
    vi.mocked(parsePaginationParams).mockReturnValue({ cursor: undefined, limit: 20 });
    mockPrisma.campaign.findMany.mockRejectedValue(new Error('DB crash'));

    const { GET } = await import('@/app/api/campaigns/route');
    const request = createRequest('GET', 'http://localhost:3000/api/campaigns');

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe('INTERNAL_ERROR');
  });
});

// ============================================
// POST /api/campaigns — Create
// ============================================

describe('POST /api/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a campaign successfully', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.create.mockResolvedValue({
      id: 'c-new',
      name: 'Q3 Outreach',
      createdAt: new Date(),
    });

    const { POST } = await import('@/app/api/campaigns/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns', {
      name: 'Q3 Outreach',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(body.id).toBe('c-new');
    expect(body.name).toBe('Q3 Outreach');
    expect(body.stats).toBeDefined();
    expect(body.stats.total).toBe(0);
  });

  it('should return 400 for empty name', async () => {
    // Arrange
    setupAuth();

    const { POST } = await import('@/app/api/campaigns/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns', {
      name: '',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for name exceeding 100 chars', async () => {
    // Arrange
    setupAuth();

    const { POST } = await import('@/app/api/campaigns/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns', {
      name: 'A'.repeat(101),
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 401 without auth', async () => {
    // Arrange
    setupAuthFailure();

    const { POST } = await import('@/app/api/campaigns/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns', {
      name: 'Test',
    });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(401);
  });

  it('should return 500 on unexpected error', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.create.mockRejectedValue(new Error('DB crash'));

    const { POST } = await import('@/app/api/campaigns/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns', {
      name: 'Test',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe('INTERNAL_ERROR');
  });
});

// ============================================
// GET /api/campaigns/[id] — Get Single
// ============================================

describe('GET /api/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return campaign with prospects and stats', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      name: 'My Campaign',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-1',
      prospectsList: [
        {
          id: 'p-1',
          url: 'https://example.com',
          companyName: 'Example Inc',
          contactName: 'John',
          contactEmail: 'john@example.com',
          notes: null,
          status: 'DONE',
          createdAt: new Date(),
          audit: {
            id: 'a-1',
            status: 'COMPLETED',
            screenshotUrl: null,
            annotatedUrl: null,
            overallScore: 85,
            emailSubject: null,
            processingTime: 1200,
            createdAt: new Date(),
          },
        },
        {
          id: 'p-2',
          url: 'https://test.com',
          companyName: null,
          contactName: null,
          contactEmail: null,
          notes: null,
          status: 'PENDING',
          createdAt: new Date(),
          audit: null,
        },
      ],
    });

    const { GET } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('GET', 'http://localhost:3000/api/campaigns/c-1');
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await GET(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.id).toBe('c-1');
    expect(body.name).toBe('My Campaign');
    expect(body.stats.total).toBe(2);
    expect(body.stats.done).toBe(1);
    expect(body.stats.pending).toBe(1);
    expect(body.prospects).toHaveLength(2);
    expect(body.prospects[0].audit).toBeDefined();
    expect(body.prospects[0].audit.overallScore).toBe(85);
    expect(body.prospects[1].audit).toBeNull();
  });

  it('should return 404 for non-existent campaign', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue(null);

    const { GET } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('GET', 'http://localhost:3000/api/campaigns/nonexistent');
    const params = { params: Promise.resolve({ id: 'nonexistent' }) };

    // Act
    const response = await GET(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error).toBe('NOT_FOUND');
  });

  it('should return 403 for campaign owned by another user', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-other',
      name: 'Not Mine',
      userId: 'user-other', // different user
      createdAt: new Date(),
      updatedAt: new Date(),
      prospectsList: [],
    });

    const { GET } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('GET', 'http://localhost:3000/api/campaigns/c-other');
    const params = { params: Promise.resolve({ id: 'c-other' }) };

    // Act
    const response = await GET(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(body.error).toBe('FORBIDDEN');
  });

  it('should return 401 without auth', async () => {
    // Arrange
    setupAuthFailure();

    const { GET } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('GET', 'http://localhost:3000/api/campaigns/c-1');
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await GET(request, params as any);

    // Assert
    expect(response.status).toBe(401);
  });
});

// ============================================
// PATCH /api/campaigns/[id] — Update
// ============================================

describe('PATCH /api/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update campaign name successfully', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      userId: 'user-1',
      name: 'Old Name',
    });
    mockPrisma.campaign.update.mockResolvedValue({
      id: 'c-1',
      name: 'New Name',
      updatedAt: new Date(),
    });

    const { PATCH } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('PATCH', 'http://localhost:3000/api/campaigns/c-1', {
      name: 'New Name',
    });
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await PATCH(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.name).toBe('New Name');
    expect(body.id).toBe('c-1');
  });

  it('should return 404 for non-existent campaign', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue(null);

    const { PATCH } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('PATCH', 'http://localhost:3000/api/campaigns/c-missing', {
      name: 'New Name',
    });
    const params = { params: Promise.resolve({ id: 'c-missing' }) };

    // Act
    const response = await PATCH(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error).toBe('NOT_FOUND');
  });

  it('should return 403 for campaign owned by another user', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-other',
      userId: 'user-other',
      name: 'Not Mine',
    });

    const { PATCH } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('PATCH', 'http://localhost:3000/api/campaigns/c-other', {
      name: 'New Name',
    });
    const params = { params: Promise.resolve({ id: 'c-other' }) };

    // Act
    const response = await PATCH(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(body.error).toBe('FORBIDDEN');
  });

  it('should return 400 for empty name', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      userId: 'user-1',
      name: 'Old',
    });

    const { PATCH } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('PATCH', 'http://localhost:3000/api/campaigns/c-1', {
      name: '',
    });
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await PATCH(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 401 without auth', async () => {
    // Arrange
    setupAuthFailure();

    const { PATCH } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('PATCH', 'http://localhost:3000/api/campaigns/c-1', {
      name: 'New',
    });
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await PATCH(request, params as any);

    // Assert
    expect(response.status).toBe(401);
  });
});

// ============================================
// DELETE /api/campaigns/[id] — Delete
// ============================================

describe('DELETE /api/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete campaign successfully', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      userId: 'user-1',
    });
    mockPrisma.campaign.delete.mockResolvedValue({ id: 'c-1' });

    const { DELETE } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('DELETE', 'http://localhost:3000/api/campaigns/c-1');
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await DELETE(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.campaign.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c-1' } }),
    );
  });

  it('should return 404 for non-existent campaign', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue(null);

    const { DELETE } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('DELETE', 'http://localhost:3000/api/campaigns/c-missing');
    const params = { params: Promise.resolve({ id: 'c-missing' }) };

    // Act
    const response = await DELETE(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error).toBe('NOT_FOUND');
  });

  it('should return 403 for campaign owned by another user', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-other',
      userId: 'user-other',
    });

    const { DELETE } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('DELETE', 'http://localhost:3000/api/campaigns/c-other');
    const params = { params: Promise.resolve({ id: 'c-other' }) };

    // Act
    const response = await DELETE(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(body.error).toBe('FORBIDDEN');
  });

  it('should return 401 without auth', async () => {
    // Arrange
    setupAuthFailure();

    const { DELETE } = await import('@/app/api/campaigns/[id]/route');
    const request = createRequest('DELETE', 'http://localhost:3000/api/campaigns/c-1');
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await DELETE(request, params as any);

    // Assert
    expect(response.status).toBe(401);
  });
});

// ============================================
// POST /api/campaigns/[id]/prospects — Import CSV
// ============================================

describe('POST /api/campaigns/[id]/prospects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import prospects from CSV successfully', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      userId: 'user-1',
      prospectsList: [],
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      plan: 'PRO',
    });
    vi.mocked(getCSVLimit).mockReturnValue(500);

    vi.mocked(Papa.parse).mockReturnValue({
      data: [
        { url: 'https://site1.com', company_name: 'Site 1' },
        { url: 'https://site2.com', company_name: 'Site 2' },
      ],
      errors: [],
    });

    mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
    mockPrisma.prospect.createMany.mockResolvedValue({ count: 2 });

    const { POST } = await import('@/app/api/campaigns/[id]/prospects/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/prospects', {
      csv: 'url,company_name\nhttps://site1.com,Site 1\nhttps://site2.com,Site 2',
      campaignId: 'c-1',
    });
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.imported).toBe(2);
    expect(body.skipped).toBe(0);
  });

  it('should skip rows without URL', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      userId: 'user-1',
      prospectsList: [],
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      plan: 'PRO',
    });
    vi.mocked(getCSVLimit).mockReturnValue(500);

    vi.mocked(Papa.parse).mockReturnValue({
      data: [
        { url: 'https://site1.com' },
        { company_name: 'No URL Here' },
        { url: '' },
      ],
      errors: [],
    });

    mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
    mockPrisma.prospect.createMany.mockResolvedValue({ count: 1 });

    const { POST } = await import('@/app/api/campaigns/[id]/prospects/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/prospects', {
      csv: 'url,company_name\nhttps://site1.com,Site 1\n,No URL',
      campaignId: 'c-1',
    });
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.imported).toBe(1);
    expect(body.skipped).toBe(2); // one missing url, one empty url
  });

  it('should reject private IP URLs (SSRF protection)', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      userId: 'user-1',
      prospectsList: [],
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      plan: 'PRO',
    });
    vi.mocked(getCSVLimit).mockReturnValue(500);

    vi.mocked(Papa.parse).mockReturnValue({
      data: [
        { url: 'http://localhost:3000' },
        { url: 'http://192.168.1.1' },
        { url: 'http://10.0.0.1' },
        { url: 'https://legit-site.com' },
      ],
      errors: [],
    });

    mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
    mockPrisma.prospect.createMany.mockResolvedValue({ count: 1 });

    const { POST } = await import('@/app/api/campaigns/[id]/prospects/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/prospects', {
      csv: 'url\nhttp://localhost:3000\nhttp://192.168.1.1\nhttp://10.0.0.1\nhttps://legit-site.com',
      campaignId: 'c-1',
    });
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.imported).toBe(1); // only legit-site.com
    expect(body.skipped).toBe(3);
    expect(body.errors).toBeDefined();
    expect(body.errors!.length).toBeGreaterThanOrEqual(1);
  });

  it('should return 404 for non-existent campaign', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue(null);

    const { POST } = await import('@/app/api/campaigns/[id]/prospects/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-missing/prospects', {
      csv: 'url\nhttps://site.com',
      campaignId: 'c-missing',
    });
    const params = { params: Promise.resolve({ id: 'c-missing' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error).toBe('NOT_FOUND');
  });

  it('should enforce CSV limit from plan', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      userId: 'user-1',
      prospectsList: [{ id: 'existing-1' }, { id: 'existing-2' }], // 2 existing
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      plan: 'FREE',
    });
    vi.mocked(getCSVLimit).mockReturnValue(10); // FREE plan limit

    vi.mocked(Papa.parse).mockReturnValue({
      data: Array.from({ length: 20 }, (_, i) => ({ url: `https://site${i}.com` })),
      errors: [],
    });

    const { POST } = await import('@/app/api/campaigns/[id]/prospects/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/prospects', {
      csv: 'url\n' + Array.from({ length: 20 }, (_, i) => `https://site${i}.com`).join('\n'),
      campaignId: 'c-1',
    });
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    // Should only import up to the limit (10 - 2 existing = 8)
    expect(body.imported).toBeLessThanOrEqual(8);
  });

  it('should reject CSV with critical parse errors', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      userId: 'user-1',
      prospectsList: [],
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      plan: 'PRO',
    });
    vi.mocked(getCSVLimit).mockReturnValue(500);

    vi.mocked(Papa.parse).mockReturnValue({
      data: [],
      errors: [{ type: 'Quotes', message: 'Unmatched quote', row: 1 }],
    });

    const { POST } = await import('@/app/api/campaigns/[id]/prospects/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/prospects', {
      csv: 'broken csv " data',
      campaignId: 'c-1',
    });
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('CSV_PARSE_ERROR');
  });

  it('should return 401 without auth', async () => {
    // Arrange
    setupAuthFailure();

    const { POST } = await import('@/app/api/campaigns/[id]/prospects/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/prospects', {
      csv: 'url\nhttps://site.com',
      campaignId: 'c-1',
    });
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);

    // Assert
    expect(response.status).toBe(401);
  });
});

// ============================================
// POST /api/campaigns/[id]/launch — Launch Campaign
// ============================================

describe('POST /api/campaigns/[id]/launch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should launch audits for pending prospects', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      name: 'Campaign',
      userId: 'user-1',
      prospectsList: [
        { id: 'p-1', url: 'https://site1.com', companyName: 'Site 1', contactName: null, contactEmail: null },
        { id: 'p-2', url: 'https://site2.com', companyName: 'Site 2', contactName: 'John', contactEmail: 'john@test.com' },
      ],
    });
    vi.mocked(checkCredits).mockResolvedValue(10);
    mockPrisma.audit.create
      .mockResolvedValueOnce({ id: 'a-1' })
      .mockResolvedValueOnce({ id: 'a-2' });
    vi.mocked(batchDebitCredits).mockResolvedValue({ success: true, debited: 2, failed: 0, remainingCredits: 8 });
    mockPrisma.prospect.update.mockResolvedValue({});

    const { POST } = await import('@/app/api/campaigns/[id]/launch/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/launch');
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.launched).toBe(2);
    expect(body.failed).toBe(0);
    expect(body.total).toBe(2);
    expect(body.remainingCredits).toBe(8); // 10 - 2
  });

  it('should return 404 for non-existent campaign', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue(null);

    const { POST } = await import('@/app/api/campaigns/[id]/launch/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-missing/launch');
    const params = { params: Promise.resolve({ id: 'c-missing' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error).toBe('NOT_FOUND');
  });

  it('should return 403 for campaign owned by another user', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-other',
      name: 'Not Mine',
      userId: 'user-other',
      prospectsList: [],
    });

    const { POST } = await import('@/app/api/campaigns/[id]/launch/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-other/launch');
    const params = { params: Promise.resolve({ id: 'c-other' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(body.error).toBe('FORBIDDEN');
  });

  it('should return 400 when no pending prospects', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      name: 'Empty Campaign',
      userId: 'user-1',
      prospectsList: [], // no pending prospects
    });

    const { POST } = await import('@/app/api/campaigns/[id]/launch/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/launch');
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('NO_PENDING_PROSPECTS');
  });

  it('should return 402 when insufficient credits', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      name: 'Campaign',
      userId: 'user-1',
      prospectsList: [
        { id: 'p-1', url: 'https://site1.com', companyName: 'Site 1', contactName: null, contactEmail: null },
        { id: 'p-2', url: 'https://site2.com', companyName: 'Site 2', contactName: null, contactEmail: null },
      ],
    });
    vi.mocked(checkCredits).mockResolvedValue(1); // only 1 credit, need 2

    const { POST } = await import('@/app/api/campaigns/[id]/launch/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/launch');
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(402);
    expect(body.error).toBe('INSUFFICIENT_CREDITS');
    expect(body.required).toBe(2);
    expect(body.available).toBe(1);
  });

  it('should return 402 and rollback when credit debit fails', async () => {
    // Arrange
    setupAuth();
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'c-1',
      name: 'Campaign',
      userId: 'user-1',
      prospectsList: [
        { id: 'p-1', url: 'https://site1.com', companyName: 'Site 1', contactName: null, contactEmail: null },
      ],
    });
    vi.mocked(checkCredits).mockResolvedValue(5);
    mockPrisma.audit.create.mockResolvedValue({ id: 'a-1' });
    vi.mocked(batchDebitCredits).mockResolvedValue({ success: false, debited: 0, failed: 1, remainingCredits: 5 });
    mockPrisma.audit.deleteMany.mockResolvedValue({ count: 1 });

    const { POST } = await import('@/app/api/campaigns/[id]/launch/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/launch');
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);
    const body = await response.json();

    // Assert — audits should be rolled back
    expect(response.status).toBe(402);
    expect(body.error).toBe('CREDIT_DEBIT_FAILED');
    expect(mockPrisma.audit.deleteMany).toHaveBeenCalled();
  });

  it('should return 401 without auth', async () => {
    // Arrange
    setupAuthFailure();

    const { POST } = await import('@/app/api/campaigns/[id]/launch/route');
    const request = createRequest('POST', 'http://localhost:3000/api/campaigns/c-1/launch');
    const params = { params: Promise.resolve({ id: 'c-1' }) };

    // Act
    const response = await POST(request, params as any);

    // Assert
    expect(response.status).toBe(401);
  });
});
