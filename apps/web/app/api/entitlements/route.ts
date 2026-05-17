import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFeatureGateService } from '@/lib/entitlements';
import { ensureEntitlementsInitialized } from '@/lib/entitlements/init';

// ============================================
// GET /api/me/entitlements
// Returns current user's entitlements
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Ensure service is initialized
    await ensureEntitlementsInitialized();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create organization for user
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      include: { org: true },
    });

    let orgId: string;

    if (!userOrg) {
      // Create organization for user
      const org = await prisma.organization.create({
        data: {
          name: user.name || user.email.split('@')[0] || 'Personal',
          isActive: true,
        },
      });

      await prisma.userOrganization.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: 'OWNER',
          isPrimary: true,
        },
      });

      // Create default FREE subscription
      await prisma.subscription.create({
        data: {
          orgId: org.id,
          planKey: 'FREE',
          status: 'inactive',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      orgId = org.id;
    } else {
      orgId = userOrg.orgId;
    }

    // Get entitlements
    const service = getFeatureGateService();
    const entitlements = await service.getAllEntitlements(orgId);

    // Transform to client-friendly format
    const response = {
      plan: entitlements.plan,
      features: entitlements.features,
      limits: entitlements.limits,
      usage: entitlements.usage,
      resetAt: entitlements.resetAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Entitlements] Error fetching entitlements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entitlements' },
      { status: 500 }
    );
  }
}