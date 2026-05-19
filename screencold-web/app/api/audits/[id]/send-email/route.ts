import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';
import { sendEmail as sendResendEmail } from '@/lib/email';
import { sendEmail as sendGmailEmail, isGmailConnected } from '@/lib/gmail';

// ============================================
// Validation Schema
// ============================================

const sendEmailSchema = z.object({
  to: z.string().email('Email invalide'),
  subject: z.string().min(1, 'Sujet requis'),
  body: z.string().min(1, 'Corps du message requis'),
  ps: z.string().optional(),
  useGmail: z.boolean().optional().default(false),
});

// ============================================
// POST /api/audits/[id]/send-email - Send outreach email to prospect
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { id } = await params;

    // Verify audit ownership
    const audit = await prisma.audit.findUnique({
      where: { id },
      include: {
        prospect: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Audit non trouvé' },
        { status: 404 }
      );
    }

    if (audit.userId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n\'avez pas accès à cet audit' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validationResult = sendEmailSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { to, subject, body: emailBody, ps, useGmail } = validationResult.data;

    // Build full email content
    const fullBody = ps ? `${emailBody}\n\n${ps}` : emailBody;

    // Determine which email service to use
    const gmailConnected = await isGmailConnected(userId);
    const shouldUseGmail = useGmail && gmailConnected;

    let result;
    let emailService: 'gmail' | 'resend' = 'resend';

    if (shouldUseGmail) {
      // Try Gmail first if requested and connected
      emailService = 'gmail';
      result = await sendGmailEmail(userId, {
        to,
        subject,
        body: fullBody,
        htmlBody: `<pre style="white-space: pre-wrap; font-family: system-ui, sans-serif;">${fullBody}</pre>`,
        fromName: audit.user.name || undefined,
      });

      // Fallback to Resend if Gmail failed
      if (!result.success) {
        console.warn('[SendEmail] Gmail failed, falling back to Resend:', result.error);
        result = await sendResendEmail({
          to,
          subject,
          html: `<pre style="white-space: pre-wrap; font-family: system-ui, sans-serif;">${fullBody}</pre>`,
          text: fullBody,
        });
        emailService = 'resend';
      }
    } else {
      // Use Resend
      result = await sendResendEmail({
        to,
        subject,
        html: `<pre style="white-space: pre-wrap; font-family: system-ui, sans-serif;">${fullBody}</pre>`,
        text: fullBody,
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: 'EMAIL_FAILED', message: result.error || 'Échec de l\'envoi de l\'email' },
        { status: 500 }
      );
    }

    // Store in sent emails table
    await prisma.sentEmail.create({
      data: {
        auditId: audit.id,
        userId: userId,
        to,
        subject,
        body: fullBody,
        status: 'SENT',
        messageId: result.messageId,
        sentAt: new Date(),
      },
    });

    console.log(`[Email] Sent outreach email to ${to} for audit ${id} via ${emailService}`);

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
      recipient: to,
      service: emailService,
    });
  } catch (error) {
    console.error('[SendEmail] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}