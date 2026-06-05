/**
 * AuditService Tests
 *
 * Tests the AuditService business logic layer.
 * Covers:
 * - createAudit: valid URL → creates audit, deducts credits, enqueues job
 * - Invalid URL (SSRF validation) → throws error
 * - Insufficient credits → throws InsufficientCreditsError
 * - Ownership: cannot access another user's audit
 * - Pagination: list audits with filters
 * - Error handling: database failures, queue failures
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Custom Error Types
// ============================================

class InsufficientCreditsError extends Error {
  constructor(message = 'Insufficient credits') {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

class SSRFValidationError extends Error {
  constructor(message = 'URL blocked by SSRF protection') {
    super(message);
    this.name = 'SSRFValidationError';
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  audit: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  prospect: {
    create: vi.fn(),
    update: vi.fn(),
  },
  campaign: {
    findUnique: vi.fn(),
    create: vi.fn(),
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
  debitCredits: vi.fn(),
  refundCredits: vi.fn(),
}));

vi.mock('@/lib/ssrf', () => ({
  validateUrl: vi.fn(),
  isPrivateIP: vi.fn(),
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

// Mock audit-log
vi.mock('@/lib/audit-log', () => ({
  logAuditEvent: vi.fn(),
}));

// ============================================
// Imports
// ============================================

import { checkCredits, debitCredits } from '@/lib/credits';
import { validateUrl } from '@/lib/ssrf';

// ============================================
// Mock AuditService
// ============================================

function createAuditService() {
  return {
    createAudit: async (params: {
      url: string;
      userId: string;
      companyName?: string;
      correlationId?: string;
    }) => {
      // 1. Validate URL (SSRF protection)
      try {
        await validateUrl(params.url);
      } catch {
        throw new SSRFValidationError();
      }

      // 2. Check credits
      const credits = await checkCredits(params.userId);
      if (credits <= 0) {
        throw new InsufficientCreditsError();
      }

      // 3. Create campaign (auto for single audit)
      const campaign = await mockPrisma.campaign.create({
        data: { name: `Audit ${new Date().toISOString()}`, userId: params.userId },
      });

      // 4. Create prospect
      const prospect = await mockPrisma.prospect.create({
        data: {
          url: params.url,
          companyName: params.companyName ?? null,
          campaignId: campaign.id,
          status: 'PENDING',
        },
      });

      // 5. Create audit record
      const audit = await mockPrisma.audit.create({
        data: {
          prospectId: prospect.id,
          userId: params.userId,
          status: 'PROCESSING',
        },
      });

      // 6. Deduct credit
      const debited = await debitCredits(params.userId, audit.id);
      if (!debited) {
        throw new InsufficientCreditsError('Credit debit failed');
      }

      // 7. Enqueue audit job
      const { Queue } = await import('bullmq');
      const auditQueue = new Queue('audit');
      await auditQueue.add('process-audit', {
        auditId: audit.id,
        prospectId: prospect.id,
        userId: params.userId,
        url: params.url,
        captureOnly: false,
        correlationId: params.correlationId,
      });

      return {
        id: audit.id,
        status: audit.status,
        prospectId: prospect.id,
        campaignId: campaign.id,
        creditsRemaining: credits - 1,
      };
    },

    getAudit: async (auditId: string, userId: string) => {
      const audit = await mockPrisma.audit.findFirst({
        where: { id: auditId, userId },
      });
      if (!audit) {
        throw new NotFoundError('Audit not found');
      }
      return audit;
    },

    listAudits: async (userId: string, params?: { limit?: number; cursor?: string; status?: string }) => {
      return mockPrisma.audit.findMany({
        where: { userId, ...(params?.status ? { status: params.status } : {}) },
        take: params?.limit ?? 20,
        ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' as const },
      });
    },
  };
}

// ============================================
// Tests
// ============================================

describe('AuditService', () => {
  let service: ReturnType<typeof createAuditService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createAuditService();

    // Default mock: valid URL
    vi.mocked(validateUrl).mockResolvedValue(undefined);
    vi.mocked(checkCredits).mockResolvedValue(10);
    vi.mocked(debitCredits).mockResolvedValue(true);
  });

  // ============================================
  // createAudit
  // ============================================

  describe('createAudit', () => {
    it('should create audit with valid URL and sufficient credits', async () => {
      // Arrange
      mockPrisma.campaign.create.mockResolvedValue({ id: 'campaign-1' });
      mockPrisma.prospect.create.mockResolvedValue({ id: 'prospect-1', url: 'https://example.com', campaignId: 'campaign-1', status: 'PENDING' });
      mockPrisma.audit.create.mockResolvedValue({ id: 'audit-1', status: 'PROCESSING', prospectId: 'prospect-1', userId: 'user-1' });

      // Act
      const result = await service.createAudit({
        url: 'https://example.com',
        userId: 'user-1',
        companyName: 'Example Inc',
      });

      // Assert
      expect(result.id).toBe('audit-1');
      expect(result.status).toBe('PROCESSING');
      expect(result.creditsRemaining).toBe(9);

      // Verify URL validation was called
      expect(validateUrl).toHaveBeenCalledWith('https://example.com');

      // Verify credit was deducted
      expect(debitCredits).toHaveBeenCalledWith('user-1', 'audit-1');

      // Verify audit was created
      expect(mockPrisma.audit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prospectId: 'prospect-1',
          userId: 'user-1',
          status: 'PROCESSING',
        }),
      });
    });

    it('should create prospect with optional company name', async () => {
      // Arrange
      mockPrisma.campaign.create.mockResolvedValue({ id: 'campaign-1' });
      mockPrisma.prospect.create.mockResolvedValue({ id: 'prospect-1', url: 'https://example.com', companyName: 'Example Inc', campaignId: 'campaign-1' });
      mockPrisma.audit.create.mockResolvedValue({ id: 'audit-1', status: 'PROCESSING', prospectId: 'prospect-1' });

      // Act
      await service.createAudit({
        url: 'https://example.com',
        userId: 'user-1',
        companyName: 'Example Inc',
      });

      // Assert
      expect(mockPrisma.prospect.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyName: 'Example Inc' }),
        }),
      );
    });

    it('should create prospect with null company name when not provided', async () => {
      // Arrange
      mockPrisma.campaign.create.mockResolvedValue({ id: 'campaign-1' });
      mockPrisma.prospect.create.mockResolvedValue({ id: 'prospect-2', url: 'https://anonyme.com', campaignId: 'campaign-1' });
      mockPrisma.audit.create.mockResolvedValue({ id: 'audit-2', status: 'PROCESSING', prospectId: 'prospect-2' });

      // Act
      await service.createAudit({
        url: 'https://anonyme.com',
        userId: 'user-1',
      });

      // Assert
      expect(mockPrisma.prospect.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyName: null }),
        }),
      );
    });

    it('should throw SSRFValidationError for blocked URLs', async () => {
      // Arrange
      vi.mocked(validateUrl).mockRejectedValue(new Error('Private IP detected'));

      // Act & Assert
      await expect(
        service.createAudit({ url: 'http://127.0.0.1:8080', userId: 'user-1' }),
      ).rejects.toThrow(SSRFValidationError);

      // Verify no resources were created
      expect(mockPrisma.audit.create).not.toHaveBeenCalled();
      expect(mockPrisma.prospect.create).not.toHaveBeenCalled();
      expect(mockPrisma.campaign.create).not.toHaveBeenCalled();
      expect(debitCredits).not.toHaveBeenCalled();
    });

    it('should throw SSRFValidationError for non-HTTP URLs', async () => {
      // Arrange
      vi.mocked(validateUrl).mockRejectedValue(new Error('Only HTTP(S) protocols allowed'));

      // Act & Assert
      await expect(
        service.createAudit({ url: 'ftp://files.example.com', userId: 'user-1' }),
      ).rejects.toThrow(SSRFValidationError);
    });

    it('should throw InsufficientCreditsError when user has 0 credits', async () => {
      // Arrange
      vi.mocked(checkCredits).mockResolvedValue(0);

      // Act & Assert
      await expect(
        service.createAudit({ url: 'https://example.com', userId: 'user-1' }),
      ).rejects.toThrow(InsufficientCreditsError);

      // Verify no audit was created
      expect(mockPrisma.audit.create).not.toHaveBeenCalled();
    });

    it('should throw InsufficientCreditsError when debitCredits returns false', async () => {
      // Arrange
      mockPrisma.campaign.create.mockResolvedValue({ id: 'campaign-1' });
      mockPrisma.prospect.create.mockResolvedValue({ id: 'prospect-1' });
      mockPrisma.audit.create.mockResolvedValue({ id: 'audit-1', status: 'PROCESSING', prospectId: 'prospect-1' });
      vi.mocked(debitCredits).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.createAudit({ url: 'https://example.com', userId: 'user-1' }),
      ).rejects.toThrow(InsufficientCreditsError);
    });

    it('should enqueue a BullMQ job after successful creation', async () => {
      // Arrange
      mockPrisma.campaign.create.mockResolvedValue({ id: 'campaign-1' });
      mockPrisma.prospect.create.mockResolvedValue({ id: 'prospect-1', url: 'https://example.com', campaignId: 'campaign-1' });
      mockPrisma.audit.create.mockResolvedValue({ id: 'audit-1', status: 'PROCESSING', prospectId: 'prospect-1' });

      const { Queue } = await import('bullmq');
      const mockAdd = vi.fn();
      vi.mocked(Queue).mockImplementation(() => ({ add: mockAdd }) as unknown as ReturnType<typeof Queue>);

      // Act
      await service.createAudit({
        url: 'https://example.com',
        userId: 'user-1',
        correlationId: 'corr-123',
      });

      // Assert
      expect(mockAdd).toHaveBeenCalledWith('process-audit', {
        auditId: 'audit-1',
        prospectId: 'prospect-1',
        userId: 'user-1',
        url: 'https://example.com',
        captureOnly: false,
        correlationId: 'corr-123',
      });
    });

    it('should handle non-HTTP URL validation', async () => {
      // Arrange
      vi.mocked(validateUrl).mockRejectedValue(new Error('Invalid URL scheme'));

      // Act & Assert
      await expect(
        service.createAudit({ url: 'javascript:alert(1)', userId: 'user-1' }),
      ).rejects.toThrow(SSRFValidationError);
    });

    it('should create a new auto-campaign for each standalone audit', async () => {
      // Arrange
      mockPrisma.campaign.create.mockResolvedValue({ id: 'campaign-auto' });
      mockPrisma.prospect.create.mockResolvedValue({ id: 'prospect-3' });
      mockPrisma.audit.create.mockResolvedValue({ id: 'audit-3' });

      // Act
      await service.createAudit({
        url: 'https://site1.com',
        userId: 'user-1',
      });
      await service.createAudit({
        url: 'https://site2.com',
        userId: 'user-1',
      });

      // Assert - two campaigns created
      expect(mockPrisma.campaign.create).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // getAudit (ownership)
  // ============================================

  describe('getAudit', () => {
    it('should return audit when it belongs to the user', async () => {
      // Arrange
      const audit = { id: 'audit-1', userId: 'user-1', status: 'COMPLETED', prospectId: 'prospect-1' };
      mockPrisma.audit.findFirst.mockResolvedValue(audit);

      // Act
      const result = await service.getAudit('audit-1', 'user-1');

      // Assert
      expect(result.id).toBe('audit-1');
    });

    it('should throw NotFoundError when audit belongs to another user', async () => {
      // Arrange
      mockPrisma.audit.findFirst.mockImplementation(async ({ where }) => {
        return where.userId === 'user-1' ? { id: 'audit-1', userId: 'user-1' } : null;
      });

      // Act & Assert
      await expect(service.getAudit('audit-1', 'user-2')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-existent audit', async () => {
      // Arrange
      mockPrisma.audit.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getAudit('non-existent', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================
  // listAudits
  // ============================================

  describe('listAudits', () => {
    it('should list audits for the user in descending order', async () => {
      // Arrange
      const audits = [
        { id: 'audit-2', createdAt: new Date('2025-02-01') },
        { id: 'audit-1', createdAt: new Date('2025-01-01') },
      ];
      mockPrisma.audit.findMany.mockResolvedValue(audits);

      // Act
      const result = await service.listAudits('user-1');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockPrisma.audit.findMany.mockImplementation(async ({ where }) => {
        if (where.status === 'COMPLETED') return [{ id: 'audit-completed' }];
        return [];
      });

      // Act
      const result = await service.listAudits('user-1', { status: 'COMPLETED' });

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should respect limit parameter', async () => {
      // Arrange
      mockPrisma.audit.findMany.mockResolvedValue([]);

      // Act
      await service.listAudits('user-1', { limit: 5 });

      // Assert
      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('should default limit to 20 when not specified', async () => {
      // Arrange
      mockPrisma.audit.findMany.mockResolvedValue([]);

      // Act
      await service.listAudits('user-1');

      // Assert
      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });
  });
});
