import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

// ============================================
// Validation Schemas
// ============================================

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').optional(),
  image: z.string().url().optional().or(z.literal('')),
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

    // In a real app, you'd want to require a confirmation or password
    // For now, we'll just delete the user (cascade will handle related data)
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