import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  getCorrelationId,
  runWithCorrelationId,
} from '@/lib/correlation-id';
import { getRequestVersion, addVersionHeaders } from '@/lib/api-version';

// ============================================
// Security Headers
// ============================================

/**
 * Add security headers to response
 * Includes CSP, X-Frame-Options, X-Content-Type-Options, etc.
 */
export function addSecurityHeaders(response: NextResponse, _request: NextRequest): void {
  
  // Content-Security-Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://js.screencold.com http://localhost:8400",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://api.resend.dev https://api.screencold.com wss://*.screencold.com http://localhost:8400",
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
 * CSRF protection via double-submit cookie pattern.
 *
 * A `csrf_token` cookie (not HttpOnly so the SPA can read it) is set on every
 * API response. State-changing requests must echo that value back in the
 * `X-CSRF-Token` header. Because an attacker's cross-site request cannot read
 * or set the cookie value (SameSite + path scoping), they cannot supply the
 * matching header — closing the Origin/Referer-spoofing loophole.
 *
 * As defense-in-depth we still require a same-origin Origin/Referer when no
 * token is present (e.g. non-browser clients using API keys are exempt — they
 * are authenticated separately).
 */
export const CSRF_COOKIE_NAME = 'csrf_token';

export function ensureCsrfCookie(response: NextResponse): void {
  if (!response.cookies.get(CSRF_COOKIE_NAME)) {
    const token = crypto.randomUUID();
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'strict',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
    });
  }
}

export async function verifyCsrfToken(request: NextRequest): Promise<boolean> {
  // Only check for mutation methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return true;
  }

  // API-key authenticated requests are verified by the signature, not cookies.
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer sk_')) {
    return true;
  }

  const headerToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (headerToken && cookieToken && headerToken === cookieToken) {
    return true;
  }

  // Defense-in-depth: fall back to strict same-origin Origin/Referer check.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (origin === appUrl || (referer && referer.startsWith(appUrl))) {
    return true;
  }

  return false;
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
  correlationId?: string;
  errorResponse?: NextResponse;
}

// Hash function for API key validation.
// crypto (node:crypto) is only available in the Node.js runtime, not the Edge
// runtime used by Next.js middleware. Load it lazily so the Edge bundle never
// imports node:crypto at module-eval time. validateApiKey only runs from
// Node.js API route handlers, so the dynamic import resolves there.
// Uses a keyed HMAC (peppered SHA-256) instead of plain SHA-256 so that a
// database leak does not expose brute-forceable / rainbow-table-able hashes.
// Falls back to the legacy unpeppered SHA-256 for backward compatibility with
// keys created before this change (so existing keys keep working).
const API_KEY_PEPPER = process.env.API_KEY_PEPPER;

async function hashKey(key: string): Promise<string> {
  const { createHash, createHmac } = await import('crypto');
  if (API_KEY_PEPPER) {
    return createHmac('sha256', API_KEY_PEPPER).update(key).digest('hex');
  }
  return createHash('sha256').update(key).digest('hex');
}

async function legacyHashKey(key: string): Promise<string> {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(key).digest('hex');
}

// Validate API key
async function validateApiKey(request: NextRequest): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer sk_')) {
    return { valid: false, error: 'Invalid authorization header' };
  }

  const apiKey = authHeader.replace('Bearer ', '');
  const hashedKey = await hashKey(apiKey);
  const legacyHashedKey = API_KEY_PEPPER ? await legacyHashKey(apiKey) : null;

  // prisma is dynamically imported so it is never evaluated in the Edge runtime
  // (PrismaClient cannot run on Edge). API key validation runs in the Node.js
  // runtime for API routes.
  const { default: prisma } = await import('@/lib/prisma');

  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: { user: true },
  });

  // Backward-compat: existing keys stored with the old plain SHA-256 hash
  if (!keyRecord && legacyHashedKey) {
    const legacyRecord = await prisma.apiKey.findUnique({
      where: { key: legacyHashedKey },
      include: { user: true },
    });

    if (legacyRecord) {
      // Re-hash with the pepper so future lookups are hardened.
      await prisma.apiKey.update({
        where: { id: legacyRecord.id },
        data: { key: hashedKey },
      });
      return {
        valid: true,
        userId: legacyRecord.userId,
      };
    }
  }

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
  // Generate correlation ID for this request
  const correlationId =
    request.headers.get('x-correlation-id') || globalThis.crypto.randomUUID();
  request.headers.set('x-correlation-id', correlationId);

  // Execute in async context so downstream code can retrieve the ID
  return runWithCorrelationId(correlationId, async () => {
    const { requireAuth = false, requireCredits = false } = options;

    // First, try API key authentication if header is present
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer sk_')) {
      const apiKeyValidation = await validateApiKey(request);
      
      if (apiKeyValidation.valid && apiKeyValidation.userId) {
        const { default: prisma } = await import('@/lib/prisma');
        const user = await prisma.user.findUnique({
          where: { id: apiKeyValidation.userId },
          select: { id: true, email: true, name: true, plan: true, credits: true },
        });

        if (user) {
          return {
            authorized: true,
            userId: user.id,
            isApiKey: true,
            correlationId,
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
        correlationId,
        errorResponse: NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'Authentication required' },
          { status: 401 }
        ),
      };
    }

    // If no auth required and no token, return early
    if (!token) {
      return { authorized: true, correlationId };
    }

    // Check credits if required
    if (requireCredits && token.credits && (token.credits as number) <= 0) {
      return {
        authorized: false,
        correlationId,
        errorResponse: NextResponse.json(
          { error: 'NO_CREDITS', message: 'Insufficient credits' },
          { status: 402 }
        ),
      };
    }

    return {
      authorized: true,
      correlationId,
      userId: token.id as string,
      user: {
        id: token.id as string,
        email: token.email as string,
        name: (token.name as string | null) ?? null,
        plan: token.plan as string,
        credits: token.credits as number,
      },
    };
  });
}

