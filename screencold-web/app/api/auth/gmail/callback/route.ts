/**
 * Gmail OAuth Callback
 * Handles the return from Gmail OAuth flow.
 * Validates the state parameter against a stored cookie
 * to prevent CSRF and account hijacking attacks.
 * The authenticated user is identified via JWT session, not the URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForTokens } from '@/lib/gmail';
import { encryptJson } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('[Gmail Callback] Error:', error);
      return NextResponse.redirect(
        new URL('/settings/integrations?error=gmail_auth_failed', request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=invalid_params', request.url)
      );
    }

    // --- CSRF / State Validation ---
    // The state token is a random value we stored in a cookie during /authorize
    // We compare the returned state against the cookie to prevent CSRF attacks.
    const storedState = request.cookies.get('gmail_oauth_state')?.value;
    const storedUserId = request.cookies.get('gmail_oauth_userId')?.value;

    if (!storedState || !storedUserId) {
      console.error('[Gmail Callback] Missing state cookie — possible CSRF attempt');
      return NextResponse.redirect(
        new URL('/settings/integrations?error=invalid_state', request.url)
      );
    }

    // Constant-time comparison to prevent timing attacks
    if (state.length !== storedState.length ||
        !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(storedState))) {
      console.error('[Gmail Callback] State mismatch — possible CSRF attempt');
      return NextResponse.redirect(
        new URL('/settings/integrations?error=invalid_state', request.url)
      );
    }

    // --- User Authentication ---
    // Identify the user from their authenticated JWT session, not from the URL.
    // This prevents an attacker from associating their Gmail with a victim's account.
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Fall back to the stored userId cookie if session is not available
    // (the cookie was set by the /authorize endpoint which already authenticated)
    const userId = token?.id as string || storedUserId;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=user_not_found', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=token_exchange_failed', request.url)
      );
    }

    // Store or update integration
    await prisma.userIntegration.upsert({
      where: {
        userId_type: {
          userId: user.id,
          type: 'GMAIL',
        },
      },
      create: {
        userId: user.id,
        type: 'GMAIL',
        status: 'ACTIVE',
        tokens: encryptJson(tokens) as never,
        expiresAt: new Date(tokens.expiresAt),
      },
      update: {
        status: 'ACTIVE',
        tokens: encryptJson(tokens) as never,
        expiresAt: new Date(tokens.expiresAt),
        updatedAt: new Date(),
      },
    });

    // Clean up state cookies
    const response = NextResponse.redirect(
      new URL('/settings/integrations?success=gmail_connected', request.url)
    );
    response.cookies.delete('gmail_oauth_state');
    response.cookies.delete('gmail_oauth_userId');

    return response;
  } catch (error) {
    console.error('[Gmail Callback] Error:', error);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=unknown', request.url)
    );
  }
}


