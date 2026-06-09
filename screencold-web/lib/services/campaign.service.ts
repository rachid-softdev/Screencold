import { campaignRepository } from '@/lib/repositories/campaign.repository';
import { prospectRepository } from '@/lib/repositories/prospect.repository';
import { createLogger } from '@/lib/logger';
import type { Campaign, Prospect } from '@prisma/client';

const logger = createLogger({ module: 'campaign-service' });

export interface CreateCampaignInput {
  name: string;
  userId: string;
}

export interface ProspectInput {
  url: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
}

export class CampaignService {
  async create(input: CreateCampaignInput): Promise<Campaign> {
    const campaign = await campaignRepository.create({
      name: input.name,
      user: { connect: { id: input.userId } },
    });

    logger.info({ campaignId: campaign.id, userId: input.userId }, 'Campaign created');
    return campaign;
  }

  async getById(id: string, userId: string): Promise<Campaign | null> {
    const campaign = await campaignRepository.findById(id);
    if (!campaign || campaign.userId !== userId) return null;
    return campaign;
  }

  async listByUser(userId: string, cursor?: string, limit?: number) {
    return campaignRepository.findManyByUserId(userId, { cursor, limit });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const campaign = await campaignRepository.findById(id);
    if (!campaign || campaign.userId !== userId) return false;
    await campaignRepository.delete(id);
    return true;
  }

  async addProspects(campaignId: string, prospects: ProspectInput[]): Promise<number> {
    const data = prospects.map((p) => ({
      url: p.url,
      companyName: p.companyName,
      contactName: p.contactName,
      contactEmail: p.contactEmail,
      notes: p.notes,
      campaignId,
    }));
    return prospectRepository.createMany(data);
  }

  async listProspects(campaignId: string): Promise<Prospect[]> {
    return prospectRepository.findManyByCampaignId(campaignId);
  }

  async countByUser(userId: string): Promise<number> {
    return campaignRepository.countByUserId(userId);
  }
}

export const campaignService = new CampaignService();
