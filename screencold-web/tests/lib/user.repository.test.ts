import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => {
  const user = { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() };
  return {
    user,
    $transaction: vi.fn((cb: (tx: any) => any) => {
      return cb({
        user: {
          findUnique: (args: any) => user.findUnique(args),
          update: (args: any) => user.update(args),
        },
      });
    }),
  };
});

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

import { UserRepository } from '@/lib/repositories/user.repository';

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new UserRepository();
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

  it('findById with credits selection returns 0 for missing user', async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValue(null);

    const user = await repo.findById('1', { credits: true });
    expect(user).toBeNull();
  });

  it('findById returns user credits', async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValue({ credits: 42 });

    const user = await repo.findById('1', { credits: true });
    expect(user?.credits).toBe(42);
  });

  it('updateCredits calls update with decrement', async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValue({ id: '1', credits: 5 });
    (mockPrisma.user.update as any).mockResolvedValue({ credits: 4 });

    const result = await repo.updateCredits('1', -1);
    expect(result).toBe(4);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { credits: { increment: -1 } },
      select: { credits: true },
    });
  });

  it('updateCredits calls update with increment', async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValue({ id: '1', credits: 5 });
    (mockPrisma.user.update as any).mockResolvedValue({ credits: 6 });

    const result = await repo.updateCredits('1', 1);
    expect(result).toBe(6);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { credits: { increment: 1 } },
      select: { credits: true },
    });
  });
});
