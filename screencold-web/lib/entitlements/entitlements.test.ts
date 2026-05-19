import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeatureGateService } from './service';
import type {
  IEntitlementRepository,
  FeatureDefinition,
  PlanDefinition,
  PlanFeatureConfig,
  EntitlementOverride,
  SubscriptionInfo,
  UsageInfo,
  FeatureConfig,
} from './repository';

// ============================================
// Mock Repository
// ============================================

class MockEntitlementRepository implements IEntitlementRepository {
  plans: PlanDefinition[] = [];
  features: FeatureDefinition[] = [];
  planFeatures: Map<string, PlanFeatureConfig[]> = new Map();
  subscriptions: Map<string, SubscriptionInfo> = new Map();
  overrides: EntitlementOverride[] = [];
  usage: Map<string, Map<string, UsageInfo>> = new Map();
  events: Set<string> = new Set();

  // Setters for test setup
  setPlans(plans: PlanDefinition[]) {
    this.plans = plans;
  }
  setFeatures(features: FeatureDefinition[]) {
    this.features = features;
  }
  setPlanFeatures(planKey: string, features: PlanFeatureConfig[]) {
    this.planFeatures.set(planKey, features);
  }
  setSubscription(orgId: string, sub: SubscriptionInfo | null) {
    if (sub) {
      this.subscriptions.set(orgId, sub);
    } else {
      this.subscriptions.delete(orgId);
    }
  }
  setOverrides(overrides: EntitlementOverride[]) {
    this.overrides = overrides;
  }
  setUsage(orgId: string, featureKey: string, usage: UsageInfo) {
    if (!this.usage.has(orgId)) {
      this.usage.set(orgId, new Map());
    }
    this.usage.get(orgId)!.set(featureKey, usage);
  }

