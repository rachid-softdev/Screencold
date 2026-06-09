import type { Campaign, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export type CampaignWithProspects = Prisma.CampaignGetPayload<{
  include: {
    prospectsList: {
      include: { audit: { select: { overallScore: true; status: true } } };
    };
  };
}>;

export class CampaignRepository extends BaseRepository {
  async findById(id: string): Promise<Campaign | null> {
    return this.prisma.campaign.findUnique({ where: { id } });
  }

  async findByIdWithProspects(id: string): Promise<CampaignWithProspects | null> {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: {
        prospectsList: {
          include: { audit: { select: { overallScore: true, status: true } } },
        },
      },
    });
  }

  async findManyByUserId(
    userId: string,
    params: { cursor?: string; limit?: number }
  ): Promise<{ items: Campaign[]; nextCursor?: string }> {
    const { cursor, limit = 20 } = params;

    const items = await this.prisma.campaign.findMany({
      where: { userId },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return { items, nextCursor: hasMore ? items[items.length - 1]?.id : undefined };
  }

  async create(data: Prisma.CampaignCreateInput): Promise<Campaign> {
    return this.prisma.campaign.create({ data });
  }

  async update(id: string, data: Prisma.CampaignUpdateInput): Promise<Campaign> {
    return this.prisma.campaign.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.campaign.delete({ where: { id } });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.campaign.count({ where: { userId } });
  }
}
