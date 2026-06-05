import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFeatureGateService } from '@/lib/entitlements';
import { ensureEntitlementsInitialized } from '@/lib/entitlements/init';
import { DowngradeService } from '@/lib/entitlements';
import { PrismaEntitlementRepository } from '@/lib/entitlements/repository';
import { z } from 'zod';
import { requireAdmin, AuthError } from '@/lib/auth/require-admin';

// ============================================
// Admin Entitlements Routes
// ============================================

// Pagination helper
function getPagination(page = 1, limit = 20) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

// ============================================
// GET /api/admin/entitlements/plans
// ============================================

async function handleGetPlans(request: NextRequest) {
  try {
    await ensureEntitlementsInitialized();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const plans = await prisma.planConfig.findMany({
      ...getPagination(page, limit),
      orderBy: { sortOrder: 'asc' },
      include: {
        features: {
          include: { feature: true },
        },
      },
    });

    const total = await prisma.planConfig.count();

    return NextResponse.json({
      data: plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

// ============================================
// GET /api/admin/entitlements/features
// ============================================

async function handleGetFeatures(request: NextRequest) {
  try {
    await ensureEntitlementsInitialized();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');

    const where = type ? { type: type as any } : {};

    const features = await prisma.feature.findMany({
      ...getPagination(page, limit),
      where,
      orderBy: { key: 'asc' },
    });

    const total = await prisma.feature.count({ where });

    return NextResponse.json({
      data: features,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching features:', error);
    return NextResponse.json({ error: 'Failed to fetch features' }, { status: 500 });
  }
}

// ============================================
// POST /api/admin/entitlements/plan-features
// Add/update feature for a plan
// ============================================

const planFeatureSchema = z.object({
  planKey: z.string(),
  featureKey: z.string(),
  enabled: z.boolean(),
  limitValue: z.number().nullable().optional(),
  configJson: z.record(z.any()).nullable().optional(),
  downgradeStrategy: z.enum(['GRACEFUL', 'IMMEDIATE', 'FREEZE']).optional(),
});

async function handlePostPlanFeature(request: NextRequest) {
  try {
    await ensureEntitlementsInitialized();

    const body = planFeatureSchema.parse(await request.json());

    const plan = await prisma.planConfig.findUnique({ where: { key: body.planKey } });
    const feature = await prisma.feature.findUnique({ where: { key: body.featureKey } });

    if (!plan || !feature) {
      return NextResponse.json({ error: 'Plan or feature not found' }, { status: 404 });
    }

    const planFeature = await prisma.planFeature.upsert({
      where: {
        planId_featureId: { planId: plan.id, featureId: feature.id },
      },
      create: {
        planId: plan.id,
        featureId: feature.id,
        enabled: body.enabled,
        limitValue: body.limitValue ?? null,
        configJson: body.configJson ?? null,
        downgradeStrategy: body.downgradeStrategy ?? 'GRACEFUL',
      },
      update: {
        enabled: body.enabled,
        limitValue: body.limitValue ?? null,
        configJson: body.configJson ?? null,
        downgradeStrategy: body.downgradeStrategy ?? 'GRACEFUL',
      },
    });

    // Reload static data
    const service = getFeatureGateService();
    await service.reloadStaticData();

    return NextResponse.json(planFeature);
  } catch (error) {
    console.error('[Admin] Error updating plan feature:', error);
    return NextResponse.json({ error: 'Failed to update plan feature' }, { status: 500 });
  }
}

// ============================================
// POST /api/admin/entitlements/overrides
// Create entitlement override
// ============================================

const overrideSchema = z.object({
  scope: z.enum(['USER', 'ORG']),
  scopeId: z.string(),
  featureKey: z.string(),
  enabled: z.boolean(),
  limitValue: z.number().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  reason: z.string().min(1),
});

async function handlePostOverride(request: NextRequest) {
  try {
    await ensureEntitlementsInitialized();

    const body = overrideSchema.parse(await request.json());

    // Check if override already exists
    const existing = await prisma.entitlementOverride.findFirst({
      where: {
        scope: body.scope,
        scopeId: body.scopeId,
        featureKey: body.featureKey,
      },
    });

    if (existing) {
      // Update existing
      const updated = await prisma.entitlementOverride.update({
        where: { id: existing.id },
        data: {
          enabled: body.enabled,
          limitValue: body.limitValue ?? null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          reason: body.reason,
        },
      });

      // Invalidate cache
      const service = getFeatureGateService();
      await service.invalidateCache(body.scope === 'ORG' ? body.scopeId : '');

      return NextResponse.json(updated);
    }

    // Create new
    const created = await prisma.entitlementOverride.create({
      data: {
        scope: body.scope,
        scopeId: body.scopeId,
        featureKey: body.featureKey,
        enabled: body.enabled,
        limitValue: body.limitValue ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        reason: body.reason,
      },
    });

    // Invalidate cache
    const service = getFeatureGateService();
    if (body.scope === 'ORG') {
      await service.invalidateCache(body.scopeId);
    }

    return NextResponse.json(created);
  } catch (error) {
    console.error('[Admin] Error creating override:', error);
    return NextResponse.json({ error: 'Failed to create override' }, { status: 500 });
  }
}

// ============================================
// DELETE /api/admin/entitlements/overrides/:id
// Delete entitlement override
// ============================================

async function handleDeleteOverride(_request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const id = params.path[params.path.length - 1];

    const existing = await prisma.entitlementOverride.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    await prisma.entitlementOverride.delete({ where: { id } });

    // Invalidate cache
    const service = getFeatureGateService();
    if (existing.scope === 'ORG') {
      await service.invalidateCache(existing.scopeId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin] Error deleting override:', error);
    return NextResponse.json({ error: 'Failed to delete override' }, { status: 500 });
  }
}

// ============================================
// GET /api/admin/entitlements/orgs/:orgId
// Get org entitlements
// ============================================

async function handleGetOrgEntitlements(_request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const orgId = params.path[1]; // path is like ["orgs", "orgId"]

    await ensureEntitlementsInitialized();

    const service = getFeatureGateService();
    const entitlements = await service.getAllEntitlements(orgId);

    // Also get overrides
    const overrides = await prisma.entitlementOverride.findMany({
      where: { scopeId: orgId, scope: 'ORG' },
    });

    return NextResponse.json({
      entitlements,
      overrides,
    });
  } catch (error) {
    console.error('[Admin] Error fetching org entitlements:', error);
    return NextResponse.json({ error: 'Failed to fetch entitlements' }, { status: 500 });
  }
}

// ============================================
// GET /api/admin/entitlements/orgs/:orgId/downgrade-preview
// Preview what happens if org downgrades
// ============================================

async function handleGetDowngradePreview(_request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const parts = params.path;
    const orgId = parts[1];
    const targetPlan = parts[3]; // /orgs/:orgId/downgrade-preview/:targetPlan

    await ensureEntitlementsInitialized();

    const repo = new PrismaEntitlementRepository(prisma);
    const downgradeService = new DowngradeService(repo);

    const preview = await downgradeService.getDowngradePreview(orgId, targetPlan);

    return NextResponse.json({ preview });
  } catch (error) {
    console.error('[Admin] Error generating downgrade preview:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}

// ============================================
// POST /api/admin/entitlements/cache/invalidate/:orgId
// Manually invalidate cache
// ============================================

async function handlePostCacheInvalidate(_request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const orgId = params.path[params.path.length - 1];

    await ensureEntitlementsInitialized();

    const service = getFeatureGateService();
    await service.invalidateCache(orgId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin] Error invalidating cache:', error);
    return NextResponse.json({ error: 'Failed to invalidate cache' }, { status: 500 });
  }
}

// Route dispatcher
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const pathParts = params.path;

  if (pathParts[0] === 'plans') {
    return handleGetPlans(request);
  }
  if (pathParts[0] === 'features') {
    return handleGetFeatures(request);
  }
  if (pathParts[0] === 'orgs' && pathParts[2] === 'downgrade-preview') {
    return handleGetDowngradePreview(request, { params });
  }
  if (pathParts[0] === 'orgs') {
    return handleGetOrgEntitlements(request, { params });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const pathParts = params.path;

  if (pathParts[0] === 'plan-features') {
    return handlePostPlanFeature(request);
  }
  if (pathParts[0] === 'overrides') {
    return handlePostOverride(request);
  }
  if (pathParts[0] === 'cache' && pathParts[2] === 'invalidate') {
    return handlePostCacheInvalidate(request, { params });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const pathParts = params.path;

  if (pathParts[0] === 'overrides') {
    return handleDeleteOverride(request, { params });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}