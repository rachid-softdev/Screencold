import { PrismaClient } from '@prisma/client';
import { prisma as prismaRaw } from '@/lib/prisma';
import {
  initializeFeatureGateService,
  PrismaEntitlementRepository,
} from './index';

// ============================================
// Entitlements Service Initialization
// ============================================

let initialized = false;

const prisma = prismaRaw as unknown as PrismaClient;

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