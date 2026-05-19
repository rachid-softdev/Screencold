import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Email invalide' },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        { message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation' },
        { status: 200 }
      );
    }

    // Check if user has a password (OAuth users can't reset password)
    if (!user.password) {
      return NextResponse.json(
        { message: 'Ce compte utilise Google pour la connexion. Veuillez vous connecter avec Google.' },
        { status: 400 }
      );
    }

    // Create reset token
    const resetToken = await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token: crypto.randomUUID(),
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send reset email with Resend
    // For now, return success
    console.log('[Forgot Password] Reset token created:', resetToken.token);

    return NextResponse.json(
      { message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Forgot Password] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}