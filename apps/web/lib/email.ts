import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'ScreenCold <noreply@screencold.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendContactEmail(
  name: string,
  email: string,
  subject: string,
  message: string
) {
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
        
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Sujet:</strong> ${subject}</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <h3 style="margin-top: 0;">Message:</h3>
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: process.env.CONTACT_EMAIL || 'support@screencold.com',
    subject: `[Contact] ${subject} - de ${email}`,
    html,
  });
}