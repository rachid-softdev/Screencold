declare module '@screencold/types' {
  export type Plan = "FREE" | "STARTER" | "PRO" | "AGENCY";

  export interface BlogArticle {
    slug: string;
    title: string;
    subtitle: string;
    excerpt: string;
    coverImage: string;
    category: string;
    readingTime: number;
    publishedAt: string;
    author: string;
    content: any;
    tags: string[];
    featured?: boolean;
    seo: {
      metaTitle: string;
      metaDescription: string;
      ogImage: string;
      canonicalUrl: string;
    };
  }

  // ============================================
  // Entitlements / Feature Flags Types
  // ============================================

  export type DowngradeStrategy = 'GRACEFUL' | 'IMMEDIATE' | 'FREEZE';

  export interface DowngradePreview {
    featureKey: string;
    currentAccess: boolean | number | null;
    postDowngradeAccess: boolean | number | null;
    strategy: string;
    affectedUsers: number;
  }

  export interface FeatureDefinition {
    id: string;
    key: string;
    description: string | null;
    type: 'BOOLEAN' | 'LIMIT' | 'EXPERIMENT';
    defaultConfig: FeatureConfig | null;
    isActive: boolean;
  }

  export interface PlanDefinition {
    id: string;
    key: string;
    name: string;
    priceMonthly: number;
    priceYearly: number | null;
    isActive: boolean;
    sortOrder: number;
  }

  export interface PlanFeatureConfig {
    planId: string;
    featureId: string;
    enabled: boolean;
    limitValue: number | null;
    configJson: FeatureConfig | null;
    downgradeStrategy: DowngradeStrategy;
    sortOrder: number;
  }

  export interface EntitlementOverride {
    id: string;
    scope: 'USER' | 'ORG';
    scopeId: string;
    featureKey: string;
    enabled: boolean;
    limitValue: number | null;
    expiresAt: Date | null;
    reason: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt?: Date;
  }

  export interface SubscriptionInfo {
    planKey: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive';
    currentPeriodStart?: Date;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  }

  export interface UsageInfo {
    featureKey: string;
    used: number;
    limit: number | null;
    periodStart: Date;
    periodEnd: Date;
    resetAt: Date;
  }

  export interface FeatureConfig {
    percentage?: number;
    [key: string]: unknown;
  }

  export interface DebugTrace {
    featureKey: string;
    source: string;
    value: boolean | number | null;
    overrideId?: string;
    expiresAt?: Date | null;
    planKey?: string;
    config?: FeatureConfig;
    userOverrides: EntitlementOverride[];
    orgOverrides: EntitlementOverride[];
    planFeatures: PlanFeatureConfig[];
    subscription?: SubscriptionInfo;
    fallback: { enabled: boolean; limitValue: number | null };
  }

  export interface ConsumeResult {
    success: boolean;
    feature: string;
    used: number;
    remaining: number | null;
    resetAt: Date;
    error?: string;
    limit?: number;
  }

  export interface EntitlementMap {
    plan: string;
    features: Record<string, boolean>;
    limits: Record<string, number | null>;
    usage: Record<string, number>;
    resetAt: Record<string, string>;
    experiments: Record<string, boolean>;
  }

  export interface ExperimentAssignment {
    inExperiment: boolean;
    bucket: number;
    config: FeatureConfig | null;
  }
}
