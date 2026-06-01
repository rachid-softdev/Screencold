/**
 * Gmail API Integration Service
 * Handles OAuth2 flow and sending emails via Gmail API
 */

import { prisma } from './prisma';
import { decryptJson, encryptJson } from './encryption';

// ============================================
// Types
// ============================================

export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  fromName?: string;
  replyTo?: string;
}

// ============================================
// Gmail OAuth Configuration
// ============================================

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/gmail/callback';

export function getGmailAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ============================================
// Token Exchange
// ============================================

export async function exchangeCodeForTokens(code: string): Promise<GmailTokens | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        redirect_uri: GMAIL_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      console.error('[Gmail] Token exchange failed:', await response.text());
      return null;
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };
  } catch (error) {
    console.error('[Gmail] Token exchange error:', error);
    return null;
  }
}

// ============================================
// Refresh Token
// ============================================

export async function refreshAccessToken(refreshToken: string): Promise<GmailTokens | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('[Gmail] Token refresh failed:', await response.text());
      return null;
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken, // Keep the same refresh token
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope || '',
    };
  } catch (error) {
    console.error('[Gmail] Token refresh error:', error);
    return null;
  }
}

// ============================================
// Get Valid Access Token
// ============================================

async function getValidAccessToken(userId: string): Promise<string | null> {
  const integration = await prisma.userIntegration.findUnique({
    where: { userId_type: { userId, type: 'GMAIL' } },
  });

  if (!integration) {
    return null;
  }

  const tokens = decryptJson<GmailTokens>(integration.tokens);

  // Check if token is expired
  if (tokens.expiresAt < Date.now()) {
    // Refresh token
    const newTokens = await refreshAccessToken(tokens.refreshToken);

    if (!newTokens) {
      // Refresh failed, delete integration
      await prisma.userIntegration.delete({
        where: { id: integration.id },
      });
      return null;
    }

    // Update stored tokens
    await prisma.userIntegration.update({
      where: { id: integration.id },
      data: { tokens: encryptJson(newTokens) as never },
    });

    return newTokens.accessToken;
  }

  return tokens.accessToken;
}

// ============================================
// Send Email via Gmail API
// ============================================

export async function sendEmail(userId: string, options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const accessToken = await getValidAccessToken(userId);

  if (!accessToken) {
    return { success: false, error: 'Gmail not connected. Please connect your Gmail account in settings.' };
  }

  const { to, subject, body, htmlBody, fromName, replyTo } = options;

  // Create email message
  const message = createEmailMessage({
    to,
    subject,
    body,
    htmlBody,
    fromName,
    replyTo,
  });

  try {
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: message }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gmail] Send failed:', errorText);

      // If 401, try to refresh and retry once
      if (response.status === 401) {
        // Force refresh by deleting integration
        await prisma.userIntegration.deleteMany({
          where: { userId, type: 'GMAIL' },
        });
        return { success: false, error: 'Gmail connection expired. Please reconnect in settings.' };
      }

      return { success: false, error: 'Failed to send email via Gmail API' };
    }

    const result = await response.json();

    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('[Gmail] Send error:', error);
    return { success: false, error: 'An error occurred while sending email' };
  }
}

// ============================================
// Create Email Message (RFC 2822)
// ============================================

function createEmailMessage(options: {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  fromName?: string;
  replyTo?: string;
}): string {
  const { to, subject, body, htmlBody, fromName, replyTo } = options;

  const lines: string[] = [];

  // From header
  lines.push(`From: ${fromName || 'ScreenCold'} <me>`);
  lines.push(`To: ${to}`);
  lines.push(`Subject: ${subject}`);

  if (replyTo) {
    lines.push(`Reply-To: ${replyTo}`);
  }

  // Create multipart message if HTML provided
  if (htmlBody) {
    const boundary = '----=_Part_' + Math.random().toString(36).substring(2);

    lines.push('Content-Type: multipart/alternative; boundary="' + boundary + '"');
    lines.push('');
    lines.push('--' + boundary);
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('');
    lines.push(body);
    lines.push('');
    lines.push('--' + boundary);
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('');
    lines.push(htmlBody);
    lines.push('');
    lines.push('--' + boundary + '--');
  } else {
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('');
    lines.push(body);
  }

  // Convert to base64url
  const message = lines.join('\r\n');
  return Buffer.from(message, 'utf-8')
    .toString('base64url')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ============================================
// Check if user has Gmail connected
// ============================================

export async function isGmailConnected(userId: string): Promise<boolean> {
  const integration = await prisma.userIntegration.findUnique({
    where: { userId_type: { userId, type: 'GMAIL' } },
  });

  if (!integration) {
    return false;
  }

  const tokens = decryptJson<GmailTokens>(integration.tokens);

  // Check if token is expired and try to refresh
  if (tokens.expiresAt < Date.now()) {
    const newTokens = await refreshAccessToken(tokens.refreshToken);

    if (!newTokens) {
      await prisma.userIntegration.delete({ where: { id: integration.id } });
      return false;
    }

    await prisma.userIntegration.update({
      where: { id: integration.id },
      data: { tokens: encryptJson(newTokens) as never },
    });
  }

  return true;
}

