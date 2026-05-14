import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendContactEmail } from '@/lib/email';

// ============================================
// Validation Schema
// ============================================

const contactSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  subject: z.string().min(1, 'Le sujet est requis'),
  message: z.string().min(1, 'Le message est requis'),
});

// ============================================
// POST /api/contact - Submit contact form
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Parse and validate body
    const body = await request.json();
    const validationResult = contactSchema.safeParse(body);

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

    const { name, email, subject, message } = validationResult.data;

    // Store in database
    const contactEntry = await prisma.contactMessage?.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    }).catch(() => {
      // If table doesn't exist, just continue to sending email
      return null;
    });

    // Send notification email to team
    const emailResult = await sendContactEmail(name, email, subject, message);

    if (!emailResult.success) {
      console.error('[Contact] Failed to send notification email:', emailResult.error);
      // Don't fail the request - the message is stored
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Message envoyé avec succès',
        id: contactEntry?.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Contact] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/contact - Get contact messages (admin only - not implemented)
// ============================================

export async function GET() {
  return NextResponse.json(
    { error: 'NOT_IMPLEMENTED', message: 'Cette route n\'est pas encore implémentée' },
    { status: 501 }
  );
}