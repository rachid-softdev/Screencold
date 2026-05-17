import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFeatureGateService, ensureEntitlementsInitialized } from '@/lib/entitlements/init';
import { DowngradeService } from '@/lib/entitlements';
import { PrismaEntitlementRepository } from '@/lib/entitlements/repository';
import { z } from 'zod';

// ============================================
// Admin Entitlements Routes
// ============================================

// Helper to check admin role
async function requireAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return user?.plan === 'AGENCY' || user?.plan === 'PRO';
}

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

export async function GET_PLANS(request: NextRequest) {
  try {
    await ensureEntitlementsInitialized();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const plans = await prisma.plan.findMany({
      ...getPagination(page, limit),
      orderBy: { sortOrder: 'asc' },
      include: {
        features: {
          include: { feature: true },
        },
      },
    });

    const total = await prisma.plan.count();

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

export async function GET_FEATURES(request: NextRequest) {
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

export async function POST_PLAN_FEATURE(request: NextRequest) {
  try {
    await ensureEntitlementsInitialized();

    const body = planFeatureSchema.parse(await request.json());

    const plan = await prisma.plan.findUnique({ where: { key: body.planKey } });
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

export async function POST_OVERRIDE(request: NextRequest) {
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

export async function DELETE_OVERRIDE(request: NextRequest, { params }: { params: { path: string[] } }) {
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

export async function GET_ORG_ENTITLEMENTS(request: NextRequest, { params }: { params: { path: string[] } }) {
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

export async function GET_DOWNGRADE_PREVIEW(request: NextRequest, { params }: { params: { path: string[] } }) {
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

export async function POST_CACHE_INVALIDATE(request: NextRequest, { params }: { params: { path: string[] } }) {
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
  const pathParts = params.path;

  if (pathParts[0] === 'plans') {
    return GET_PLANS(request);
  }
  if (pathParts[0] === 'features') {
    return GET_FEATURES(request);
  }
  if (pathParts[0] === 'orgs' && pathParts[2] === 'downgrade-preview') {
    return GET_DOWNGRADE_PREVIEW(request, { params });
  }
  if (pathParts[0] === 'orgs') {
    return GET_ORG_ENTITLEMENTS(request, { params });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const pathParts = params.path;

  if (pathParts[0] === 'plan-features') {
    return POST_PLAN_FEATURE(request);
  }
  if (pathParts[0] === 'overrides') {
    return POST_OVERRIDE(request);
  }
  if (pathParts[0] === 'cache' && pathParts[2] === 'invalidate') {
    return POST_CACHE_INVALIDATE(request, { params });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  const pathParts = params.path;

  if (pathParts[0] === 'overrides') {
    return DELETE_OVERRIDE(request, { params });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}