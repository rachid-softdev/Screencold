import prisma from '@/lib/prisma';
import type { User } from '@prisma/client';

export interface IUserRepository {
  findById(id: string, select?: Record<string, boolean>): Promise<Partial<User> | null>;
  findByEmail(email: string): Promise<User | null>;
  updateCredits(userId: string, delta: number): Promise<number>;
  findUsersDueForReset(now: Date): Promise<Pick<User, 'id' | 'plan'>[]>;
}

export class UserRepository implements IUserRepository {
  async findById(id: string, select?: Record<string, boolean>) {
    return prisma.user.findUnique({
      where: { id },
      ...(select ? { select } : {}),
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async updateCredits(userId: string, delta: number): Promise<number> {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true, id: true },
      });
      if (!user) throw new Error('User not found');
      if (delta < 0 && user.credits < Math.abs(delta)) {
        throw new Error('Insufficient credits');
      }
      const updated = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: delta } },
        select: { credits: true },
      });
      return updated.credits;
    });
    return result;
  }

  async findUsersDueForReset(now: Date) {
    return prisma.user.findMany({
      where: {
        OR: [
          { creditsResetsAt: { lte: now } },
          { creditsResetsAt: null },
        ],
      },
      select: { id: true, plan: true },
    });
  }
}

export const userRepository = new UserRepository();
