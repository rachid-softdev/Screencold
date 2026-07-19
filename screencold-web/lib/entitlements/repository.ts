import { PrismaClient, Prisma } from '@prisma/client';
import type {
  FeatureDefinition,
  PlanDefinition,
  PlanFeatureConfig,
  EntitlementOverride,
  SubscriptionInfo,
  UsageInfo,
  FeatureConfig,
} from '@screencold/types';
import { addMonths } from 'date-fns';

// ============================================
// Repository Interface
// ============================================

export interface IEntitlementRepository {
  // Plan operations
  getAllPlans(): Promise<PlanDefinition[]>;
  getPlanByKey(key: string): Promise<PlanDefinition | null>;

  // Feature operations
  getAllFeatures(): Promise<FeatureDefinition[]>;
  getFeatureByKey(key: string): Promise<FeatureDefinition | null>;

  // Plan-Feature mapping
  getPlanFeatures(planKey: string): Promise<PlanFeatureConfig[]>;
  getFeatureConfig(planKey: string, featureKey: string): Promise<PlanFeatureConfig | null>;

  // Subscription operations
  getSubscription(orgId: string): Promise<SubscriptionInfo | null>;
  getSubscriptionByStripeId(stripeSubId: string): Promise<(SubscriptionInfo & { orgId: string }) | null>;
  updateSubscription(subscription: Partial<SubscriptionInfo> & { orgId: string }): Promise<void>;
  createSubscription(orgId: string, planKey: string, stripeSubId?: string): Promise<void>;

  // Override operations
  getOverrides(scope: 'USER' | 'ORG', scopeId: string): Promise<EntitlementOverride[]>;
  getOverride(scope: 'USER' | 'ORG', scopeId: string, featureKey: string): Promise<EntitlementOverride | null>;
  createOverride(override: Omit<EntitlementOverride, 'id' | 'createdAt' | 'updatedAt'>): Promise<EntitlementOverride>;
  updateOverride(id: string, data: Partial<EntitlementOverride>): Promise<EntitlementOverride>;
  deleteOverride(id: string): Promise<void>;

  // Usage tracking
  getUsage(orgId: string, featureKey: string): Promise<UsageInfo | null>;
  getAllUsage(orgId: string): Promise<UsageInfo[]>;
  incrementUsage(orgId: string, featureKey: string, amount: number): Promise<UsageInfo>;
  checkAndResetUsage(orgId: string, featureKey: string, periodEnd: Date): Promise<UsageInfo>;

  // Stripe event (idempotency)
  isEventProcessed(eventId: string): Promise<boolean>;
  markEventProcessed(eventId: string, type: string, data: Prisma.JsonValue): Promise<void>;

  // Organization
  getOrCreateOrg(userId: string): Promise<{ orgId: string }>;
  getOrgByStripeCustomer(stripeCustomerId: string): Promise<{ id: string } | null>;
}

// ============================================
// Prisma Implementation
// ============================================

export class PrismaEntitlementRepository implements IEntitlementRepository {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // Plan Operations
  // ============================================

