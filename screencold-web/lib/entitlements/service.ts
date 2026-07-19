import type {
  FeatureDefinition,
  PlanDefinition,
  PlanFeatureConfig,
  DebugTrace,
  ConsumeResult,
  EntitlementMap,
  FeatureConfig,
  ExperimentAssignment,
} from '@screencold/types';
import { IEntitlementRepository } from './repository';
import { getCacheService } from './cache';

// ============================================
// MurmurHash for A/B testing (stable bucket assignment)
// ============================================

function murmurhash(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ============================================
// Feature Gate Service
// ============================================

export class FeatureGateService {
  private repo: IEntitlementRepository;
  private cache = getCacheService();

  // Cache for feature definitions (static, long TTL)
  private featureDefinitions: Map<string, FeatureDefinition> = new Map();
  private planDefinitions: Map<string, PlanDefinition> = new Map();
  private planFeatureConfigs: Map<string, Map<string, PlanFeatureConfig>> = new Map();

  constructor(repo: IEntitlementRepository) {
    this.repo = repo;
    this.initializeStaticData();
  }

  /**
   * Initialize static feature/plan data (loaded once)
   */
  private async initializeStaticData(): Promise<void> {
    try {
      // Load all features
      const features = await this.repo.getAllFeatures();
      this.featureDefinitions.clear();
      for (const f of features) {
        this.featureDefinitions.set(f.key, f);
      }

      // Load all plans
      const plans = await this.repo.getAllPlans();
      this.planDefinitions.clear();
      for (const p of plans) {
        this.planDefinitions.set(p.key, p);
      }

      // Load all plan-feature configs
      this.planFeatureConfigs.clear();
      for (const plan of plans) {
        const pfs = await this.repo.getPlanFeatures(plan.key);
        const pfMap = new Map<string, PlanFeatureConfig>();
        for (const pf of pfs) {
          pfMap.set(pf.featureId, pf);
        }
        this.planFeatureConfigs.set(plan.key, pfMap);
      }
    } catch (error) {
      console.error('[FeatureGateService] Failed to initialize static data:', error);
    }
  }

  /**
   * Reload static data (after admin changes)
   */
  async reloadStaticData(): Promise<void> {
    await this.initializeStaticData();
  }

  // ============================================
  // Core Resolution Logic
  // ============================================

  /**
   * Resolve feature value using priority system:
   * 1. User override (non-expired)
   * 2. Org override (non-expired)
   * 3. Plan (active subscription)
   * 4. Fallback (feature disabled, limit = 0)
   */
  private async resolveFeature(
    orgId: string,
    userId: string | null,
    featureKey: string
  ): Promise<{
    source: 'user_override' | 'org_override' | 'plan' | 'fallback';
    value: boolean | number | null;
    overrideId?: string;
    expiresAt?: Date | null;
    planKey?: string;
    config?: FeatureConfig;
  }> {
    const feature = this.featureDefinitions.get(featureKey);
    if (!feature) {
      return { source: 'fallback', value: false };
    }

    // 1. Check user override (if userId provided)
    if (userId) {
      const userOverride = await this.repo.getOverride('USER', userId, featureKey);
      if (userOverride && (!userOverride.expiresAt || userOverride.expiresAt > new Date())) {
        return {
          source: 'user_override',
          value: userOverride.enabled,
          overrideId: userOverride.id,
          expiresAt: userOverride.expiresAt,
          config: feature.type === 'EXPERIMENT' ? (feature.defaultConfig ?? undefined) : undefined,
        };
      }
    }

    // 2. Check org override
    const orgOverride = await this.repo.getOverride('ORG', orgId, featureKey);
    if (orgOverride && (!orgOverride.expiresAt || orgOverride.expiresAt > new Date())) {
      return {
        source: 'org_override',
        value: orgOverride.enabled,
        overrideId: orgOverride.id,
        expiresAt: orgOverride.expiresAt,
        config: feature.type === 'EXPERIMENT' ? (feature.defaultConfig ?? undefined) : undefined,
      };
    }

    // 3. Check plan (active subscription)
    const subscription = await this.repo.getSubscription(orgId);
    if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
      const planKey = subscription.planKey;
      const pfConfigs = this.planFeatureConfigs.get(planKey);
      
      if (pfConfigs) {
        // Find by feature key (we need feature ID)
        const featureId = feature.id;
        const pf = pfConfigs.get(featureId);

        if (pf && pf.enabled) {
          // Handle different feature types
          if (feature.type === 'BOOLEAN') {
            return { source: 'plan', value: true, planKey };
          } else if (feature.type === 'LIMIT') {
            return { source: 'plan', value: pf.limitValue, planKey };
          } else if (feature.type === 'EXPERIMENT') {
            return {
              source: 'plan',
              value: true,
              planKey,
              config: pf.configJson as FeatureConfig | undefined,
            };
          }
        }
      }
    }

    // 4. Fallback
    if (feature.type === 'LIMIT') {
      return { source: 'fallback', value: 0 };
    }
    return { source: 'fallback', value: false };
  }

  /**
   * Get all entitlements for an organization (cached)
   */
  async getAllEntitlements(orgId: string): Promise<EntitlementMap> {
    // Try cache first
    const cached = await this.cache.get<EntitlementMap>(orgId);
    if (cached) {
      return cached;
    }

    // Get subscription
    const subscription = await this.repo.getSubscription(orgId);
    const planKey = subscription?.planKey ?? 'FREE';

    // Get all features
    const features = Array.from(this.featureDefinitions.values());

    // Build entitlements map
    const entitlements: EntitlementMap = {
      plan: planKey,
      features: {},
      limits: {},
      usage: {},
      resetAt: {},
      experiments: {},
    };

    // Get all usage
    const usageList = await this.repo.getAllUsage(orgId);
    for (const usage of usageList) {
      entitlements.usage[usage.featureKey] = usage.used;
      entitlements.resetAt[usage.featureKey] = usage.resetAt.toISOString();
    }

    // Resolve each feature
    for (const feature of features) {
      const resolved = await this.resolveFeature(orgId, null, feature.key);

      if (feature.type === 'BOOLEAN') {
        entitlements.features[feature.key] = resolved.value as boolean;
      } else if (feature.type === 'LIMIT') {
        const limit = resolved.value as number;
        entitlements.limits[feature.key] = limit === null ? null : limit;
      } else if (feature.type === 'EXPERIMENT') {
        // Experiments resolved at request time
        entitlements.features[feature.key] = resolved.source !== 'fallback';
      }
    }

    // Cache result
    await this.cache.set(orgId, entitlements);

    return entitlements;
  }

  // ============================================
  // Public API Methods
  // ============================================

  /**
   * Check if feature is enabled
   */
  async hasFeature(orgId: string, featureKey: string): Promise<boolean> {
    const resolved = await this.resolveFeature(orgId, null, featureKey);
    return resolved.value === true;
  }

  /**
   * Get limit value for a feature
   */
  async getLimit(orgId: string, limitKey: string): Promise<number | null> {
    const resolved = await this.resolveFeature(orgId, null, limitKey);
    return resolved.value as number | null;
  }

  /**
   * Assert feature is enabled (throws 403 if not)
   */
  async assertFeature(orgId: string, featureKey: string): Promise<void> {
    const hasFeature = await this.hasFeature(orgId, featureKey);
    if (!hasFeature) {
      const error = new Error('Feature not available') as Error & {
        code: string;
        feature: string;
        planRequired: string;
        currentPlan: string;
      };
      error.code = 'FEATURE_NOT_AVAILABLE';
      error.feature = featureKey;
      error.planRequired = await this.getRequiredPlan(featureKey);
      error.currentPlan = (await this.getAllEntitlements(orgId)).plan;
      throw error;
    }
  }

  /**
   * Get required plan for a feature
   */
  private async getRequiredPlan(featureKey: string): Promise<string> {
    const feature = this.featureDefinitions.get(featureKey);
    if (!feature) return 'PRO';

    // Find the lowest plan that has this feature enabled
    const plans = Array.from(this.planDefinitions.values()).sort((a, b) => a.sortOrder - b.sortOrder);
    for (const plan of plans) {
      const pfConfigs = this.planFeatureConfigs.get(plan.key);
      if (pfConfigs) {
        const pf = pfConfigs.get(feature.id);
        if (pf && pf.enabled) {
          return plan.key;
        }
      }
    }

    return 'PRO';
  }

  /**
   * Check if can consume (with current usage)
   */
  async canConsume(orgId: string, featureKey: string, amount = 1): Promise<boolean> {
    const limitValue = await this.getLimit(orgId, featureKey);
    if (limitValue === null) return true; // Unlimited

    const usage = await this.repo.getUsage(orgId, featureKey);
    const used = usage?.used ?? 0;

    return used + amount <= limitValue;
  }

  /**
   * Consume usage atomically.
   *
   * The limit is resolved first (plan config is stable, not racy), then the
   * actual check-and-increment happens inside a single transaction with a
   * row-level lock in the repository to prevent double-spend race conditions.
   */
  async consume(orgId: string, featureKey: string, amount = 1): Promise<ConsumeResult> {
    const limitValue = await this.getLimit(orgId, featureKey);

    const result = await this.repo.consumeUsage(orgId, featureKey, amount, limitValue);

    return {
      success: result.success,
      feature: featureKey,
      used: result.used,
      remaining: result.remaining,
      resetAt: result.resetAt,
      error: result.error as ConsumeResult['error'],
      limit: result.limit ?? undefined,
    };
  }

  /**
   * Get debug trace for a feature
   */
  async getDebugTrace(
    orgId: string,
    userId: string | null,
    featureKey: string
  ): Promise<DebugTrace> {
    // Get all relevant data for debugging
    const userOverrides = userId ? await this.repo.getOverrides('USER', userId) : [];
    const orgOverrides = await this.repo.getOverrides('ORG', orgId);
    const subscription = await this.repo.getSubscription(orgId);
    const feature = this.featureDefinitions.get(featureKey);

    const resolved = await this.resolveFeature(orgId, userId, featureKey);

    // Get fallback
    const fallbackEnabled = feature?.type === 'BOOLEAN' ? false : undefined;
    const fallbackLimit = feature?.type === 'LIMIT' ? 0 : null;

    return {
      featureKey,
      source: resolved.source,
      value: resolved.value,
      overrideId: resolved.overrideId,
      expiresAt: resolved.expiresAt,
      planKey: resolved.planKey,
      config: resolved.config,
      userOverrides,
      orgOverrides,
      planFeatures: [],
      subscription: subscription ?? undefined,
      fallback: {
        enabled: fallbackEnabled ?? false,
        limitValue: fallbackLimit,
      },
    };
  }

  /**
   * Invalidate cache for an org
   */
  async invalidateCache(orgId: string): Promise<void> {
    await this.cache.invalidateOrg(orgId);
    await this.cache.publishInvalidation(orgId);
  }

  // ============================================
  // A/B Testing Methods
  // ============================================

  /**
   * Check if user is in experiment (stable hash)
   */
  isInExperiment(userId: string, _experimentKey: string, percentage: number, seed: string): boolean {
    const hashInput = `${seed}:${userId}`;
    const bucket = murmurhash(hashInput) % 100;
    return bucket < percentage;
  }

  /**
   * Get experiment config
   */
  getExperimentConfig(experimentKey: string): ExperimentAssignment | null {
    const feature = this.featureDefinitions.get(experimentKey);
    if (!feature || feature.type !== 'EXPERIMENT') return null;

    const config = feature.defaultConfig;
    if (!config || config.percentage === undefined) return null;

    return {
      inExperiment: false, // Will be set per-user
      bucket: 0, // Will be set per-user
      config,
    };
  }

  // ============================================
  // Static Data Access (for admin)
  // ============================================

  getFeatures(): FeatureDefinition[] {
    return Array.from(this.featureDefinitions.values());
  }

  getPlans(): PlanDefinition[] {
    return Array.from(this.planDefinitions.values());
  }
}

// Singleton instance (will be initialized with repo)
let featureGateService: FeatureGateService | null = null;

export function initializeFeatureGateService(repo: IEntitlementRepository): FeatureGateService {
  featureGateService = new FeatureGateService(repo);
  return featureGateService;
}

export function getFeatureGateService(): FeatureGateService {
  if (!featureGateService) {
    throw new Error('FeatureGateService not initialized. Call initializeFeatureGateService first.');
  }
  return featureGateService;
}