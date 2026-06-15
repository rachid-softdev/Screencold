import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  audit: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

import { AuditRepository } from '@/lib/repositories/audit.repository';

describe('AuditRepository', () => {
  let repo: AuditRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new AuditRepository();
  });

  it('findById returns audit with relations', async () => {
    const audit = { id: '1', userId: 'u1', status: 'READY' };
    mockPrisma.audit.findUnique.mockResolvedValue(audit);

    const result = await repo.findById('1');
    expect(result).toEqual(audit);
    expect(mockPrisma.audit.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
      include: { prospect: true, sentEmails: { take: 1, orderBy: { sentAt: 'desc' } } },
    });
  });

  it('findByUserId returns paginated results', async () => {
    const audits = [
      { id: '1', userId: 'u1', prospect: { url: 'https://example.com' } },
      { id: '2', userId: 'u1', prospect: { url: 'https://test.com' } },
    ];
    mockPrisma.audit.count.mockResolvedValue(2);
    mockPrisma.audit.findMany.mockResolvedValue(audits);

    const result = await repo.findByUserId('u1');
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('create inserts a new audit', async () => {
    const input = {
      user: { connect: { id: 'u1' } },
      status: 'PROCESSING' as const,
      prospect: { create: { url: 'https://example.com' } },
    };
    const created = { id: 'new-audit', ...input };
    mockPrisma.audit.create.mockResolvedValue(created);

    const result = await repo.create(input as any);
    expect(result.id).toBe('new-audit');
    expect(mockPrisma.audit.create).toHaveBeenCalledWith({ data: input });
  });

  it('updateStatus modifies audit status', async () => {
    mockPrisma.audit.update.mockResolvedValue({ id: '1', status: 'READY' });

    const result = await repo.updateStatus('1', 'READY');
    expect(result.status).toBe('READY');
  });
});
