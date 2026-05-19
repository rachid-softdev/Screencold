import { NextRequest, NextResponse } from 'next/server';
import { getFeatureGateService, ensureEntitlementsInitialized } from '@/lib/entitlements/init';
import { prisma } from '@/lib/prisma';

// ============================================
// GET /api/debug/entitlements?orgId=X&feature=Y
// Debug endpoint to trace feature resolution
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

    // Check admin (simplified - in production use proper auth)
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      // Allow in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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