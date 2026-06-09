import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from '@/lib/repositories/user.repository';
import type { PrismaClient } from '@prisma/client';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaClient;

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new UserRepository();
    (repo as any).prisma = mockPrisma;
  });

  it('findById returns user when found', async () => {
    const user = { id: '1', email: 'test@test.com' };
    (mockPrisma.user.findUnique as any).mockResolvedValue(user);

    const result = await repo.findById('1');
    expect(result).toEqual(user);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' }, select: undefined });
  });

  it('findById returns null when not found', async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValue(null);

    const result = await repo.findById('nonexistent');
    expect(result).toBeNull();
  });

  it('getCredits returns 0 for missing user', async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValue(null);

    const credits = await repo.getCredits('1');
    expect(credits).toBe(0);
  });

  it('getCredits returns user credits', async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValue({ credits: 42 });

    const credits = await repo.getCredits('1');
    expect(credits).toBe(42);
  });

  it('decrementCredits calls update with decrement', async () => {
    (mockPrisma.user.update as any).mockResolvedValue({ credits: 4 });

    const result = await repo.decrementCredits('1', 1);
    expect(result).toBe(4);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { credits: { decrement: 1 } },
      select: { credits: true },
    });
  });

  it('incrementCredits calls update with increment', async () => {
    (mockPrisma.user.update as any).mockResolvedValue({ credits: 6 });

    const result = await repo.incrementCredits('1', 1);
    expect(result).toBe(6);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { credits: { increment: 1 } },
      select: { credits: true },
    });
  });
});
