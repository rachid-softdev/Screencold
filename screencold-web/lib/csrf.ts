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
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET environment variable is required');
  }
  const token = generateCsrfToken();
  const signature = signCsrfToken(token, secret);
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
  
  // For browser requests, origin or referer matching APP_URL is required
  const userAgent = request.headers.get('user-agent') || '';
  const isBrowser = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari');
  
  if (isBrowser) {
    return false;
  }
  
  // For non-browser requests (API clients, curl), check for CSRF token
  const csrfToken = request.headers.get('x-csrf-token');
  if (csrfToken) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return false;
    }
    const parts = csrfToken.split(':');
    if (parts.length === 2) {
      return verifyCsrfToken(parts[0], secret, parts[1]);
    }
  }
  
  return false;
}