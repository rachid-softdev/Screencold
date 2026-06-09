import type { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';

export abstract class BaseRepository {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }
}
