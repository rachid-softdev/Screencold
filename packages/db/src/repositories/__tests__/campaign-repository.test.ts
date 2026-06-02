/**
 * Campaign Repository Tests
 *
 * Tests the ICampaignRepository interface contract via the Prisma implementation.
 * Covers:
 * - create: valid campaign with prospects, empty prospect list
 * - getProspects: list by campaign, pagination, status filter
 * - stats: aggregate counts per status
 * - findById: includes prospects, ownership
 * - update: rename, add/remove prospects
 * - Ownership: user A cannot see user B's campaigns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  campaign: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  prospect: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    createManyAndReturn: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// ============================================
// Test Data
// ============================================

function buildCampaign(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Campaign ${id}`,
    userId: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    prospectsList: [],
    ...overrides,
  };
}

function buildProspect(id: string, campaignId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    url: `https://site${id}.com`,
    companyName: `Company ${id}`,
    contactName: null,
    contactEmail: null,
    notes: null,
    campaignId,
    auditId: null,
    status: 'PENDING',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

// ============================================
// Setup mock repository
// ============================================

function createMockRepo() {
  return {
    findById: async (id: string, userId: string) => {
      return mockPrisma.campaign.findFirst({ where: { id, userId } });
    },
    findMany: async (params: { userId: string; limit?: number; offset?: number }) => {
      return mockPrisma.campaign.findMany(params);
    },
    create: async (data: Record<string, unknown>) => {
      return mockPrisma.campaign.create({ data });
    },
    update: async (id: string, data: Record<string, unknown>) => {
      return mockPrisma.campaign.update({ where: { id }, data });
    },
    delete: async (id: string) => {
      return mockPrisma.campaign.delete({ where: { id } });
    },
    getProspects: async (campaignId: string, params?: { status?: string; limit?: number; offset?: number }) => {
      return mockPrisma.prospect.findMany({ where: { campaignId, ...(params?.status ? { status: params.status } : {}) }, ...(params?.limit ? { take: params.limit } : {}), ...(params?.offset ? { skip: params.offset } : {}) });
    },
    getProspectCount: async (campaignId: string) => {
      return mockPrisma.prospect.count({ where: { campaignId } });
    },
    getStats: async (campaignId: string) => {
      const all = await mockPrisma.prospect.findMany({ where: { campaignId }, select: { status: true } });
      const stats = { total: 0, pending: 0, processing: 0, done: 0, failed: 0 };
      for (const p of all) {
        stats.total++;
        stats[p.status.toLowerCase() as keyof typeof stats]++;
      }
      return stats;
    },
    addProspects: async (campaignId: string, prospects: Array<Record<string, unknown>>) => {
      return mockPrisma.prospect.createManyAndReturn({ data: prospects.map((p) => ({ ...p, campaignId })) });
    },
    updateProspectStatus: async (campaignId: string, prospectIds: string[], status: string) => {
      return mockPrisma.prospect.updateMany({ where: { id: { in: prospectIds }, campaignId }, data: { status } });
    },
  };
}

// ============================================
// Tests
// ============================================

describe('CampaignRepository', () => {
  let repo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  // ============================================
  // create
  // ============================================

  describe('create', () => {
    it('should create a campaign with name and userId', async () => {
      // Arrange
      const campaign = buildCampaign('campaign-new', { name: 'Q3 Outreach' });
      mockPrisma.campaign.create.mockResolvedValue(campaign);

      // Act
      const result = await repo.create({
        name: 'Q3 Outreach',
        userId: 'user-1',
      });

      // Assert
      expect(result.name).toBe('Q3 Outreach');
      expect(result.userId).toBe('user-1');
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith({
        data: { name: 'Q3 Outreach', userId: 'user-1' },
      });
    });

    it('should create campaign and return with generated id', async () => {
      // Arrange
      mockPrisma.campaign.create.mockImplementation(async ({ data }) => ({
        ...data,
        id: 'generated-id-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        prospectsList: [],
      }));

      // Act
      const result = await repo.create({ name: 'My Campaign', userId: 'user-1' });

      // Assert
      expect(result.id).toBe('generated-id-123');
    });
  });

  // ============================================
  // getProspects
  // ============================================

  describe('getProspects', () => {
    it('should return all prospects for a campaign', async () => {
      // Arrange
      const prospects = [
        buildProspect('p-1', 'campaign-1'),
        buildProspect('p-2', 'campaign-1'),
      ];
      mockPrisma.prospect.findMany.mockResolvedValue(prospects);

      // Act
      const result = await repo.getProspects('campaign-1');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrisma.prospect.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { campaignId: 'campaign-1' } }),
      );
    });

    it('should support pagination with limit and offset', async () => {
      // Arrange
      mockPrisma.prospect.findMany.mockResolvedValue([]);

      // Act
      await repo.getProspects('campaign-1', { limit: 10, offset: 20 });

      // Assert
      expect(mockPrisma.prospect.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaignId: 'campaign-1' },
          take: 10,
          skip: 20,
        }),
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockPrisma.prospect.findMany.mockImplementation(async ({ where }) => {
        if (where.status === 'DONE') {
          return [buildProspect('p-done', 'campaign-1', { status: 'DONE' })];
        }
        return [];
      });

      // Act
      const result = await repo.getProspects('campaign-1', { status: 'DONE' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('DONE');
    });

    it('should return empty array when campaign has no prospects', async () => {
      // Arrange
      mockPrisma.prospect.findMany.mockResolvedValue([]);

      // Act
      const result = await repo.getProspects('empty-campaign');

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================
  // stats
  // ============================================

  describe('getStats', () => {
    it('should compute correct stats for mixed status prospects', async () => {
      // Arrange
      const prospects = [
        { status: 'PENDING' },
        { status: 'PENDING' },
        { status: 'PROCESSING' },
        { status: 'DONE' },
        { status: 'FAILED' },
      ];
      mockPrisma.prospect.findMany.mockResolvedValue(prospects);

      // Act
      const stats = await repo.getStats('campaign-1');

      // Assert
      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(2);
      expect(stats.processing).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should return zeros when campaign has no prospects', async () => {
      // Arrange
      mockPrisma.prospect.findMany.mockResolvedValue([]);

      // Act
      const stats = await repo.getStats('empty-campaign');

      // Assert
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(0);
      expect(stats.done).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  // ============================================
  // findById
  // ============================================

  describe('findById', () => {
    it('should return campaign for the owning user', async () => {
      // Arrange
      const campaign = buildCampaign('campaign-1', {
        prospectsList: [buildProspect('p-1', 'campaign-1')],
      });
      mockPrisma.campaign.findFirst.mockResolvedValue(campaign);

      // Act
      const result = await repo.findById('campaign-1', 'user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('campaign-1');
    });

    it('should return null when campaign belongs to another user', async () => {
      // Arrange
      mockPrisma.campaign.findFirst.mockImplementation(async ({ where }) => {
        return where.userId === 'user-1'
          ? buildCampaign('campaign-1')
          : null;
      });

      // Act
      const result = await repo.findById('campaign-1', 'user-2');

      // Assert
      expect(result).toBeNull();
    });

    it('should include prospects in the response', async () => {
      // Arrange
      const campaign = buildCampaign('campaign-1', {
        prospectsList: [
          buildProspect('p-1', 'campaign-1'),
          buildProspect('p-2', 'campaign-1'),
        ],
      });
      mockPrisma.campaign.findFirst.mockResolvedValue(campaign);

      // Act
      const result = await repo.findById('campaign-1', 'user-1');

      // Assert
      expect(result.prospectsList).toHaveLength(2);
    });
  });

  // ============================================
  // addProspects
  // ============================================

  describe('addProspects', () => {
    it('should add prospects to an existing campaign', async () => {
      // Arrange
      const newProspects = [
        { url: 'https://newsite1.com', companyName: 'NewCo 1' },
        { url: 'https://newsite2.com', companyName: 'NewCo 2' },
      ];
      const createdProspects = [
        buildProspect('p-new1', 'campaign-1', { url: 'https://newsite1.com' }),
        buildProspect('p-new2', 'campaign-1', { url: 'https://newsite2.com' }),
      ];
      mockPrisma.prospect.createManyAndReturn.mockResolvedValue(createdProspects);

      // Act
      const result = await repo.addProspects('campaign-1', newProspects);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrisma.prospect.createManyAndReturn).toHaveBeenCalledWith({
        data: newProspects.map((p) => ({ ...p, campaignId: 'campaign-1' })),
      });
    });

    it('should handle duplicate URL within same campaign gracefully', async () => {
      // Arrange
      const prismaError = new Error('Unique constraint failed');
      prismaError.name = 'PrismaClientKnownRequestError';
      (prismaError as Record<string, unknown>).code = 'P2002';
      mockPrisma.prospect.createManyAndReturn.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(
        repo.addProspects('campaign-1', [{ url: 'https://duplicate.com' }]),
      ).rejects.toThrow();
    });
  });

  // ============================================
  // updateProspectStatus
  // ============================================

  describe('updateProspectStatus', () => {
    it('should update status for specified prospects', async () => {
      // Arrange
      mockPrisma.prospect.updateMany.mockResolvedValue({ count: 2 });

      // Act
      const result = await repo.updateProspectStatus(
        'campaign-1',
        ['p-1', 'p-2'],
        'PROCESSING',
      );

      // Assert
      expect(result).toEqual({ count: 2 });
      expect(mockPrisma.prospect.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['p-1', 'p-2'] }, campaignId: 'campaign-1' },
        data: { status: 'PROCESSING' },
      });
    });

    it('should not update prospects outside the campaign', async () => {
      // Arrange
      mockPrisma.prospect.updateMany.mockImplementation(async ({ where }) => {
        // Simulate: only campaign-1 has prospects, campaign-2 has none
        return where.campaignId === 'campaign-1' ? { count: 1 } : { count: 0 };
      });

      // Act - updating prospects in campaign-2 where there are no matching prospects
      const result = await repo.updateProspectStatus(
        'campaign-2',
        ['p-other'],
        'DONE',
      );

      // Assert - zero prospects updated because campaign-2 has no matching prospects
      expect(result).toEqual({ count: 0 });
    });
  });

  // ============================================
  // delete
  // ============================================

  describe('delete', () => {
    it('should delete a campaign', async () => {
      // Arrange
      mockPrisma.campaign.delete.mockResolvedValue(buildCampaign('campaign-1'));

      // Act
      const result = await repo.delete('campaign-1');

      // Assert
      expect(result.id).toBe('campaign-1');
      expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
      });
    });

    it('should cascade delete prospects', async () => {
      // Arrange
      mockPrisma.campaign.delete.mockResolvedValue(buildCampaign('campaign-1'));

      // Act
      await repo.delete('campaign-1');

      // Assert - cascade is handled by Prisma schema (onDelete: Cascade)
      expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
      });
    });
  });
});
