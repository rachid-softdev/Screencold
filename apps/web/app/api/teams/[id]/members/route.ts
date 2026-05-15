import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

// GET /api/teams/:id/members - List team members
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

    // Check if user is owner or admin
    const team = await prisma.team.findFirst({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    const isOwner = team.ownerId === userId;
    const membership = team.members.find((m) => m.userId === userId);
    const isAdmin = isOwner || membership?.role === 'ADMIN';

    if (!isOwner && !membership) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You are not a member of this team' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      members: team.members,
      isOwner,
      isAdmin,
    });
  } catch (error) {
    console.error('[Team Members] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/teams/:id/members - Invite a new member
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
        { error: 'VALIDATION_ERROR', message: 'Invalid data' },
        { status: 400 }
      );
    }

    const { email, role = 'MEMBER' } = validationResult.data;

    // Check ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.ownerId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Only the owner can invite members' },
        { status: 403 }
      );
    }

    // Check if user already exists and is already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.teamMember.findFirst({
        where: { teamId, userId: existingUser.id },
      });
      if (existingMember) {
        return NextResponse.json(
          { error: 'ALREADY_MEMBER', message: 'User is already a member' },
          { status: 400 }
        );
      }
    }

    // Create invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        email,
        role: role as any,
        token,
        expiresAt,
      },
    });

    // TODO: Send invitation email

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
        invitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/teams/join?token=${token}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Team Members] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/:id/members - Remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { id: teamId, userId: memberUserId } = await params;

    // Check ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.ownerId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Only the owner can remove members' },
        { status: 403 }
      );
    }

    // Cannot remove yourself (owner)
    if (memberUserId === userId) {
      return NextResponse.json(
        { error: 'INVALID_ACTION', message: 'Owner cannot be removed' },
        { status: 400 }
      );
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: memberUserId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Team Members] DELETE error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/:id/members - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { id: teamId, userId: targetUserId } = await params;
    const body = await request.json();
    const { role } = body;

    // Check ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.ownerId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Only the owner can change roles' },
        { status: 403 }
      );
    }

    await prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
      data: { role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Team Members] PATCH error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}