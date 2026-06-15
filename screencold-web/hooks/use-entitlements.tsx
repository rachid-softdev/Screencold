'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ============================================
// Types
// ============================================

export interface Entitlements {
  plan: string;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
  resetAt: Record<string, string>;
}

export interface LimitInfo {
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAt: string | null;
}

interface EntitlementsContextValue {
  entitlements: Entitlements | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================
// Context
// ============================================

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEntitlements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/entitlements', {
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entitlements');
      }

      const data = await response.json();
      setEntitlements(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  return (
    <EntitlementsContext.Provider
      value={{
        entitlements,
        isLoading,
        error,
        refetch: fetchEntitlements,
      }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================

/**
 * Get all entitlements for the current user
 */
export function useEntitlements() {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error('useEntitlements must be used within EntitlementsProvider');
  }
  return context;
}

/**
 * Check if a feature is enabled
 */
export function useFeature(featureKey: string): boolean {
  const { entitlements, isLoading } = useEntitlements();

  if (isLoading || !entitlements) {
    return false;
  }

  return entitlements.features[featureKey] ?? false;
}

/**
 * Get limit info for a feature
 */
export function useLimit(limitKey: string): LimitInfo {
  const { entitlements, isLoading } = useEntitlements();

  if (isLoading || !entitlements) {
    return { limit: null, used: 0, remaining: null, resetAt: null };
  }

  const limit = entitlements.limits[limitKey] ?? null;
  const used = entitlements.usage[limitKey] ?? 0;
  const resetAt = entitlements.resetAt[limitKey] ?? null;

  return {
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    resetAt,
  };
}

/**
 * Check if user can perform an action (has feature and under limit)
 */
export function useCanPerform(featureKey: string): boolean {
  const hasFeature = useFeature(featureKey);
  const { limit, used } = useLimit(featureKey);

  if (!hasFeature) return false;
  if (limit === null) return true; // Unlimited

  return used < limit;
}

/**
 * Get current plan info
 */
export function usePlan(): string {
  const { entitlements, isLoading } = useEntitlements();

  if (isLoading || !entitlements) {
    return 'FREE';
  }

  return entitlements.plan;
}

// ============================================
// Components
// ============================================

interface FeatureGuardProps {
  feature: string;
  limit?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  fallbackComponent?: React.ComponentType<{
    planRequired?: string;
    limitReached?: boolean;
    limit?: number;
  }>;
}

/**
 * Component that only renders children if feature is available
 */
export function FeatureGuard({
  feature,
  limit,
  children,
  fallback,
  fallbackComponent: FallbackComponent,
}: FeatureGuardProps) {
  const hasFeature = useFeature(feature);
  const { remaining, limit: limitValue } = useLimit(limit || feature);

  // Check feature
  if (!hasFeature) {
    if (FallbackComponent) {
      return <FallbackComponent planRequired={feature} />;
    }
    return fallback ?? null;
  }

  // Check limit if specified
  if (limit && limitValue !== null && remaining !== null && remaining <= 0) {
    if (FallbackComponent) {
      return <FallbackComponent limitReached limit={limitValue} />;
    }
    return fallback ?? null;
  }

  return <>{children}</>;
}

/**
 * Upgrade banner shown when feature not available
 */
interface UpgradeBannerProps {
  planRequired?: string;
  limitReached?: boolean;
  limit?: number;
}

export function UpgradeBanner({ planRequired, limitReached, limit }: UpgradeBannerProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
      <div className="flex items-center gap-2">
        <span className="text-amber-600">
          {limitReached
            ? `You've reached your ${limit} limit`
            : `This feature requires ${planRequired} plan`}
        </span>
      </div>
      <a
        href="/billing/upgrade"
        className="inline-block mt-2 text-sm font-medium text-amber-700 hover:text-amber-800"
      >
        Upgrade now →
      </a>
    </div>
  );
}

/**
 * HOC to wrap a component with feature guard
 */
export function withFeatureGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureKey: string,
  limitKey?: string
) {
  return function WithFeatureGuard(props: P) {
    return (
      <FeatureGuard feature={featureKey} limit={limitKey}>
        <WrappedComponent {...props} />
      </FeatureGuard>
    );
  };
}