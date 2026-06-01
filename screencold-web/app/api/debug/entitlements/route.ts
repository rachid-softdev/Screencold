import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getFeatureGateService, ensureEntitlementsInitialized } from '@/lib/entitlements/init';
import { prisma } from '@/lib/prisma';

// ============================================
// GET /api/debug/entitlements?orgId=X&feature=Y
// Debug endpoint to trace feature resolution
// Requires admin role (session-based auth).
// ============================================

export async function GET(request: NextRequest) {
  try {
    await ensureEntitlementsInitialized();

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const featureKey = searchParams.get('feature');
    const userId = searchParams.get('userId');

    if (!orgId || !featureKey) {
      return NextResponse.json(
        { error: 'orgId and feature parameters required' },
        { status: 400 }
      );
    }

    // Authenticate via JWT session token — check for admin role
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const userRecord = await prisma.user.findUnique({
      where: { id: token.id as string },
    });

    if (!userRecord || userRecord.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: admin access required' },
        { status: 403 }
      );
    }

    const service = getFeatureGateService();
    const debugTrace = await service.getDebugTrace(
      orgId,
      userId || null,
      featureKey
    );

    return NextResponse.json(debugTrace);
  } catch (error) {
    console.error('[Debug] Error fetching entitlements trace:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug trace' },
      { status: 500 }
    );
  }
}
