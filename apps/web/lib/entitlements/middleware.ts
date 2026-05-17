import { NextRequest, NextResponse } from 'next/server';
import { getFeatureGateService } from './service';
import { getCacheService } from './cache';
import type { ConsumeResult } from '@screencold/types';

// ============================================
// Middleware Factory Functions
// ============================================

// Org ID resolver - extract from session/auth
type OrgIdResolver = (request: NextRequest) => Promise<string | null>;

let orgIdResolver: OrgIdResolver | null = null;

/**
 * Set custom org ID resolver (e.g., from session, JWT, headers)
 */
export function setOrgIdResolver(resolver: OrgIdResolver): void {
  orgIdResolver = resolver;
}

/**
 * Default org ID resolver - tries to get from header or query
 */
async function resolveOrgId(request: NextRequest): Promise<string | null> {
  // Try custom resolver first
  if (orgIdResolver) {
    return orgIdResolver(request);
  }

  // Default: try X-Org-ID header
  const orgId = request.headers.get('x-org-id') || request.nextUrl.searchParams.get('orgId');
  return orgId;
}

/**
 * Common error response generator
 */
function errorResponse(
  errorType: string,
  message: string,
  status: number,
  extras?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: errorType,
      message,
      ...extras,
    },
    { status }
  );
}

// ============================================
// Middleware Creators
// ============================================

/**
 * Create middleware that requires a feature to be enabled
 */
export function createFeatureMiddleware(featureKey: string) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const orgId = await resolveOrgId(request);
    if (!orgId) {
      return errorResponse('UNAUTHORIZED', 'Organization ID required', 401);
    }

    const service = getFeatureGateService();
    const hasFeature = await service.hasFeature(orgId, featureKey);

    if (!hasFeature) {
      const entitlements = await service.getAllEntitlements(orgId);
      return errorResponse(
        'FEATURE_NOT_AVAILABLE',
        `Feature ${featureKey} is not available on your plan`,
        403,
        {
          feature: featureKey,
          current_plan: entitlements.plan,
          upgrade_url: '/billing/upgrade',
        }
      );
    }

    return null; // Continue
  };
}

/**
 * Create middleware that checks limit without consuming
 */
export function createLimitMiddleware(limitKey: string) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const orgId = await resolveOrgId(request);
    if (!orgId) {
      return errorResponse('UNAUTHORIZED', 'Organization ID required', 401);
    }

    const service = getFeatureGateService();
    const limit = await service.getLimit(orgId, limitKey);

    // If unlimited, allow
    if (limit === null) {
      return null;
    }

    // Check current usage
    const cache = getCacheService();
    const entitlements = await cache.get<any>(orgId);
    const used = entitlements?.usage?.[limitKey] ?? 0;

    if (used >= limit) {
      // Get reset date
      const usageInfo = entitlements?.resetAt?.[limitKey];
      return errorResponse(
        'LIMIT_REACHED',
        `Limit for ${limitKey} has been reached`,
        402,
        {
          feature: limitKey,
          limit,
          used,
          reset_at: usageInfo || new Date().toISOString(),
          upgrade_url: '/billing/upgrade',
        }
      );
    }

    return null; // Continue
  };
}

/**
 * Create middleware that checks AND consumes quota atomically
 */
export function createConsumeMiddleware(limitKey: string, amount = 1) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const orgId = await resolveOrgId(request);
    if (!orgId) {
      return errorResponse('UNAUTHORIZED', 'Organization ID required', 401);
    }

    const service = getFeatureGateService();

    // Check if feature is enabled first
    const hasFeature = await service.hasFeature(orgId, limitKey);
    if (!hasFeature) {
      const entitlements = await service.getAllEntitlements(orgId);
      return errorResponse(
        'FEATURE_NOT_AVAILABLE',
        `Feature ${limitKey} is not available on your plan`,
        403,
        {
          feature: limitKey,
          current_plan: entitlements.plan,
          upgrade_url: '/billing/upgrade',
        }
      );
    }

    // Try to consume
    const result = await service.consume(orgId, limitKey, amount);

    if (!result.success) {
      return errorResponse(
        'LIMIT_REACHED',
        `Limit for ${limitKey} has been reached`,
        402,
        {
          feature: limitKey,
          limit: result.limit,
          used: result.used,
          reset_at: result.resetAt?.toISOString(),
          upgrade_url: '/billing/upgrade',
        }
      );
    }

    // Add usage info to request headers for the handler
    const headers = new Headers(request.headers);
    headers.set('x-feature-used', String(result.used));
    if (result.remaining !== null) {
      headers.set('x-feature-remaining', String(result.remaining));
    }

    // We can't modify request, so we'll pass data via context
    // This is a limitation of Next.js middleware - we'll handle it in the route handler
    // Instead, we'll return a response with the result that the handler can check
    return null;
  };
}

// ============================================
// Next.js Route Wrapper
// ============================================

/**
 * Wrapper to apply feature gate to a route handler
 */
export function withFeature(featureKey: string, handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const check = createFeatureMiddleware(featureKey);
    const error = await check(req);
    if (error) return error;
    return handler(req);
  };
}

/**
 * Wrapper to apply limit check to a route handler
 */
export function withLimit(limitKey: string, handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const check = createLimitMiddleware(limitKey);
    const error = await check(req);
    if (error) return error;
    return handler(req);
  };
}

/**
 * Wrapper to apply consume to a route handler
 */
export function withConsume(
  limitKey: string,
  amount = 1,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const check = createConsumeMiddleware(limitKey, amount);
    const error = await check(req);
    if (error) return error;
    return handler(req);
  };
}

// ============================================
// Express-style Middleware (for non-Next.js use)
// ============================================

export interface ExpressRequest {
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  user?: { id: string; orgId?: string };
}

export type ExpressNextFunction = (err?: Error) => void;
export type ExpressMiddleware = (
  req: ExpressRequest,
  res: { status: (code: number) => any; json: (data: any) => any },
  next: ExpressNextFunction
) => void;

/**
 * Create Express-style middleware for feature check
 */
export function expressRequireFeature(featureKey: string): ExpressMiddleware {
  return async (req, res, next) => {
    const orgId = req.user?.orgId || (req.headers['x-org-id'] as string);
    if (!orgId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const service = getFeatureGateService();
    const hasFeature = await service.hasFeature(orgId, featureKey);

    if (!hasFeature) {
      const entitlements = await service.getAllEntitlements(orgId);
      return res.status(403).json({
        error: 'FEATURE_NOT_AVAILABLE',
        feature: featureKey,
        current_plan: entitlements.plan,
        upgrade_url: '/billing/upgrade',
      });
    }

    next();
  };
}

/**
 * Create Express-style middleware for consume
 */
export function expressConsumeFeature(limitKey: string, amount = 1): ExpressMiddleware {
  return async (req, res, next) => {
    const orgId = req.user?.orgId || (req.headers['x-org-id'] as string);
    if (!orgId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const service = getFeatureGateService();
    const result = await service.consume(orgId, limitKey, amount);

    if (!result.success) {
      return res.status(402).json({
        error: 'LIMIT_REACHED',
        feature: limitKey,
        limit: result.limit,
        used: result.used,
        reset_at: result.resetAt?.toISOString(),
        upgrade_url: '/billing/upgrade',
      });
    }

    // Attach to request for handler
    (req as any).featureUsage = result;
    next();
  };
}