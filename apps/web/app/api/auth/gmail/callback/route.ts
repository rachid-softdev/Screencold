/**
 * Gmail OAuth Callback
 * Handles the return from Gmail OAuth flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForTokens } from '@/lib/gmail';

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

    // Verify state contains user ID
    const [userId, expectedState] = state.split(':');
    if (!userId || !expectedState) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=invalid_state', request.url)
      );
    }

    // Verify user exists and owns this request
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
        tokens: tokens as never,
        expiresAt: new Date(tokens.expiresAt),
      },
      update: {
        status: 'ACTIVE',
        tokens: tokens as never,
        expiresAt: new Date(tokens.expiresAt),
        updatedAt: new Date(),
      },
    });

    // Redirect to integrations page with success
    return NextResponse.redirect(
      new URL('/settings/integrations?success=gmail_connected', request.url)
    );
  } catch (error) {
    console.error('[Gmail Callback] Error:', error);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=unknown', request.url)
    );
  }
}