import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export interface MiddlewareOptions {
  requireAuth?: boolean;
  requireCredits?: boolean;
}

export interface MiddlewareResult {
  authorized: boolean;
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
    credits: number;
  };
  errorResponse?: NextResponse;
}

export async function apiMiddleware(
  request: NextRequest,
  options: MiddlewareOptions = {}
): Promise<MiddlewareResult> {
  const { requireAuth = false, requireCredits = false } = options;

  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Check if auth is required
  if (requireAuth && !token) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  // If no auth required and no token, return early
  if (!token) {
    return { authorized: true };
  }

  // Check credits if required
  if (requireCredits && token.credits && (token.credits as number) <= 0) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'NO_CREDITS', message: 'Insufficient credits' },
        { status: 402 }
      ),
    };
  }

  return {
    authorized: true,
    userId: token.id as string,
    user: {
      id: token.id as string,
      email: token.email as string,
      name: token.name,
      plan: token.plan as string,
      credits: token.credits as number,
    },
  };
}

// ============================================
// Rate Limiting (in-memory, per-instance)
// For distributed rate limiting, use Redis via ioredis in the API routes
// that need it (e.g., /api/audits, /api/auth/register)
// ============================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function getRateLimitHeaders(request: NextRequest): Record<string, string> {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = `rate-limit-${ip}`;
  const now = Date.now();

  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return {
      'X-RateLimit-Limit': '60',
      'X-RateLimit-Remaining': '59',
      'X-RateLimit-Reset': String(now + 60000),
    };
  }

  const remaining = Math.max(0, 60 - current.count);
  current.count++;

  return {
    'X-RateLimit-Limit': '60',
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(current.resetTime),
  };
}

export function checkRateLimit(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = `rate-limit-${ip}`;
  const now = Date.now();

  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    return true;
  }

  if (current.count >= 60) {
    return false;
  }

  current.count++;
  return true;
}
