// ============================================
// Feature Flags & Entitlements Types
// ============================================

export type FeatureType = 'BOOLEAN' | 'LIMIT' | 'EXPERIMENT';
export type DowngradeStrategy = 'GRACEFUL' | 'IMMEDIATE' | 'FREEZE';
export type OverrideScope = 'USER' | 'ORG';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive';

// ============================================
// Core Types
// ============================================

export interface FeatureConfig {
  percentage?: number;
  seed?: string;
  [key: string]: unknown;
}

export interface FeatureDefinition {
  id: string;
  key: string;
  description: string | null;
  type: FeatureType;
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

// ============================================
// Resolution Types
// ============================================

export type ResolutionSource = 'user_override' | 'org_override' | 'plan' | 'fallback';

export interface FeatureResolution {
  featureKey: string;
  source: ResolutionSource;
  value: boolean | number | null;
  overrideId?: string;
  expiresAt?: Date | null;
  planKey?: string;
  config?: FeatureConfig;
}

export interface DebugTrace extends FeatureResolution {
  featureKey: string;
  userOverrides: EntitlementOverride[];
  orgOverrides: EntitlementOverride[];
  planFeatures: PlanFeatureConfig[];
  subscription?: SubscriptionInfo;
  fallback: {
    enabled: boolean;
    limitValue: number | null;
  };
}

export interface SubscriptionInfo {
  planKey: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

// ============================================
// Usage & Consumption
// ============================================

export interface UsageInfo {
  featureKey: string;
  used: number;
  limit: number | null;
  periodStart: Date;
  periodEnd: Date;
  resetAt: Date;
}

export interface ConsumeResult {
  success: boolean;
  feature: string;
  used: number;
  remaining: number | null;
  resetAt?: Date;
  error?: 'LIMIT_REACHED' | 'FEATURE_NOT_AVAILABLE';
  limit?: number;
}

// ============================================
// Entitlement Map
// ============================================

export interface EntitlementMap {
  plan: string;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
  resetAt: Record<string, string>;
  experiments: Record<string, ExperimentAssignment>;
}

export interface ExperimentAssignment {
  inExperiment: boolean;
  bucket: number;
  config: FeatureConfig;
}

// ============================================
// Override Types
// ============================================

export interface EntitlementOverride {
  id: string;
  scope: OverrideScope;
  scopeId: string;
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  expiresAt: Date | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: Date;
}

// ============================================
// API Response Types
// ============================================

export interface UserEntitlementsResponse {
  plan: string;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
  resetAt: Record<string, string>;
}

export interface FeatureNotAvailableError {
  error: 'FEATURE_NOT_AVAILABLE';
  feature: string;
  plan_required: string;
  current_plan: string;
  upgrade_url: string;
}

export interface LimitReachedError {
  error: 'LIMIT_REACHED';
  feature: string;
  limit: number;
  used: number;
  reset_at: string;
  upgrade_url: string;
}

export interface SubscriptionExpiredError {
  error: 'SUBSCRIPTION_EXPIRED';
  renew_url: string;
}

// ============================================
// Admin Types
// ============================================

export interface DowngradePreview {
  featureKey: string;
  currentAccess: boolean | number | null;
  postDowngradeAccess: boolean | number | null;
  strategy: DowngradeStrategy;
  affectedUsers: number;
}

export interface PlanFeatureInput {
  featureId: string;
  enabled: boolean;
  limitValue?: number | null;
  configJson?: FeatureConfig | null;
  downgradeStrategy?: DowngradeStrategy;
}

export interface OverrideInput {
  scope: OverrideScope;
  scopeId: string;
  featureKey: string;
  enabled: boolean;
  limitValue?: number | null;
  expiresAt?: Date | null;
  reason: string;
}

// ============================================
// Pagination
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
}