// ============================================
// Rate Limiting (Redis-backed, distributed)
// ============================================

/**
 * Get rate limit headers using Redis-backed distributed rate limiter.
 * Falls back to fail-open if Redis is unavailable.
 * The redis client is imported lazily so the Edge middleware bundle never
 * evaluates ioredis (which is incompatible with the Edge runtime).
 */
export async function getRateLimitHeaders(request: NextRequest): Promise<Record<string, string>> {
  const { getRateLimitHeaders: getRedisRateLimitHeaders } = await import('@/lib/redis-rate-limit');
  return getRedisRateLimitHeaders(request);
}

/**
 * Check if request is within rate limits using Redis.
 * Supports per-IP for public endpoints, per-user for authenticated ones.
 * The redis client is imported lazily for Edge-runtime compatibility.
 */
export async function checkRateLimit(request: NextRequest): Promise<boolean> {
  const { checkRateLimit: checkRedisRateLimit } = await import('@/lib/redis-rate-limit');
  return checkRedisRateLimit(request);
}

/**
 * Returns headers that should be included in every API response.
 * Currently includes the correlation ID so clients can trace requests.
 */
export function getResponseHeaders(): Record<string, string> {
  const correlationId = getCorrelationId();
  return correlationId ? { 'x-correlation-id': correlationId } : {};
}

// ============================================
// Main Middleware Handler (Next.js App Router)
// ============================================

const API_ROUTES = ['/api/'];

export async function middleware(request: NextRequest): Promise<NextResponse | undefined> {
  const { pathname } = request.nextUrl;

  const isApiRoute = API_ROUTES.some((prefix) => pathname.startsWith(prefix));

  // Detect API version and apply versioning
  const version = getRequestVersion(request);
  const versionMatch = pathname.match(/\/api\/(v\d+)\//);
  if (isApiRoute && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/health')) {
    if (!versionMatch) {
      const newUrl = new URL(request.url);
      newUrl.pathname = `/api/${version}${pathname}`;
      return NextResponse.redirect(newUrl);
    }
  }

  // Generate and set correlation ID
  const correlationId = request.headers.get('x-correlation-id') || globalThis.crypto.randomUUID();
  request.headers.set('x-correlation-id', correlationId);

  // Apply rate limiting to API routes
  if (isApiRoute) {
    const allowed = await checkRateLimit(request);
    if (!allowed) {
      const rateHeaders = await getRateLimitHeaders(request);
      const response = NextResponse.json(
        { error: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
        { status: 429, headers: rateHeaders }
      );
      addSecurityHeaders(response, request);
      return response;
    }
  }

  // CSRF check on mutation routes
  if (isApiRoute && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const csrfValid = await verifyCsrfToken(request);
    if (!csrfValid) {
      const response = NextResponse.json(
        { error: 'CSRF_FAILED', message: 'Invalid or missing CSRF token.' },
        { status: 403 }
      );
      addSecurityHeaders(response, request);
      return response;
    }
  }

  // Build response with headers
  const response = NextResponse.next();
  response.headers.set('x-correlation-id', correlationId);

  // Ensure a CSRF double-submit cookie is present for API consumers
  if (isApiRoute) {
    ensureCsrfCookie(response);
  }

  if (versionMatch) {
    addVersionHeaders(response, version);
  }

  addSecurityHeaders(response, request);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
