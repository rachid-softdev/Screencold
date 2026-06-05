import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
});

// GET /api/teams - List user's teams
export async function GET(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    // Get teams where user is owner or member
    const [ownedTeams, memberTeams] = await Promise.all([
      prisma.team.findMany({
        where: { ownerId: userId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teamMember.findMany({
        where: { userId },
        include: {
          team: {
            include: {
              owner: { select: { id: true, name: true, email: true } },
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true, image: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      ownedTeams,
      memberTeams: memberTeams.map((m) => ({ ...m.team, role: m.role })),
    });
  } catch (error) {
    console.error('[Teams] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const body = await request.json();
    const validationResult = createTeamSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;

    // Get user's plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        ownerId: userId,
        plan: user?.plan ?? 'FREE',
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: true,
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('[Teams] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/teams/join - Join team via invitation token
export async function PUT(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const body = await request.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json(
        { error: 'MISSING_TOKEN', message: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Find invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: { team: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'EXPIRED_TOKEN', message: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: { teamId: invitation.teamId, userId },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'ALREADY_MEMBER', message: 'You are already a member of this team' },
        { status: 400 }
      );
    }

    // Add member
    await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId,
        role: invitation.role,
      },
    });

    // Delete invitation
    await prisma.teamInvitation.delete({
      where: { id: invitation.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Teams] PUT (join) error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}