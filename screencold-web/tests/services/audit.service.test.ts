import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '@/lib/services/audit.service';

vi.mock('@/lib/repositories/audit.repository', () => ({
  auditRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    updateResults: vi.fn(),
    countByUserId: vi.fn(),
  },
}));

vi.mock('@/lib/repositories/user.repository', () => ({
  userRepository: {
    updateCredits: vi.fn(),
  },
}));

vi.mock('@/lib/repositories/credit-transaction.repository', () => ({
  creditTransactionRepository: {
    create: vi.fn(),
  },
}));

import { auditRepository } from '@/lib/repositories/audit.repository';
import { userRepository } from '@/lib/repositories/user.repository';

describe('AuditService', () => {
  const service = new AuditService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create deducts credits and creates audit', async () => {
    const mockAudit = { id: 'audit-1', userId: 'u1', status: 'PROCESSING' };
    (userRepository.updateCredits as any).mockResolvedValue(4);
    (auditRepository.create as any).mockResolvedValue(mockAudit);

    const result = await service.create({
      userId: 'u1',
      url: 'https://example.com',
    });

    expect(result.id).toBe('audit-1');
    expect(userRepository.updateCredits).toHaveBeenCalledWith('u1', -1);
    expect(auditRepository.create).toHaveBeenCalled();
  });

  it('getById returns null for wrong userId', async () => {
    (auditRepository.findById as any).mockResolvedValue({
      id: '1',
      userId: 'other-user',
      status: 'READY',
    });

    const result = await service.getById('1', 'my-user');
    expect(result).toBeNull();
  });

  it('listByUser delegates to repository', async () => {
    const mockResult = { data: [], total: 0 };
    (auditRepository.findByUserId as any).mockResolvedValue(mockResult);

    const result = await service.listByUser('u1');
    expect(result).toEqual(mockResult);
  });
});
