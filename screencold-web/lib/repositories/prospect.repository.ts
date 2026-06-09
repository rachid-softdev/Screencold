import type { Prospect, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class ProspectRepository extends BaseRepository {
  async findById(id: string): Promise<Prospect | null> {
    return this.prisma.prospect.findUnique({ where: { id } });
  }

  async findManyByCampaignId(campaignId: string): Promise<Prospect[]> {
    return this.prisma.prospect.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByCampaignAndUrl(campaignId: string, url: string): Promise<Prospect | null> {
    return this.prisma.prospect.findUnique({
      where: { campaignId_url: { campaignId, url } },
    });
  }

  async create(data: Prisma.ProspectCreateInput): Promise<Prospect> {
    return this.prisma.prospect.create({ data });
  }

  async createMany(data: Prisma.ProspectCreateManyInput[]): Promise<number> {
    const result = await this.prisma.prospect.createMany({ data, skipDuplicates: true });
    return result.count;
  }

  async update(id: string, data: Prisma.ProspectUpdateInput): Promise<Prospect> {
    return this.prisma.prospect.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: string): Promise<Prospect> {
    return this.prisma.prospect.update({
      where: { id },
      data: { status: status as never },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.prospect.delete({ where: { id } });
  }

  async countByCampaignId(campaignId: string): Promise<number> {
    return this.prisma.prospect.count({ where: { campaignId } });
  }
}
