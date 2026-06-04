import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

// ============================================
// Validation Schemas
// ============================================

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').optional(),
  image: z.string().url().optional().or(z.literal('')),
});

const deleteAccountSchema = z.object({
  password: z.string().optional(), // Required for password-based accounts
  deletionCode: z.string().optional(), // Required for OAuth-only accounts
});

// ============================================
// GET /api/user/profile - Get current user profile
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { authorized, userId, user, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        plan: true,
        credits: true,
        creditsResetsAt: true,
        createdAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    // Get credits used this month
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const usedCredits = await prisma.creditTransaction.aggregate({
      where: {
        userId,
        createdAt: { gte: thisMonthStart },
        type: 'DEBIT',
      },
      _sum: { amount: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...profile,
      creditsUsed: usedCredits._sum.amount || 0,
    });
  } catch (error) {
    console.error('[Profile] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/user/profile - Update current user profile
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);

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

    const { name, image } = validationResult.data;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (image !== undefined) updateData.image = image || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'NO_UPDATE', message: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Profile] PATCH error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/user/profile - Delete account
// Requires password confirmation (or deletion code for OAuth-only accounts)
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    // Fetch user to check if they have a password or are OAuth-only
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
      },
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const validationResult = deleteAccountSchema.safeParse(body);

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

    const { password, deletionCode } = validationResult.data;

    // --- Password-based accounts ---
    if (userRecord.password) {
      // Password is required for password-based accounts
      if (!password) {
        return NextResponse.json(
          {
            error: 'PASSWORD_REQUIRED',
            message: 'Veuillez fournir votre mot de passe pour supprimer votre compte',
          },
          { status: 400 }
        );
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, userRecord.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'WRONG_PASSWORD', message: 'Mot de passe incorrect' },
          { status: 403 }
        );
      }
    }
    // --- OAuth-only accounts (no password) ---
    else {
      // Require a deletion code (sent via email)
      // The client should first call a separate endpoint to request a deletion code,
      // then use that code here.
      if (!deletionCode) {
        // Instead of immediately deleting, send a confirmation code to the user's email
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        const hash = crypto.createHash('sha256').update(code).digest('hex');

        // Store the deletion code hash temporarily (expires in 15 minutes)
        await prisma.auditEvent.create({
          data: {
            userId: userRecord.id,
            action: 'ACCOUNT_DELETE',
            resource: 'user',
            details: {
              type: 'deletion_code_requested',
              codeHash: hash,
              expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          },
        });

        // Send the code via email
        await sendEmail({
          to: userRecord.email,
          subject: 'Code de confirmation - Suppression de compte ScreenCold',
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: sans-serif; padding: 20px;">
              <h2>Confirmation de suppression de compte</h2>
              <p>Bonjour ${userRecord.name || 'utilisateur'},</p>
              <p>Vous avez demandé la suppression de votre compte ScreenCold.</p>
              <p>Votre code de confirmation est:</p>
              <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; margin: 20px 0;">
                ${code}
              </div>
              <p>Ce code expire dans 15 minutes.</p>
              <p>Si vous n'avez pas demandé cette suppression, ignorez cet email.</p>
            </body>
            </html>
          `,
        });

        return NextResponse.json(
          {
            error: 'DELETION_CODE_REQUIRED',
            message: 'Un code de confirmation a été envoyé à votre email',
            codeSent: true,
          },
          { status: 202 }
        );
      }

      // Verify the deletion code
      // For simplicity, we verify the code was recently sent by checking the audit log
      const recentRequest = await prisma.auditEvent.findFirst({
        where: {
          userId: userRecord.id,
          action: 'ACCOUNT_DELETE',
          details: {
            path: ['type'],
            equals: 'deletion_code_requested',
          },
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!recentRequest) {
        return NextResponse.json(
          {
            error: 'NO_DELETION_REQUEST',
            message: 'Aucune demande de suppression récente. Veuillez réessayer.',
          },
          { status: 400 }
        );
      }

      // Verify the code hash
      const expectedHash = crypto.createHash('sha256').update(deletionCode).digest('hex');
      const details = recentRequest.details as any;
      if (details?.codeHash !== expectedHash) {
        return NextResponse.json(
          { error: 'INVALID_CODE', message: 'Code de confirmation invalide' },
          { status: 403 }
        );
      }
    }

    // --- Proceed with account deletion ---
    // Delete user (cascade will handle related data)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Compte supprimé avec succès',
    });
  } catch (error) {
    console.error('[Profile] DELETE error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