  async getAllPlans(): Promise<PlanDefinition[]> {
    const plans = await this.prisma.planConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      priceMonthly: Number(p.priceMonthly),
      priceYearly: p.priceYearly ? Number(p.priceYearly) : null,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    }));
  }

  async getPlanByKey(key: string): Promise<PlanDefinition | null> {
    const plan = await this.prisma.planConfig.findUnique({
      where: { key },
    });

    if (!plan) return null;

    return {
      id: plan.id,
      key: plan.key,
      name: plan.name,
      priceMonthly: Number(plan.priceMonthly),
      priceYearly: plan.priceYearly ? Number(plan.priceYearly) : null,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    };
  }

  // ============================================
  // Feature Operations
  // ============================================

  async getAllFeatures(): Promise<FeatureDefinition[]> {
    const features = await this.prisma.feature.findMany({
      where: { isActive: true },
    });

    return features.map((f) => ({
      id: f.id,
      key: f.key,
      description: f.description,
      type: f.type as FeatureDefinition['type'],
      defaultConfig: f.defaultConfig as FeatureConfig | null,
      isActive: f.isActive,
    }));
  }

  async getFeatureByKey(key: string): Promise<FeatureDefinition | null> {
    const feature = await this.prisma.feature.findUnique({
      where: { key },
    });

    if (!feature) return null;

    return {
      id: feature.id,
      key: feature.key,
      description: feature.description,
      type: feature.type as FeatureDefinition['type'],
      defaultConfig: feature.defaultConfig as FeatureConfig | null,
      isActive: feature.isActive,
    };
  }

  // ============================================
  // Plan-Feature Mapping
  // ============================================

  async getPlanFeatures(planKey: string): Promise<PlanFeatureConfig[]> {
    const plan = await this.prisma.planConfig.findUnique({
      where: { key: planKey },
    });

    if (!plan) return [];

    const planFeatures = await this.prisma.planFeature.findMany({
      where: { planId: plan.id },
      include: { feature: true },
    });

    return planFeatures.map((pf) => ({
      planId: pf.planId,
      featureId: pf.featureId,
      enabled: pf.enabled,
      limitValue: pf.limitValue,
      configJson: pf.configJson as FeatureConfig | null,
      downgradeStrategy: pf.downgradeStrategy as PlanFeatureConfig['downgradeStrategy'],
      sortOrder: pf.sortOrder,
    }));
  }

  async getFeatureConfig(planKey: string, featureKey: string): Promise<PlanFeatureConfig | null> {
    const plan = await this.prisma.planConfig.findUnique({
      where: { key: planKey },
    });

    if (!plan) return null;

    const feature = await this.prisma.feature.findUnique({
      where: { key: featureKey },
    });

    if (!feature) return null;

    const planFeature = await this.prisma.planFeature.findUnique({
      where: {
        planId_featureId: { planId: plan.id, featureId: feature.id },
      },
    });

    if (!planFeature) return null;

    return {
      planId: planFeature.planId,
      featureId: planFeature.featureId,
      enabled: planFeature.enabled,
      limitValue: planFeature.limitValue,
      configJson: planFeature.configJson as FeatureConfig | null,
      downgradeStrategy: planFeature.downgradeStrategy as PlanFeatureConfig['downgradeStrategy'],
      sortOrder: planFeature.sortOrder,
    };
  }

  // ============================================
  // Subscription Operations
  // ============================================

  async getSubscription(orgId: string): Promise<SubscriptionInfo | null> {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        orgId,
        status: { in: ['active', 'trialing', 'past_due'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) return null;

    return {
      planKey: sub.planKey,
      status: sub.status as SubscriptionInfo['status'],
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }

  async getSubscriptionByStripeId(stripeSubId: string): Promise<(SubscriptionInfo & { orgId: string }) | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubId },
    });

    if (!sub) return null;

    return {
      planKey: sub.planKey,
      status: sub.status as SubscriptionInfo['status'],
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      orgId: sub.orgId,
    };
  }

  async updateSubscription(subscription: Partial<SubscriptionInfo> & { orgId: string }): Promise<void> {
    await this.prisma.subscription.updateMany({
      where: { orgId: subscription.orgId },
      data: {
        planKey: subscription.planKey,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  }

  async createSubscription(orgId: string, planKey: string, stripeSubId?: string): Promise<void> {
    const periodStart = new Date();
    const periodEnd = addMonths(periodStart, 1);

    await this.prisma.subscription.create({
      data: {
        orgId,
        planKey,
        status: stripeSubId ? 'active' : 'inactive',
        stripeSubId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  // ============================================
  // Override Operations
  // ============================================

  async getOverrides(scope: 'USER' | 'ORG', scopeId: string): Promise<EntitlementOverride[]> {
    const now = new Date();

    const overrides = await this.prisma.entitlementOverride.findMany({
      where: {
        scope,
        scopeId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    return overrides.map((o) => ({
      id: o.id,
      scope: o.scope as EntitlementOverride['scope'],
      scopeId: o.scopeId,
      featureKey: o.featureKey,
      enabled: o.enabled,
      limitValue: o.limitValue,
      expiresAt: o.expiresAt,
      reason: o.reason,
      createdBy: o.createdBy,
      createdAt: o.createdAt,
    }));
  }

  async getOverride(
    scope: 'USER' | 'ORG',
    scopeId: string,
    featureKey: string
  ): Promise<EntitlementOverride | null> {
    const now = new Date();

    const override = await this.prisma.entitlementOverride.findFirst({
      where: {
        scope,
        scopeId,
        featureKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (!override) return null;

    return {
      id: override.id,
      scope: override.scope as EntitlementOverride['scope'],
      scopeId: override.scopeId,
      featureKey: override.featureKey,
      enabled: override.enabled,
      limitValue: override.limitValue,
      expiresAt: override.expiresAt,
      reason: override.reason,
      createdBy: override.createdBy,
      createdAt: override.createdAt,
    };
  }

  async createOverride(
    override: Omit<EntitlementOverride, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<EntitlementOverride> {
    const created = await this.prisma.entitlementOverride.create({
      data: {
        scope: override.scope,
        scopeId: override.scopeId,
        featureKey: override.featureKey,
        enabled: override.enabled,
        limitValue: override.limitValue,
        expiresAt: override.expiresAt,
        reason: override.reason,
        createdBy: override.createdBy,
      },
    });

    return {
      id: created.id,
      scope: created.scope as EntitlementOverride['scope'],
      scopeId: created.scopeId,
      featureKey: created.featureKey,
      enabled: created.enabled,
      limitValue: created.limitValue,
      expiresAt: created.expiresAt,
      reason: created.reason,
      createdBy: created.createdBy,
      createdAt: created.createdAt,
    };
  }

  async updateOverride(id: string, data: Partial<EntitlementOverride>): Promise<EntitlementOverride> {
    const updated = await this.prisma.entitlementOverride.update({
      where: { id },
      data: {
        enabled: data.enabled,
        limitValue: data.limitValue,
        expiresAt: data.expiresAt,
        reason: data.reason,
      },
    });

    return {
      id: updated.id,
      scope: updated.scope as EntitlementOverride['scope'],
      scopeId: updated.scopeId,
      featureKey: updated.featureKey,
      enabled: updated.enabled,
      limitValue: updated.limitValue,
      expiresAt: updated.expiresAt,
      reason: updated.reason,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
    };
  }

  async deleteOverride(id: string): Promise<void> {
    await this.prisma.entitlementOverride.delete({ where: { id } });
  }

  // ============================================
  // Usage Tracking
  // ============================================

  async getUsage(orgId: string, featureKey: string): Promise<UsageInfo | null> {
    const now = new Date();

    const usage = await this.prisma.usageTracking.findFirst({
      where: {
        orgId,
        featureKey,
        periodEnd: { gt: now },
      },
      orderBy: { periodStart: 'desc' },
    });

    if (!usage) return null;

    return {
      featureKey: usage.featureKey,
      used: usage.usageCount,
      limit: null, // Will be filled by FeatureGateService
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
      resetAt: usage.periodEnd,
    };
  }

  async getAllUsage(orgId: string): Promise<UsageInfo[]> {
    const now = new Date();

    const usages = await this.prisma.usageTracking.findMany({
      where: {
        orgId,
        periodEnd: { gt: now },
      },
    });

    return usages.map((u) => ({
      featureKey: u.featureKey,
      used: u.usageCount,
      limit: null,
      periodStart: u.periodStart,
      periodEnd: u.periodEnd,
      resetAt: u.periodEnd,
    }));
  }

  async incrementUsage(orgId: string, featureKey: string, amount: number): Promise<UsageInfo> {
    const now = new Date();
    const periodEnd = addMonths(now, 1);

    // Try to update existing record
    const updated = await this.prisma.usageTracking.updateMany({
      where: {
        orgId,
        featureKey,
        periodEnd: { gt: now },
      },
      data: {
        usageCount: { increment: amount },
        updatedAt: now,
      },
    });

    // If no record exists, create one
    if (updated.count === 0) {
      await this.prisma.usageTracking.create({
        data: {
          orgId,
          featureKey,
          usageCount: amount,
          periodStart: now,
          periodEnd,
        },
      });
    }

    // Fetch and return the updated record
    const usage = await this.prisma.usageTracking.findFirst({
      where: {
        orgId,
        featureKey,
        periodEnd: { gt: now },
      },
    });

    return {
      featureKey,
      used: usage!.usageCount,
      limit: null,
      periodStart: usage!.periodStart,
      periodEnd: usage!.periodEnd,
      resetAt: usage!.periodEnd,
    };
  }

  async checkAndResetUsage(orgId: string, featureKey: string, periodEnd: Date): Promise<UsageInfo> {
    const now = new Date();

    // If period has ended, create a new tracking record
    if (periodEnd < now) {
      const newPeriodEnd = addMonths(now, 1);

      await this.prisma.usageTracking.create({
        data: {
          orgId,
          featureKey,
          usageCount: 0,
          periodStart: now,
          periodEnd: newPeriodEnd,
        },
      });

      return {
        featureKey,
        used: 0,
        limit: null,
        periodStart: now,
        periodEnd: newPeriodEnd,
        resetAt: newPeriodEnd,
      };
    }

    // Otherwise return existing usage
    return this.getUsage(orgId, featureKey) as Promise<UsageInfo>;
  }

  // ============================================
  // Stripe Event (Idempotency)
  // ============================================

  async isEventProcessed(eventId: string): Promise<boolean> {
    const event = await this.prisma.stripeEvent.findUnique({
      where: { eventId },
    });

    return event?.processed ?? false;
  }

  async markEventProcessed(eventId: string, type: string, data: Prisma.JsonValue): Promise<void> {
    await this.prisma.stripeEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        type,
        data: data as Prisma.InputJsonValue,
        processed: true,
      },
      update: {
        processed: true,
        data: data as Prisma.InputJsonValue,
      },
    });
  }

  // ============================================
  // Organization Operations
  // ============================================

  async getOrCreateOrg(userId: string): Promise<{ orgId: string }> {
    // Check if user already has an organization
    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId },
    });

    if (userOrg) {
      return { orgId: userOrg.orgId };
    }

    // Create new organization and link user
    const org = await this.prisma.organization.create({
      data: {
        name: 'Personal',
        isActive: true,
      },
    });

    await this.prisma.userOrganization.create({
      data: {
        userId,
        orgId: org.id,
        role: 'OWNER',
        isPrimary: true,
      },
    });

    // Create default subscription
    await this.createSubscription(org.id, 'FREE');

    return { orgId: org.id };
  }

  async getOrgByStripeCustomer(stripeCustomerId: string): Promise<{ id: string } | null> {
    const org = await this.prisma.organization.findFirst({
      where: { stripeCustomerId },
    });

    return org ? { id: org.id } : null;
  }
}