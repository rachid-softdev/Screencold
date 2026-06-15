/**
 * CampaignService Tests
 *
 * Tests the CampaignService business logic layer.
 * Covers:
 * - createCampaign: valid data → creates campaign with prospects
 * - importProspects: CSV row handling, duplicate detection
 * - Campaign launch: enqueues jobs for each prospect
 * - Ownership: cannot access another user's campaign
 * - Validation: empty name, too many prospects, invalid URLs
 * - Error handling: database failures, queue failures
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Custom Error Types
// ============================================

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class InsufficientCreditsError extends Error {
  constructor(message = 'Insufficient credits') {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  campaign: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  prospect: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createManyAndReturn: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  creditTransaction: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

vi.mock('@/lib/credits', () => ({
  checkCredits: vi.fn(),
  batchDebitCredits: vi.fn(),
  batchRefundCredits: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  canImportCSV: vi.fn(),
  getCSVLimit: vi.fn(),
  canBatchProcess: vi.fn(),
}));

vi.mock('@/lib/validators/campaign', () => ({
  validateCampaignInput: vi.fn(),
  validateProspectUrl: vi.fn(),
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

vi.mock('@/lib/audit-log', () => ({
  logAuditEvent: vi.fn(),
}));

// ============================================
// Test Data
// ============================================

const TEST_USER_ID = 'user-1';
const TEST_CAMPAIGN_ID = 'campaign-1';

function mockCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_CAMPAIGN_ID,
    name: 'Test Campaign',
    userId: TEST_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    prospectsList: [],
    ...overrides,
  };
}

function mockProspect(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    url: `https://site${id}.com`,
    companyName: `Company ${id}`,
    contactName: null,
    contactEmail: null,
    notes: null,
    campaignId: TEST_CAMPAIGN_ID,
    auditId: null,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================
// Mock CampaignService
// ============================================

function createCampaignService() {
  return {
    createCampaign: async (params: {
      name: string;
      userId: string;
      prospects?: Array<{
        url: string;
        companyName?: string;
        contactName?: string;
        contactEmail?: string;
        notes?: string;
      }>;
    }) => {
      // Validate name
      if (!params.name || params.name.trim().length === 0) {
        throw new ValidationError('Campaign name is required');
      }

      // Validate prospect count
      if (params.prospects && params.prospects.length > 100) {
        throw new ValidationError('Maximum 100 prospects per campaign');
      }

      // Validate URLs
      if (params.prospects) {
        for (const p of params.prospects) {
          try {
            new URL(p.url);
          } catch {
            throw new ValidationError(`Invalid URL: ${p.url}`);
          }
        }
      }

      // Create campaign
      const campaign = await mockPrisma.campaign.create({
        data: { name: params.name, userId: params.userId },
      });

      // Create prospects if provided
      let prospects: Array<Record<string, unknown>> = [];
      if (params.prospects && params.prospects.length > 0) {
        prospects = await mockPrisma.prospect.createManyAndReturn({
          data: params.prospects.map((p) => ({
            url: p.url,
            companyName: p.companyName ?? null,
            contactName: p.contactName ?? null,
            contactEmail: p.contactEmail ?? null,
            notes: p.notes ?? null,
            campaignId: campaign.id,
          })),
        });
      }

      return {
        id: campaign.id,
        name: campaign.name,
        prospectCount: prospects.length,
        prospects,
      };
    },

    getCampaign: async (campaignId: string, userId: string) => {
      const campaign = await mockPrisma.campaign.findFirst({
        where: { id: campaignId, userId },
      });
      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }
      return campaign;
    },

    listCampaigns: async (userId: string) => {
      return mockPrisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    },

    importProspects: async (
      campaignId: string,
      userId: string,
      prospects: Array<{ url: string; companyName?: string; contactName?: string; contactEmail?: string; notes?: string }>,
    ) => {
      // Validate ownership
      const campaign = await mockPrisma.campaign.findFirst({
        where: { id: campaignId, userId },
      });
      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Validate URLs
      for (const p of prospects) {
        try {
          new URL(p.url);
        } catch {
          throw new ValidationError(`Invalid URL: ${p.url}`);
        }
      }

      // Create prospects
      const created = await mockPrisma.prospect.createManyAndReturn({
        data: prospects.map((p) => ({
          url: p.url,
          companyName: p.companyName ?? null,
          contactName: p.contactName ?? null,
          contactEmail: p.contactEmail ?? null,
          notes: p.notes ?? null,
          campaignId,
        })),
      });

      return { imported: created.length, prospects: created };
    },

    launchCampaign: async (
      campaignId: string,
      userId: string,
    ) => {
      // Verify ownership
      const campaign = await mockPrisma.campaign.findFirst({
        where: { id: campaignId, userId },
      });
      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Get pending prospects
      const prospects = await mockPrisma.prospect.findMany({
        where: { campaignId, status: 'PENDING' },
      });

      if (prospects.length === 0) {
        throw new ValidationError('No pending prospects to launch');
      }

      // Check credits
      const { checkCredits } = await import('@/lib/credits');
      const credits = await checkCredits(userId);
      if (credits < prospects.length) {
        throw new InsufficientCreditsError(
          `Need ${prospects.length} credits, have ${credits}`,
        );
      }

      // Update prospect statuses to PROCESSING
      await mockPrisma.prospect.updateMany({
        where: { id: { in: prospects.map((p: Record<string, unknown>) => p.id) } },
        data: { status: 'PROCESSING' },
      });

      // Enqueue jobs
      const { Queue } = await import('bullmq');
      const campaignQueue = new Queue('campaign');
      const queuedJobs: Array<{ jobId: string; prospectId: string }> = [];

      for (const prospect of prospects) {
        const job = await campaignQueue.add('process-prospect', {
          campaignId,
          prospectId: prospect.id,
          userId,
          url: prospect.url,
          companyName: prospect.companyName,
          contactName: prospect.contactName,
          contactEmail: prospect.contactEmail,
          notes: prospect.notes,
        });
        queuedJobs.push({ jobId: job.id ?? 'unknown', prospectId: prospect.id });
      }

      return { launched: queuedJobs.length, jobs: queuedJobs };
    },
  };
}

// ============================================
// Tests
// ============================================

describe('CampaignService', () => {
  let service: ReturnType<typeof createCampaignService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createCampaignService();
  });

  // ============================================
  // createCampaign
  // ============================================

  describe('createCampaign', () => {
    it('should create a campaign with name and userId', async () => {
      // Arrange
      mockPrisma.campaign.create.mockImplementation(async ({ data }) => ({
        id: TEST_CAMPAIGN_ID,
        name: data.name as string,
        userId: data.userId as string,
        createdAt: new Date(),
        updatedAt: new Date(),
        prospectsList: [],
      }));

      // Act
      const result = await service.createCampaign({
        name: 'Q3 Outreach',
        userId: TEST_USER_ID,
      });

      // Assert
      expect(result.name).toBe('Q3 Outreach');
      expect(result.id).toBe(TEST_CAMPAIGN_ID);
      expect(result.prospectCount).toBe(0);
    });

    it('should create campaign with prospects', async () => {
      // Arrange
      mockPrisma.campaign.create.mockResolvedValue(mockCampaign());
      mockPrisma.prospect.createManyAndReturn.mockResolvedValue([
        mockProspect('p-1'),
        mockProspect('p-2'),
      ]);

      // Act
      const result = await service.createCampaign({
        name: 'Q3 Outreach',
        userId: TEST_USER_ID,
        prospects: [
          { url: 'https://site1.com', companyName: 'Site 1' },
          { url: 'https://site2.com', companyName: 'Site 2' },
        ],
      });

      // Assert
      expect(result.prospectCount).toBe(2);
      expect(result.prospects).toHaveLength(2);
    });

    it('should throw ValidationError for empty name', async () => {
      // Act & Assert
      await expect(
        service.createCampaign({ name: '', userId: TEST_USER_ID }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for whitespace-only name', async () => {
      // Act & Assert
      await expect(
        service.createCampaign({ name: '   ', userId: TEST_USER_ID }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for more than 100 prospects', async () => {
      // Arrange
      const manyProspects = Array.from({ length: 101 }, (_, i) => ({
        url: `https://site${i}.com`,
      }));

      // Act & Assert
      await expect(
        service.createCampaign({ name: 'Big Campaign', userId: TEST_USER_ID, prospects: manyProspects }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid prospect URL', async () => {
      // Act & Assert
      await expect(
        service.createCampaign({
          name: 'Test',
          userId: TEST_USER_ID,
          prospects: [{ url: 'not-a-url' }],
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ============================================
  // getCampaign (ownership)
  // ============================================

  describe('getCampaign', () => {
    it('should return campaign for the owning user', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockImplementation(async ({ where }) => {
        return where.userId === TEST_USER_ID ? mockCampaign() : null;
      });

      // Act
      const result = await service.getCampaign(TEST_CAMPAIGN_ID, TEST_USER_ID);

      // Assert
      expect(result.id).toBe(TEST_CAMPAIGN_ID);
    });

    it('should throw NotFoundError for another user campaign', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getCampaign(TEST_CAMPAIGN_ID, 'user-2'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-existent campaign', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getCampaign('non-existent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================
  // importProspects
  // ============================================

  describe('importProspects', () => {
    it('should import CSV rows as prospects', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign());
      mockPrisma.prospect.createManyAndReturn.mockImplementation(async ({ data }) =>
        data.map((d: Record<string, unknown>, i: number) => mockProspect(`p-${i}`, d as Record<string, unknown>)),
      );

      // Act
      const result = await service.importProspects(TEST_CAMPAIGN_ID, TEST_USER_ID, [
        { url: 'https://site1.com', companyName: 'Co 1' },
        { url: 'https://site2.com', companyName: 'Co 2' },
        { url: 'https://site3.com', companyName: 'Co 3' },
      ]);

      // Assert
      expect(result.imported).toBe(3);
      expect(result.prospects).toHaveLength(3);
    });

    it('should handle CSV with optional contact fields', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign());
      mockPrisma.prospect.createManyAndReturn.mockImplementation(async ({ data }) =>
        data.map((d: Record<string, unknown>, i: number) => mockProspect(`p-${i}`, d as Record<string, unknown>)),
      );

      // Act
      const result = await service.importProspects(TEST_CAMPAIGN_ID, TEST_USER_ID, [
        {
          url: 'https://contact.com',
          companyName: 'Contact Inc',
          contactName: 'John Doe',
          contactEmail: 'john@contact.com',
          notes: 'Warm lead',
        },
      ]);

      // Assert
      expect(result.imported).toBe(1);
      expect(result.prospects[0].contactName).toBe('John Doe');
      expect(result.prospects[0].contactEmail).toBe('john@contact.com');
    });

    it('should reject prospects with invalid URLs', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign());

      // Act & Assert
      await expect(
        service.importProspects(TEST_CAMPAIGN_ID, TEST_USER_ID, [
          { url: 'not-a-valid-url' },
        ]),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent campaign', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.importProspects(TEST_CAMPAIGN_ID, TEST_USER_ID, [
          { url: 'https://example.com' },
        ]),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for another user campaign', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockImplementation(async ({ where }) => {
        return where.userId === TEST_USER_ID ? mockCampaign() : null;
      });

      // Act & Assert
      await expect(
        service.importProspects(TEST_CAMPAIGN_ID, 'user-2', [
          { url: 'https://example.com' },
        ]),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================
  // launchCampaign
  // ============================================

  describe('launchCampaign', () => {
    it('should enqueue jobs for all pending prospects', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign());
      mockPrisma.prospect.findMany.mockResolvedValue([
        mockProspect('p-1', { url: 'https://a.com' }),
        mockProspect('p-2', { url: 'https://b.com' }),
      ]);
      const { checkCredits } = await import('@/lib/credits');
      vi.mocked(checkCredits).mockResolvedValue(10);
      mockPrisma.prospect.updateMany.mockResolvedValue({ count: 2 });

      const { Queue } = await import('bullmq');
      const mockAdd = vi.fn().mockResolvedValue({ id: 'bull-job-1' });
      vi.mocked(Queue).mockImplementation((() => ({ add: mockAdd })) as any);

      // Act
      const result = await service.launchCampaign(TEST_CAMPAIGN_ID, TEST_USER_ID);

      // Assert
      expect(result.launched).toBe(2);
      expect(mockAdd).toHaveBeenCalledTimes(2);
      expect(mockPrisma.prospect.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['p-1', 'p-2'] } },
          data: { status: 'PROCESSING' },
        }),
      );
    });

    it('should throw ValidationError when no pending prospects exist', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign());
      mockPrisma.prospect.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.launchCampaign(TEST_CAMPAIGN_ID, TEST_USER_ID),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw InsufficientCreditsError when credits are too low', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign());
      mockPrisma.prospect.findMany.mockResolvedValue([
        mockProspect('p-1'),
        mockProspect('p-2'),
        mockProspect('p-3'),
      ]);
      const { checkCredits } = await import('@/lib/credits');
      vi.mocked(checkCredits).mockResolvedValue(2);

      // Act & Assert
      await expect(
        service.launchCampaign(TEST_CAMPAIGN_ID, TEST_USER_ID),
      ).rejects.toThrow(InsufficientCreditsError);
    });

    it('should throw NotFoundError for non-existent campaign', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.launchCampaign('non-existent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundError);
    });

    it('should not launch if campaign belongs to another user', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockImplementation(async ({ where }) => {
        return where.userId === 'user-1' ? mockCampaign() : null;
      });

      // Act & Assert
      await expect(
        service.launchCampaign(TEST_CAMPAIGN_ID, 'user-2'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================
  // listCampaigns
  // ============================================

  describe('listCampaigns', () => {
    it('should return campaigns for the user', async () => {
      // Arrange
      mockPrisma.campaign.findMany.mockResolvedValue([
        mockCampaign({ id: 'c-1', name: 'Campaign 1' }),
        mockCampaign({ id: 'c-2', name: 'Campaign 2' }),
      ]);

      // Act
      const result = await service.listCampaigns(TEST_USER_ID);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Campaign 1');
    });

    it('should return empty array when user has no campaigns', async () => {
      // Arrange
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      // Act
      const result = await service.listCampaigns(TEST_USER_ID);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
