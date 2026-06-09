import type { CreditTransaction, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class CreditTransactionRepository extends BaseRepository {
  async create(data: Prisma.CreditTransactionCreateInput): Promise<CreditTransaction> {
    return this.prisma.creditTransaction.create({ data });
  }

  async findManyByUserId(
    userId: string,
    limit = 50
  ): Promise<CreditTransaction[]> {
    return this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async countByUserIdAndPeriod(userId: string, start: Date, end: Date): Promise<number> {
    return this.prisma.creditTransaction.count({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
        amount: { lt: 0 },
      },
    });
  }
}
