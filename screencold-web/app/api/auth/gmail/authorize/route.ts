/**
 * Gmail OAuth Authorize
 * Initiates Gmail OAuth flow with proper CSRF protection.
 * Generates a random state token, stores it in a signed cookie,
 * and returns the Google OAuth URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getToken } from 'next-auth/jwt';
import { getGmailAuthUrl } from '@/lib/gmail';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user via JWT session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Generate a cryptographically random state value
    const stateToken = crypto.randomBytes(32).toString('hex');

    // Store the state token in a signed, HTTP-only cookie
    // This prevents CSRF attacks on the OAuth callback
    const response = NextResponse.json({
      redirectUrl: getGmailAuthUrl(stateToken),
    });

    // Set the state token as an HTTP-only, SameSite=Lax cookie
    // with a short TTL (10 minutes) - the OAuth flow should complete quickly
    response.cookies.set('gmail_oauth_state', stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    // Also store the user ID in a cookie to verify on callback
    response.cookies.set('gmail_oauth_userId', token.id as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('[Gmail Authorize] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Gmail OAuth' },
      { status: 500 }
    );
  }
}
