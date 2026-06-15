// Feature Flags & Entitlements Module
// ============================================

// Repository
export type { IEntitlementRepository } from './repository';
export { PrismaEntitlementRepository } from './repository';

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

// Types for internal use (FeatureGateService already exported as class above)
export type { ICacheService } from './cache';