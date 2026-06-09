import prisma from '@/lib/prisma';
import type { Audit, AuditStatus, Prisma } from '@prisma/client';

export interface AuditFilter {
  userId?: string;
  status?: AuditStatus;
  prospectId?: string;
  campaignId?: string;
}

export interface PaginatedQuery<T> {
  data: T[];
  total: number;
  nextCursor?: string;
}

export interface IAuditRepository {
  findById(id: string): Promise<Audit | null>;
  findByUserId(userId: string, cursor?: string, limit?: number): Promise<PaginatedQuery<Audit>>;
  create(data: Prisma.AuditCreateInput): Promise<Audit>;
  updateStatus(id: string, status: AuditStatus, errorMessage?: string): Promise<Audit>;
  updateResults(id: string, data: Partial<Pick<Audit, 'screenshotUrl' | 'annotatedUrl' | 'mobileUrl' | 'issues' | 'overallScore' | 'siteType' | 'processingTime'>>): Promise<Audit>;
  countByUserId(userId: string): Promise<number>;
}

export class AuditRepository implements IAuditRepository {
  async findById(id: string) {
    return prisma.audit.findUnique({
      where: { id },
      include: {
        prospect: true,
        sentEmails: { take: 1, orderBy: { sentAt: 'desc' } },
      },
    });
  }

  async findByUserId(userId: string, cursor?: string, limit = 20) {
    const where = { userId };
    const total = await prisma.audit.count({ where });

    const items = await prisma.audit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        userId: true,
        prospectId: true,
        screenshotUrl: true,
        overallScore: true,
        status: true,
        errorMessage: true,
        processingTime: true,
        createdAt: true,
        updatedAt: true,
        prospect: { select: { url: true, companyName: true } },
      },
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;

    return {
      data,
      total,
      nextCursor: hasMore ? data[data.length - 1]?.id : undefined,
    };
  }

  async create(data: Prisma.AuditCreateInput) {
    return prisma.audit.create({ data });
  }

  async updateStatus(id: string, status: AuditStatus, errorMessage?: string) {
    return prisma.audit.update({
      where: { id },
      data: { status, ...(errorMessage ? { errorMessage } : {}) },
    });
  }

  async updateResults(id: string, data: Partial<Pick<Audit, 'screenshotUrl' | 'annotatedUrl' | 'mobileUrl' | 'issues' | 'overallScore' | 'siteType' | 'processingTime'>>) {
    return prisma.audit.update({
      where: { id },
      data: { ...data, status: 'READY' },
    });
  }

  async countByUserId(userId: string) {
    return prisma.audit.count({ where: { userId } });
  }
}

export const auditRepository = new AuditRepository();
