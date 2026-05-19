import { prisma } from '@/lib/prisma';
import {
  initializeFeatureGateService,
  PrismaEntitlementRepository,
} from './index';

// ============================================
// Entitlements Service Initialization
// ============================================

let initialized = false;

export async function initializeEntitlements(): Promise<void> {
  if (initialized) return;

  const repo = new PrismaEntitlementRepository(prisma);
  initializeFeatureGateService(repo);

  initialized = true;
  console.log('[Entitlements] Service initialized');
}

export async function ensureEntitlementsInitialized(): Promise<void> {
  if (!initialized) {
    await initializeEntitlements();
  }
}