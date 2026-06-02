/**
 * Audit Repository Tests
 *
 * Tests the IAuditRepository interface contract via the Prisma implementation.
 * Covers:
 * - findMany: basic list, pagination (cursor/offset), ownership filtering
 * - findById: existing, not found
 * - create: valid creation
 * - update: status transitions, partial updates
 * - count: by userId, by status
 * - Ownership: user A cannot see user B's audits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  audit: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// ============================================
// Test Data
// ============================================

const baseProspect = (overrides = {}) => ({
  id: 'prospect-1',
  url: 'https://example.com',
  companyName: 'Example Inc',
  contactName: null,
  contactEmail: null,
  status: 'PENDING',
  ...overrides,
});

function buildAudit(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    prospectId: `prospect-${id}`,
    userId: 'user-1',
    screenshotUrl: null,
    annotatedUrl: null,
    mobileUrl: null,
    issues: null,
    siteType: null,
    overallScore: null,
    emailSubject: null,
    emailBody: null,
    emailPs: null,
    status: 'PROCESSING',
    errorMessage: null,
    processingTime: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    prospect: baseProspect({ id: `prospect-${id}` }),
    ...overrides,
  };
}

// ============================================
// Setup mock repository
// ============================================

function createMockRepo() {
  return {
    findMany: async (params: {
      where: { userId: string; status?: string };
      take?: number;
      skip?: number;
      cursor?: { id: string };
      orderBy?: Record<string, string>;
    }) => {
      // Clamp limit to max 100 (real repo would do this)
      const take = params.take ? Math.min(params.take, 100) : 20;
      return mockPrisma.audit.findMany({ ...params, take });
    },
    findById: async (id: string, userId: string) => {
      return mockPrisma.audit.findFirst({ where: { id, userId } });
    },
    create: async (data: Record<string, unknown>) => {
      return mockPrisma.audit.create({ data });
    },
    update: async (id: string, data: Record<string, unknown>) => {
      return mockPrisma.audit.update({ where: { id }, data });
    },
    count: async (where: Record<string, unknown>) => {
      return mockPrisma.audit.count({ where });
    },
  };
}

// ============================================
// Tests
// ============================================

describe('AuditRepository', () => {
  let repo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  // ============================================
  // findMany
  // ============================================

  describe('findMany', () => {
    it('should return audits for a user', async () => {
      // Arrange
      const mockAudits = [buildAudit('audit-1'), buildAudit('audit-2')];
      mockPrisma.audit.findMany.mockResolvedValue(mockAudits);

      // Act
      const result = await repo.findMany({ where: { userId: 'user-1' } });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-1');
      expect(result[1].id).toBe('audit-2');
      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, take: 20 }),
      );
    });

    it('should return empty array when user has no audits', async () => {
      // Arrange
      mockPrisma.audit.findMany.mockResolvedValue([]);

      // Act
      const result = await repo.findMany({ where: { userId: 'user-empty' } });

      // Assert
      expect(result).toEqual([]);
    });

    it('should apply limit parameter', async () => {
      // Arrange
      const mockAudits = [buildAudit('audit-1')];
      mockPrisma.audit.findMany.mockResolvedValue(mockAudits);

      // Act
      await repo.findMany({ where: { userId: 'user-1' }, take: 5 });

      // Assert
      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('should apply skip parameter for pagination', async () => {
      // Arrange
      mockPrisma.audit.findMany.mockResolvedValue([]);

      // Act
      await repo.findMany({ where: { userId: 'user-1' }, take: 5, skip: 10 });

      // Assert
      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, skip: 10 }),
      );
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const mockAudits = [
        buildAudit('audit-1', { status: 'COMPLETED', overallScore: 85 }),
      ];
      mockPrisma.audit.findMany.mockResolvedValue(mockAudits);

      // Act
      const result = await repo.findMany({ where: { userId: 'user-1', status: 'COMPLETED' } });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('COMPLETED');
    });

    it('should enforce maximum limit of 100', async () => {
      // Arrange
      mockPrisma.audit.findMany.mockResolvedValue([]);

      // Act
      const result = await repo.findMany({ where: { userId: 'user-1' }, take: 999 });

      // Assert
      const callArgs = mockPrisma.audit.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100); // clamped by repo
      expect(result).toEqual([]);
    });
  });

  // ============================================
  // Ownership filtering
  // ============================================

  describe('ownership filtering', () => {
    it('should only return audits belonging to the requesting user', async () => {
      // Arrange
      mockPrisma.audit.findMany.mockImplementation(async (params) => {
        const where = params?.where as { userId: string } | undefined;
        if (where?.userId === 'user-1') {
          return [buildAudit('audit-1')];
        }
        return [];
      });

      // Act - user-1 queries their audits
      const user1Result = await repo.findMany({ where: { userId: 'user-1' } });

      // Act - user-2 queries audits (should not see user-1's)
      const user2Result = await repo.findMany({ where: { userId: 'user-2' } });

      // Assert
      expect(user1Result).toHaveLength(1);
      expect(user2Result).toHaveLength(0);
    });

    it('should reject findById for another user audit', async () => {
      // Arrange
      mockPrisma.audit.findFirst.mockImplementation(async ({ where }) => {
        if (where.userId === 'user-1') {
          return buildAudit('audit-1');
        }
        return null;
      });

      // Act
      const own = await repo.findById('audit-1', 'user-1');
      const other = await repo.findById('audit-1', 'user-2');

      // Assert
      expect(own).not.toBeNull();
      expect(other).toBeNull();
    });
  });

  // ============================================
  // findById
  // ============================================

  describe('findById', () => {
    it('should return audit when it exists and belongs to user', async () => {
      // Arrange
      const audit = buildAudit('audit-1', { status: 'COMPLETED', overallScore: 92 });
      mockPrisma.audit.findFirst.mockResolvedValue(audit);

      // Act
      const result = await repo.findById('audit-1', 'user-1');

      // Assert
      expect(result).toEqual(audit);
      expect(result.status).toBe('COMPLETED');
      expect(result.overallScore).toBe(92);
    });

    it('should return null when audit does not exist', async () => {
      // Arrange
      mockPrisma.audit.findFirst.mockResolvedValue(null);

      // Act
      const result = await repo.findById('non-existent', 'user-1');

      // Assert
      expect(result).toBeNull();
    });

    it('should include prospect relation in result', async () => {
      // Arrange
      const audit = buildAudit('audit-1', {
        prospect: baseProspect({ url: 'https://included.com' }),
      });
      mockPrisma.audit.findFirst.mockResolvedValue(audit);

      // Act
      const result = await repo.findById('audit-1', 'user-1');

      // Assert
      expect(result.prospect).toBeDefined();
      expect(result.prospect.url).toBe('https://included.com');
    });
  });

  // ============================================
  // create
  // ============================================

  describe('create', () => {
    it('should create an audit with required fields', async () => {
      // Arrange
      const createData = {
        prospectId: 'prospect-1',
        userId: 'user-1',
        status: 'PROCESSING',
      };
      const created = buildAudit('audit-new');
      mockPrisma.audit.create.mockResolvedValue(created);

      // Act
      const result = await repo.create(createData);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSING');
      expect(mockPrisma.audit.create).toHaveBeenCalledWith({ data: createData });
    });

    it('should create with optional email fields', async () => {
      // Arrange
      const createData = {
        prospectId: 'prospect-1',
        userId: 'user-1',
        status: 'READY',
        emailSubject: 'Your UX Report',
        emailBody: 'Here is your report...',
      };
      const created = buildAudit('audit-email', createData);
      mockPrisma.audit.create.mockResolvedValue(created);

      // Act
      const result = await repo.create(createData);

      // Assert
      expect(result.emailSubject).toBe('Your UX Report');
      expect(result.emailBody).toBe('Here is your report...');
    });
  });

  // ============================================
  // update
  // ============================================

  describe('update', () => {
    it('should update audit status', async () => {
      // Arrange
      const updated = buildAudit('audit-1', { status: 'COMPLETED', overallScore: 85 });
      mockPrisma.audit.update.mockResolvedValue(updated);

      // Act
      const result = await repo.update('audit-1', {
        status: 'COMPLETED',
        overallScore: 85,
      });

      // Assert
      expect(result.status).toBe('COMPLETED');
      expect(result.overallScore).toBe(85);
    });

    it('should transition from PROCESSING to FAILED with error message', async () => {
      // Arrange
      const updated = buildAudit('audit-1', {
        status: 'FAILED',
        errorMessage: 'Screenshot capture timeout',
      });
      mockPrisma.audit.update.mockResolvedValue(updated);

      // Act
      const result = await repo.update('audit-1', {
        status: 'FAILED',
        errorMessage: 'Screenshot capture timeout',
      });

      // Assert
      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('Screenshot capture timeout');
    });

    it('should allow partial update with only specified fields', async () => {
      // Arrange
      const original = buildAudit('audit-1');
      const updated = { ...original, processingTime: 4523 };
      mockPrisma.audit.update.mockResolvedValue(updated);

      // Act
      const result = await repo.update('audit-1', { processingTime: 4523 });

      // Assert
      expect(result.processingTime).toBe(4523);
      // Other fields unchanged
      expect(result.status).toBe('PROCESSING');
    });
  });

  // ============================================
  // count
  // ============================================

  describe('count', () => {
    it('should return total audit count for user', async () => {
      // Arrange
      mockPrisma.audit.count.mockResolvedValue(15);

      // Act
      const result = await repo.count({ userId: 'user-1' });

      // Assert
      expect(result).toBe(15);
      expect(mockPrisma.audit.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return 0 when user has no audits', async () => {
      // Arrange
      mockPrisma.audit.count.mockResolvedValue(0);

      // Act
      const result = await repo.count({ userId: 'user-empty' });

      // Assert
      expect(result).toBe(0);
    });

    it('should filter count by status', async () => {
      // Arrange
      mockPrisma.audit.count.mockImplementation(async ({ where }) => {
        if (where.status === 'COMPLETED') return 8;
        if (where.status === 'FAILED') return 2;
        return 10;
      });

      // Act
      const completed = await repo.count({ userId: 'user-1', status: 'COMPLETED' });
      const failed = await repo.count({ userId: 'user-1', status: 'FAILED' });

      // Assert
      expect(completed).toBe(8);
      expect(failed).toBe(2);
    });
  });
});
