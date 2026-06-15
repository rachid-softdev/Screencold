/**
 * Accept Team Invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    const { token } = await params;

    // Find invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'EXPIRED', message: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Verify email matches
    if (invitation.email !== session.user.email) {
      return NextResponse.json(
        { error: 'EMAIL_MISMATCH', message: 'This invitation was sent to a different email' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: invitation.teamId,
        userId: user.id,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'ALREADY_MEMBER', message: 'You are already a member of this team' },
        { status: 400 }
      );
    }

    // Create membership
    await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId: user.id,
        role: invitation.role,
      },
    });

    // Delete invitation
    await prisma.teamInvitation.delete({
      where: { id: invitation.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Accept Invitation] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}