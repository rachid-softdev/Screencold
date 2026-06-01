import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Execute an async operation with a timeout using AbortController.
 */
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

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const result = await withTimeout(
      (signal) =>
        resend.emails.send({
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
    console.error('[Email] Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendWelcomeEmail(to: string, name: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb;">Bienvenue sur ScreenCold !</h1>
      </div>
      
      <p>Bonjour ${name},</p>
      
      <p>Merci d'avoir créé votre compte ScreenCold ! Nous sommes ravis de vous avoir parmi nous.</p>
      
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="margin-top: 0; font-size: 18px;">🚀 Commencez en 3 étapes</h2>
        <ol style="padding-left: 20px;">
          <li>Connectez-vous à votre tableau de bord</li>
          <li>Entrez l'URL du site que vous souhaitez auditer</li>
          <li>Recevez votre rapport détaillé et votre email de prospection</li>
        </ol>
      </div>
      
      <p>Vous avez <strong>5 crédits gratuits</strong> pour tester notre service. Chaque audit consomme 1 crédit.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://screencold.com'}/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Commencer maintenant</a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="font-size: 14px; color: #6b7280;">
        Des questions ? Reply to this email or contact us at support@screencold.com<br>
        © 2024 ScreenCold. Tous droits réservés.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Bienvenue sur ScreenCold ! 🎉',
    html,
  });
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://screencold.com'}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb;">Réinitialisation de votre mot de passe</h1>
      </div>
      
      <p>Bonjour,</p>
      
      <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Réinitialiser mon mot de passe</a>
      </div>
      
      <p style="background: #fef3c7; padding: 12px; border-radius: 6px; font-size: 14px;">
        ⚠️ Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
      </p>
      
      <p style="font-size: 14px; color: #6b7280;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        ${resetUrl}
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="font-size: 14px; color: #6b7280;">
        © 2024 ScreenCold. Tous droits réservés.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Réinitialisation de votre mot de passe - ScreenCold',
    html,
  });
}

export async function sendAuditCompleteEmail(to: string, companyName: string, score: number) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb;">Audit terminé !</h1>
      </div>
      
      <p>Bonjour,</p>
      
      <p>Votre audit pour <strong>${companyName}</strong> est maintenant terminé.</p>
      
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Score global</p>
        <p style="margin: 10px 0 0; font-size: 48px; font-weight: bold; color: ${score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'};">${score}/100</p>
      </div>
      
      <p>Connectez-vous à votre tableau de bord pour voir le rapport complet et récupérer votre email de prospection personnalisé.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://screencold.com'}/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Voir le rapport</a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="font-size: 14px; color: #6b7280;">
        © 2024 ScreenCold. Tous droits réservés.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Audit terminé pour ${companyName} - Score: ${score}/100`,
    html,
  });
}

export async function sendLowCreditsEmail(to: string, creditsRemaining: number) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #f59e0b;">⚠️ Crédits faibles</h1>
      </div>
      
      <p>Bonjour,</p>
      
      <p>Il ne vous reste que <strong>${creditsRemaining} crédit${creditsRemaining > 1 ? 's' : ''}</strong>. Vous risquez de ne pas pouvoir effectuer nouveaux audits.</p>
      
      <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0;">💡 Vous pouvez :</p>
        <ul style="margin: 10px 0 0; padding-left: 20px;">
          <li>Passer à un plan supérieur pour plus de crédits</li>
          <li>Acheter des crédits supplémentaires</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://screencold.com'}/pricing" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Voir les plans</a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="font-size: 14px; color: #6b7280;">
        © 2024 ScreenCold. Tous droits réservés.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Vos crédits ScreenCold sont presque épuisés',
    html,
  });
}