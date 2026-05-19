import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

// ============================================
// Security Headers
// ============================================

/**
 * Add security headers to response
 * Includes CSP, X-Frame-Options, X-Content-Type-Options, etc.
 */
export function addSecurityHeaders(response: NextResponse, request: NextRequest): void {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Content-Security-Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://js.screencold.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://api.resend.dev https://api.screencold.com wss://*.screencold.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // X-Frame-Options - prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options - prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer-Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions-Policy
  response.headers.set(
    'Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  
  // Strict-Transport-Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains'
    );
  }
}

/**
 * Verify CSRF token for state-changing operations
 */
export async function verifyCsrfToken(request: NextRequest): Promise<boolean> {
  // Only check for mutation methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return true;
  }
  
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Allow same-origin requests
  if (origin === appUrl || (referer && referer.startsWith(appUrl))) {
    return true;
  }
  
  // For API routes, also check the Origin header
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!origin) {
      // Without Origin header, check referer
      return referer ? referer.startsWith(appUrl) : false;
    }
  }
  
  return true;
}

export interface MiddlewareOptions {
  requireAuth?: boolean;
  requireCredits?: boolean;
  requireApiKey?: boolean; // For API key authentication
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
  isApiKey?: boolean;
  errorResponse?: NextResponse;
}

// Hash function for API key validation
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Validate API key
async function validateApiKey(request: NextRequest): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer sk_')) {
    return { valid: false, error: 'Invalid authorization header' };
  }

  const apiKey = authHeader.replace('Bearer ', '');
  const hashedKey = hashKey(apiKey);

  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: { user: true },
  });

  if (!keyRecord) {
    return { valid: false, error: 'Invalid API key' };
  }

  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return { valid: false, error: 'API key expired' };
  }

  // Update last used
  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return { valid: true, userId: keyRecord.userId };
}

export async function apiMiddleware(
  request: NextRequest,
  options: MiddlewareOptions = {}
): Promise<MiddlewareResult> {
  const { requireAuth = false, requireCredits = false, requireApiKey = false } = options;

  // First, try API key authentication if header is present
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer sk_')) {
    const apiKeyValidation = await validateApiKey(request);
    
    if (apiKeyValidation.valid && apiKeyValidation.userId) {
      const user = await prisma.user.findUnique({
        where: { id: apiKeyValidation.userId },
        select: { id: true, email: true, name: true, plan: true, credits: true },
      });

      if (user) {
        return {
          authorized: true,
          userId: user.id,
          isApiKey: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            credits: user.credits,
          },
        };
      }
    }
  }

  // Otherwise, try JWT/session authentication
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
