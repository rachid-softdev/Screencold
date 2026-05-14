import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';
import { sendEmail } from '@/lib/email';

// ============================================
// Validation Schema
// ============================================

const sendEmailSchema = z.object({
  to: z.string().email('Email invalide'),
  subject: z.string().min(1, 'Sujet requis'),
  body: z.string().min(1, 'Corps du message requis'),
  ps: z.string().optional(),
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

    const { to, subject, body: emailBody, ps } = validationResult.data;

    // Build full email content
    const fullBody = ps ? `${emailBody}\n\n${ps}` : emailBody;

    // Send the email
    const result = await sendEmail({
      to,
      subject,
      html: `<pre style="white-space: pre-wrap; font-family: system-ui, sans-serif;">${fullBody}</pre>`,
      text: fullBody,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'EMAIL_FAILED', message: result.error || 'Échec de l\'envoi de l\'email' },
        { status: 500 }
      );
    }

    // Log the send (in production, you'd store this in a tracking table)
    console.log(`[Email] Sent outreach email to ${to} for audit ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
      recipient: to,
    });
  } catch (error) {
    console.error('[SendEmail] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}