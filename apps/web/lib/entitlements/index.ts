// Feature Flags & Entitlements Module
// ============================================

// Types
export * from '@screencold/types';

// Repository
export { IEntitlementRepository, PrismaEntitlementRepository } from './repository';

// Cache
export { EntitlementsCacheService, getCacheService, CACHE_CONFIG } from './cache';

// Service
export {
  FeatureGateService,
  initializeFeatureGateService,
  getFeatureGateService,
} from './service';

// Stripe Webhook
export { StripeWebhookHandler, handleStripeWebhook } from './stripe-webhook';

// Downgrade
export { DowngradeService } from './downgrade';

// Middleware
export { createFeatureMiddleware, createLimitMiddleware, createConsumeMiddleware } from './middleware';

// Types for internal use
export type { FeatureGateService } from './service';
export type { ICacheService } from './cache';