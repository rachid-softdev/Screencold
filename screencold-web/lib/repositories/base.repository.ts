import type { PrismaClient } from '@prisma/client';
import rawPrisma from '@/lib/prisma';

export abstract class BaseRepository {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = rawPrisma as unknown as PrismaClient;
  }
}
