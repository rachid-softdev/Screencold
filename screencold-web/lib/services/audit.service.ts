import { auditRepository } from '@/lib/repositories/audit.repository';
import { userRepository } from '@/lib/repositories/user.repository';
import { creditTransactionRepository } from '@/lib/repositories/credit-transaction.repository';
import prisma from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import type { Audit, AuditStatus } from '@prisma/client';

const logger = createLogger({ module: 'audit-service' });

export interface CreateAuditInput {
  userId: string;
  url: string;
  prospectId?: string;
  campaignId?: string;
}

export class AuditService {
  async create(input: CreateAuditInput): Promise<Audit> {
    const { userId, url, prospectId } = input;

    const credits = await userRepository.updateCredits(userId, -1);

    const audit = await auditRepository.create({
      user: { connect: { id: userId } },
      status: 'PROCESSING',
      ...(prospectId ? { prospect: { connect: { id: prospectId } } } : {
        prospect: {
          create: {
            url,
            campaign: input.campaignId ? { connect: { id: input.campaignId } } : undefined,
          },
        },
      }),
    });

    await creditTransactionRepository.create({
      user: { connect: { id: userId } },
      amount: -1,
      type: 'AUDIT_DEBIT',
      audit: { connect: { id: audit.id } },
    });

    logger.info({ auditId: audit.id, userId, credits }, 'Audit created');
    return audit;
  }

  async getById(id: string, userId: string): Promise<Audit | null> {
    const audit = await auditRepository.findById(id);
    if (!audit || audit.userId !== userId) return null;
    return audit;
  }

  async listByUser(userId: string, cursor?: string, limit?: number) {
    return auditRepository.findByUserId(userId, cursor, limit);
  }

  async updateStatus(id: string, status: AuditStatus, errorMessage?: string) {
    return auditRepository.updateStatus(id, status, errorMessage);
  }

  async updateResults(id: string, data: Parameters<typeof auditRepository.updateResults>[1]) {
    return auditRepository.updateResults(id, data);
  }

  async getStats(userId: string) {
    const total = await auditRepository.countByUserId(userId);
    return { total };
  }
}

export const auditService = new AuditService();
