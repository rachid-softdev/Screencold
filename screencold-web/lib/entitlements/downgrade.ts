import type { DowngradeStrategy, DowngradePreview } from '@screencold/types';
import { IEntitlementRepository } from './repository';
import { getFeatureGateService } from './service';

// ============================================
// Downgrade Service
// ============================================

export class DowngradeService {
  private repo: IEntitlementRepository;

  constructor(repo: IEntitlementRepository) {
    this.repo = repo;
  }

  /**
   * Preview what features would be affected by a downgrade
   */
  async getDowngradePreview(
    orgId: string,
    targetPlanKey: string
  ): Promise<DowngradePreview[]> {
    const service = getFeatureGateService();
    const currentEntitlements = await service.getAllEntitlements(orgId);
    const currentPlan = currentEntitlements.plan;

    // Get current subscription
    const subscription = await this.repo.getSubscription(orgId);
    const periodEnd = subscription?.currentPeriodEnd ?? new Date();

    const features = service.getFeatures();
    const previews: DowngradePreview[] = [];

    for (const feature of features) {
      // Get current access
      const currentAccess = currentEntitlements.features[feature.key] ?? false;
      const currentLimit = currentEntitlements.limits[feature.key] ?? null;

      // Get target plan access (simulate)
      const targetPlanFeatures = await this.repo.getPlanFeatures(targetPlanKey);
      const featureConfig = targetPlanFeatures.find((pf) => {
        // Need to map by feature ID
        const feat = service.getFeatures().find((f) => f.key === feature.key);
        return feat && pf.featureId === feat.id;
      });

      const targetEnabled = featureConfig?.enabled ?? false;
      const targetLimit = featureConfig?.limitValue ?? (feature.type === 'LIMIT' ? 0 : null);

      // Determine strategy
      const strategy = featureConfig?.downgradeStrategy ?? 'GRACEFUL';

      // Calculate post-downgrade access based on strategy
      let postDowngradeAccess: boolean | number | null;
      
      if (strategy === 'IMMEDIATE') {
        postDowngradeAccess = targetEnabled ? (feature.type === 'LIMIT' ? targetLimit : true) : false;
      } else if (strategy === 'GRACEFUL') {
        // Keep access until period end
        const now = new Date();
        if (periodEnd > now) {
          postDowngradeAccess = currentAccess; // Keep current access until period end
        } else {
          postDowngradeAccess = targetEnabled ? (feature.type === 'LIMIT' ? targetLimit : true) : false;
        }
      } else {
        // FREEZE - block new actions but keep data
        postDowngradeAccess = targetEnabled ? (feature.type === 'LIMIT' ? targetLimit : true) : false;
      }

      // Only include if there's a change
      if (currentAccess !== postDowngradeAccess || currentLimit !== postDowngradeAccess) {
        previews.push({
          featureKey: feature.key,
          currentAccess: feature.type === 'LIMIT' ? currentLimit : currentAccess,
          postDowngradeAccess: feature.type === 'LIMIT' ? postDowngradeAccess : postDowngradeAccess,
          strategy,
          affectedUsers: 1, // Would query for team members if multi-user
        });
      }
    }

    return previews;
  }

  /**
   * Execute downgrade (called from webhook)
   */
  async executeDowngrade(
    orgId: string,
    targetPlanKey: string
  ): Promise<{ success: boolean; affectedFeatures: string[] }> {
    const service = getFeatureGateService();
    const preview = await this.getDowngradePreview(orgId, targetPlanKey);

    // Update subscription to target plan
    await this.repo.updateSubscription({
      orgId,
      planKey: targetPlanKey,
      status: 'active', // Keep active if they were on a paid plan
    });

    // Invalidate cache
    await service.invalidateCache(orgId);

    return {
      success: true,
      affectedFeatures: preview.map((p) => p.featureKey),
    };
  }

  /**
   * Check if downgrade should trigger grace period email
   */
  async shouldSendGraceEmail(orgId: string): Promise<boolean> {
    const subscription = await this.repo.getSubscription(orgId);
    if (!subscription) return false;

    // Check if subscription is scheduled to cancel
    if (!subscription.cancelAtPeriodEnd) return false;

    const periodEnd = subscription.currentPeriodEnd;
    if (!periodEnd) return false;

    // Send email 7 days before period end
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return periodEnd <= sevenDaysFromNow && periodEnd > new Date();
  }
}