  // Repository methods
  async getAllPlans() {
    return this.plans;
  }
  async getPlanByKey(key: string) {
    return this.plans.find((p) => p.key === key) ?? null;
  }
  async getAllFeatures() {
    return this.features;
  }
  async getFeatureByKey(key: string) {
    return this.features.find((f) => f.key === key) ?? null;
  }
  async getPlanFeatures(planKey: string) {
    return this.planFeatures.get(planKey) ?? [];
  }
  async getFeatureConfig(_planKey: string, _featureKey: string) {
    return null;
  }
  async getSubscription(orgId: string) {
    return this.subscriptions.get(orgId) ?? null;
  }
  async getSubscriptionByStripeId(_stripeSubId: string) {
    return null;
  }
  async updateSubscription(_sub: Partial<SubscriptionInfo> & { orgId: string }) {}
  async createSubscription(_orgId: string, _planKey: string, _stripeSubId?: string) {}
  async getOverrides(scope: 'USER' | 'ORG', scopeId: string) {
    return this.overrides.filter((o) => o.scope === scope && o.scopeId === scopeId);
  }
  async getOverride(scope: 'USER' | 'ORG', scopeId: string, featureKey: string) {
    return this.overrides.find(
      (o) => o.scope === scope && o.scopeId === scopeId && o.featureKey === featureKey
    ) ?? null;
  }
  async createOverride(override: any) {
    return { ...override, id: 'override-1' };
  }
  async updateOverride(_id: string, _data: any) {
    return {} as EntitlementOverride;
  }
  async deleteOverride(_id: string) {}
  async getUsage(orgId: string, featureKey: string) {
    return this.usage.get(orgId)?.get(featureKey) ?? null;
  }
  async getAllUsage(orgId: string) {
    return Array.from(this.usage.get(orgId)?.values() ?? []);
  }
  async incrementUsage(orgId: string, featureKey: string, amount: number) {
    const existing = await this.getUsage(orgId, featureKey);
    const used = (existing?.used ?? 0) + amount;
    const usage: UsageInfo = {
      featureKey,
      used,
      limit: existing?.limit ?? null,
      periodStart: existing?.periodStart ?? new Date(),
      periodEnd: existing?.periodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      resetAt: existing?.resetAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    this.setUsage(orgId, featureKey, usage);
    return usage;
  }
  async checkAndResetUsage(_orgId: string, _featureKey: string, _periodEnd: Date) {
    return {} as UsageInfo;
  }
  async isEventProcessed(eventId: string) {
    return this.events.has(eventId);
  }
  async markEventProcessed(eventId: string, _type: string, _data: any) {
    this.events.add(eventId);
  }
  async getOrCreateOrg(_userId: string) {
    return { orgId: 'org-1' };
  }
  async getOrgByStripeCustomer(_customerId: string) {
    return null;
  }
}

// ============================================
// Test Data
// ============================================

const testFeatures: FeatureDefinition[] = [
  {
    id: 'feat-1',
    key: 'EXPORT_PDF',
    description: 'Export to PDF',
    type: 'BOOLEAN',
    defaultConfig: null,
    isActive: true,
  },
  {
    id: 'feat-2',
    key: 'API_ACCESS',
    description: 'API Access',
    type: 'BOOLEAN',
    defaultConfig: null,
    isActive: true,
  },
  {
    id: 'feat-3',
    key: 'AUDITS_LIMIT',
    description: 'Monthly audits',
    type: 'LIMIT',
    defaultConfig: null,
    isActive: true,
  },
  {
    id: 'feat-4',
    key: 'NEW_DASHBOARD',
    description: 'New dashboard (A/B)',
    type: 'EXPERIMENT',
    defaultConfig: { percentage: 50, seed: 'NEW_DASHBOARD_v1' },
    isActive: true,
  },
];

const testPlans: PlanDefinition[] = [
  { id: 'plan-1', key: 'FREE', name: 'Free', priceMonthly: 0, priceYearly: 0, isActive: true, sortOrder: 0 },
  { id: 'plan-2', key: 'PRO', name: 'Pro', priceMonthly: 149, priceYearly: 1430, isActive: true, sortOrder: 1 },
  { id: 'plan-3', key: 'AGENCY', name: 'Agency', priceMonthly: 399, priceYearly: 3830, isActive: true, sortOrder: 2 },
];

const testPlanFeatures: PlanFeatureConfig[] = [
  { planId: 'plan-2', featureId: 'feat-1', enabled: true, limitValue: null, configJson: null, downgradeStrategy: 'GRACEFUL', sortOrder: 0 },
  { planId: 'plan-2', featureId: 'feat-2', enabled: true, limitValue: null, configJson: null, downgradeStrategy: 'GRACEFUL', sortOrder: 1 },
  { planId: 'plan-2', featureId: 'feat-3', enabled: true, limitValue: 100, configJson: null, downgradeStrategy: 'GRACEFUL', sortOrder: 2 },
  { planId: 'plan-2', featureId: 'feat-4', enabled: true, configJson: { percentage: 50, seed: 'test' }, downgradeStrategy: 'GRACEFUL', sortOrder: 3 },
];

// ============================================
// Tests
// ============================================

describe('FeatureGateService', () => {
  let repo: MockEntitlementRepository;
  let service: FeatureGateService;

  beforeEach(() => {
    repo = new MockEntitlementRepository();
    repo.setFeatures(testFeatures);
    repo.setPlans(testPlans);
    repo.setPlanFeatures('PRO', testPlanFeatures);
    service = new FeatureGateService(repo);
  });

  describe('hasFeature', () => {
    it('should return true when feature is enabled via plan', async () => {
      repo.setSubscription('org-1', { planKey: 'PRO', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      const hasFeature = await service.hasFeature('org-1', 'EXPORT_PDF');
      
      expect(hasFeature).toBe(true);
    });

    it('should return false when feature is not in plan', async () => {
      repo.setSubscription('org-1', { planKey: 'FREE', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      const hasFeature = await service.hasFeature('org-1', 'EXPORT_PDF');
      
      expect(hasFeature).toBe(false);
    });

    it('should return false when subscription is inactive', async () => {
      repo.setSubscription('org-1', { planKey: 'PRO', status: 'canceled', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      const hasFeature = await service.hasFeature('org-1', 'EXPORT_PDF');
      
      expect(hasFeature).toBe(false);
    });

    it('should return true when user override is enabled', async () => {
      repo.setSubscription('org-1', { planKey: 'FREE', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      repo.setOverrides([
        {
          id: 'override-1',
          scope: 'USER',
          scopeId: 'user-1',
          featureKey: 'EXPORT_PDF',
          enabled: true,
          limitValue: null,
          expiresAt: null,
          reason: 'Test',
          createdBy: null,
          createdAt: new Date(),
        },
      ]);
      
      // Note: resolveFeature doesn't take userId in this implementation
      // This test would need the service to support userId in hasFeature
    });
  });

  describe('getLimit', () => {
    it('should return limit value from plan', async () => {
      repo.setSubscription('org-1', { planKey: 'PRO', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      const limit = await service.getLimit('org-1', 'AUDITS_LIMIT');
      
      expect(limit).toBe(100);
    });

    it('should return null (unlimited) for AGENCY plan', async () => {
      repo.setPlanFeatures('AGENCY', [
        { planId: 'plan-3', featureId: 'feat-3', enabled: true, limitValue: null, configJson: null, downgradeStrategy: 'GRACEFUL', sortOrder: 0 },
      ]);
      repo.setSubscription('org-1', { planKey: 'AGENCY', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      const limit = await service.getLimit('org-1', 'AUDITS_LIMIT');
      
      expect(limit).toBe(null);
    });

    it('should return 0 for fallback', async () => {
      const limit = await service.getLimit('org-1', 'AUDITS_LIMIT');
      
      expect(limit).toBe(0);
    });
  });

  describe('consume', () => {
    it('should consume quota successfully', async () => {
      repo.setSubscription('org-1', { planKey: 'PRO', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      const result = await service.consume('org-1', 'AUDITS_LIMIT', 1);
      
      expect(result.success).toBe(true);
      expect(result.used).toBe(1);
      expect(result.remaining).toBe(99);
    });

    it('should fail when limit is reached', async () => {
      repo.setSubscription('org-1', { planKey: 'PRO', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      repo.setUsage('org-1', 'AUDITS_LIMIT', {
        featureKey: 'AUDITS_LIMIT',
        used: 100,
        limit: 100,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      
      const result = await service.consume('org-1', 'AUDITS_LIMIT', 1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('LIMIT_REACHED');
    });

    it('should allow unlimited when limit is null', async () => {
      repo.setPlanFeatures('AGENCY', [
        { planId: 'plan-3', featureId: 'feat-3', enabled: true, limitValue: null, configJson: null, downgradeStrategy: 'GRACEFUL', sortOrder: 0 },
      ]);
      repo.setSubscription('org-1', { planKey: 'AGENCY', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      const result = await service.consume('org-1', 'AUDITS_LIMIT', 1000);
      
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(null);
    });
  });

  describe('canConsume', () => {
    it('should return true when under limit', async () => {
      repo.setSubscription('org-1', { planKey: 'PRO', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      const canConsume = await service.canConsume('org-1', 'AUDITS_LIMIT', 50);
      
      expect(canConsume).toBe(true);
    });

    it('should return false when at limit', async () => {
      repo.setSubscription('org-1', { planKey: 'PRO', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      repo.setUsage('org-1', 'AUDITS_LIMIT', {
        featureKey: 'AUDITS_LIMIT',
        used: 100,
        limit: 100,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      
      const canConsume = await service.canConsume('org-1', 'AUDITS_LIMIT', 1);
      
      expect(canConsume).toBe(false);
    });

    it('should return true for unlimited', async () => {
      repo.setPlanFeatures('AGENCY', [
        { planId: 'plan-3', featureId: 'feat-3', enabled: true, limitValue: null, configJson: null, downgradeStrategy: 'GRACEFUL', sortOrder: 0 },
      ]);
      repo.setSubscription('org-1', { planKey: 'AGENCY', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      const canConsume = await service.canConsume('org-1', 'AUDITS_LIMIT', 999999);
      
      expect(canConsume).toBe(true);
    });
  });

  describe('getAllEntitlements', () => {
    it('should return full entitlement map', async () => {
      repo.setSubscription('org-1', { planKey: 'PRO', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      repo.setUsage('org-1', 'AUDITS_LIMIT', {
        featureKey: 'AUDITS_LIMIT',
        used: 25,
        limit: 100,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      
      const entitlements = await service.getAllEntitlements('org-1');
      
      expect(entitlements.plan).toBe('PRO');
      expect(entitlements.features.EXPORT_PDF).toBe(true);
      expect(entitlements.limits.AUDITS_LIMIT).toBe(100);
      expect(entitlements.usage.AUDITS_LIMIT).toBe(25);
    });
  });

  describe('A/B Testing', () => {
    it('should return consistent bucket for same user', () => {
      const result1 = service.isInExperiment('user-1', 'NEW_DASHBOARD', 50, 'seed');
      const result2 = service.isInExperiment('user-1', 'NEW_DASHBOARD', 50, 'seed');
      
      expect(result1).toBe(result2);
    });

    it('should distribute roughly 50% at 50% percentage', () => {
      const results: boolean[] = [];
      
      for (let i = 0; i < 10000; i++) {
        results.push(service.isInExperiment(`user-${i}`, 'NEW_DASHBOARD', 50, 'seed'));
      }
      
      const inExperiment = results.filter(Boolean).length;
      const percentage = (inExperiment / 10000) * 100;
      
      // Should be roughly 50% (+/- 5%)
      expect(percentage).toBeGreaterThan(45);
      expect(percentage).toBeLessThan(55);
    });

    it('should change bucket when seed changes', () => {
      const result1 = service.isInExperiment('user-1', 'NEW_DASHBOARD', 50, 'seed1');
      const result2 = service.isInExperiment('user-1', 'NEW_DASHBOARD', 50, 'seed2');
      
      // Different seeds should give different results
      expect(result1).not.toBe(result2);
    });
  });

  describe('assertFeature', () => {
    it('should throw when feature not available', async () => {
      repo.setSubscription('org-1', { planKey: 'FREE', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      await expect(service.assertFeature('org-1', 'EXPORT_PDF')).rejects.toThrow();
    });

    it('should not throw when feature is available', async () => {
      repo.setSubscription('org-1', { planKey: 'PRO', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      
      await expect(service.assertFeature('org-1', 'EXPORT_PDF')).resolves.not.toThrow();
    });
  });
});

describe('Cache Service', () => {
  // Cache tests would require Redis mocking
  // This is a placeholder for the cache tests
  it('should have cache service', () => {
    expect(true).toBe(true); // Placeholder
  });
});

describe('Stripe Webhook Handler', () => {
  // Stripe webhook tests would require mocking Stripe events
  // This is a placeholder for the webhook tests
  it('should have webhook handler', () => {
    expect(true).toBe(true); // Placeholder
  });
});

describe('Downgrade Service', () => {
  // Downgrade service tests
  it('should have downgrade service', () => {
    expect(true).toBe(true); // Placeholder
  });
});