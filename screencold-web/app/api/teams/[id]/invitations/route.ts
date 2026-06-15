import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';
import { getMaxTeamMembers } from '@/lib/plans';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

// POST /api/teams/[id]/invitations - Invite a member to the team
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

    const { id: teamId } = await params;
    const body = await request.json();
    const validationResult = inviteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;

    // Verify team ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true, plan: true },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    if (team.ownerId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You are not the team owner' },
        { status: 403 }
      );
    }

    // Check team member limit based on plan
    const maxMembers = getMaxTeamMembers(team.plan);
    const currentMemberCount = await prisma.teamMember.count({
      where: { teamId },
    });

    if (maxMembers !== -1 && currentMemberCount >= maxMembers) {
      return NextResponse.json(
        { 
          error: 'PLAN_LIMIT', 
          message: `Limite de membres atteinte (${maxMembers}). Mettez à niveau votre plan pour ajouter plus de membres.`,
          currentLimit: maxMembers,
        },
        { status: 403 }
      );
    }

    // Check if user already has pending invitation
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: { teamId, email, expiresAt: { gt: new Date() } },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'INVITATION_EXISTS', message: 'Une invitation est déjà en attente pour cet email' },
        { status: 400 }
      );
    }

    // Create invitation token
    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        email,
        role: role || 'MEMBER',
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // TODO: Send invitation email (using sendEmail service)

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Team Invitations] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// GET /api/teams/[id]/invitations - List pending invitations
export async function GET(
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

    const { id: teamId } = await params;

    // Verify team ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true },
    });

    if (!team || team.ownerId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Access denied' },
        { status: 403 }
      );
    }

    const invitations = await prisma.teamInvitation.findMany({
      where: { teamId, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('[Team Invitations] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}