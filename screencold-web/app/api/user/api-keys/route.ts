import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';
import { getPlan, canUseAPI } from '@/lib/plans';

// Validation schema
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  rateLimit: z.number().min(10).max(1000).optional(),
});

// Hash the API key for storage. Uses a keyed HMAC (peppered SHA-256) when
// API_KEY_PEPPER is set, matching the verification logic in middleware.ts.
// Existing keys hashed with plain SHA-256 are still accepted (see middleware).
const API_KEY_PEPPER = process.env.API_KEY_PEPPER;

function hashKey(key: string): string {
  if (API_KEY_PEPPER) {
    return crypto.createHmac('sha256', API_KEY_PEPPER).update(key).digest('hex');
  }
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Generate a new API key
function generateApiKey(): string {
  const prefix = 'sk_live';
  const randomPart = crypto.randomBytes(24).toString('hex');
  return `${prefix}_${randomPart}`;
}

// GET /api/user/api-keys - List user's API keys
export async function GET(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user || !canUseAPI(user.plan)) {
      return NextResponse.json(
        { error: 'PLAN_REQUIRED', message: 'API access requires Pro or Agency plan' },
        { status: 403 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('[API Keys] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/user/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse, user } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId || !user) {
      return errorResponse!;
    }

    // Check plan
    const userPlan = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!userPlan || !canUseAPI(userPlan.plan)) {
      return NextResponse.json(
        { error: 'PLAN_REQUIRED', message: 'API access requires Pro or Agency plan' },
        { status: 403 }
      );
    }

    // Validate body
    const body = await request.json();
    const validationResult = createApiKeySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, rateLimit } = validationResult.data;
    const plan = userPlan.plan as keyof typeof getPlan;
    const planInfo = getPlan(plan);

    // Generate key
    const rawKey = generateApiKey();
    const hashedKey = hashKey(rawKey);

    // Create API key
    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        keyPrefix: rawKey.substring(0, 12) + '...',
        name,
        userId,
        plan: userPlan.plan,
        rateLimit: rateLimit ?? planInfo.features.apiAccess ? 100 : 10,
      },
    });

    // Return the raw key once (user must save it)
    return NextResponse.json(
      {
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          rateLimit: apiKey.rateLimit,
          createdAt: apiKey.createdAt,
        },
        rawKey, // Only shown once!
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Keys] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/api-keys - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { error: 'MISSING_ID', message: 'API key ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'API key not found' },
        { status: 404 }
      );
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Keys] DELETE error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}