/**
 * CSRF Protection utilities
 * Provides token generation and verification for CSRF protection
 */

import crypto from 'crypto';

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a signed CSRF token for validation
 */
export function signCsrfToken(token: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(token);
  return hmac.digest('hex');
}

/**
 * Verify a CSRF token
 */
export function verifyCsrfToken(token: string, secret: string, signature: string): boolean {
  const expectedSignature = signCsrfToken(token, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Generate CSRF token pair (token + signature for form)
 */
export function createCsrfTokenPair(): { token: string; signature: string } {
  const token = generateCsrfToken();
  const signature = signCsrfToken(token, process.env.NEXTAUTH_SECRET || 'default-secret');
  return { token, signature };
}

/**
 * CSRF middleware for API routes
 * Returns true if request is safe, false if CSRF check fails
 */
export function isRequestSafe(request: Request): boolean {
  // Only protect mutation methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return true;
  }
  
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Allow same-origin requests
  if (origin === appUrl) {
    return true;
  }
  
  if (referer && referer.startsWith(appUrl)) {
    return true;
  }
  
  // For API routes without origin/referer, check if it's a browser request
  const userAgent = request.headers.get('user-agent') || '';
  const isBrowser = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari');
  
  // Non-browser clients (curl, axios, etc.) might not have origin
  // In production, you might want to be more strict
  if (process.env.NODE_ENV === 'production') {
    // In production, require origin for browser requests
    if (isBrowser && !origin) {
      return false;
    }
  }
  
  return true;
}