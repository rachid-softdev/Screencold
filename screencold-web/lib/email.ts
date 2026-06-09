import { Resend } from 'resend';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ module: 'email' });

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Operation timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Operation timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ============================================
// HTML Entity Encoding
// ============================================

/**
 * Escape user-controlled strings for safe HTML interpolation.
 * Prevents HTML injection / XSS attacks when embedding user
 * input into email HTML templates.
 *
 * Encodes: & < > " '
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================
// Email Sending
// ============================================

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const resend = getResend();
  if (!resend) {
    logger.warn('RESEND_API_KEY not configured, email not sent');
    return { success: false, error: 'Email service not configured' };
  }
  try {
    const result = await withTimeout(
      (signal) => resend.emails.send({
        from: process.env.FROM_EMAIL || 'ScreenCold <noreply@screencold.com>',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
      30_000
    );

    return { success: true, data: result };
  } catch (error) {
    logger.error({ error }, 'Failed to send email');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendContactEmail(
  name: string,
  email: string,
  subject: string,
  message: string
) {
  // ?? SECURITY: All user-controlled values MUST be escaped before
  // interpolating into HTML templates to prevent HTML injection/XSS.
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #2563eb;">Nouveau message de contact</h2>
        
        <p><strong>Nom:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Sujet:</strong> ${safeSubject}</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <h3 style="margin-top: 0;">Message:</h3>
        <p style="white-space: pre-wrap;">${safeMessage}</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: process.env.CONTACT_EMAIL || 'support@screencold.com',
    subject: `[Contact] ${safeSubject} - de ${safeEmail}`,
    html,
  });
}
