import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

export async function GET(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('[Notifications] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    } else if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId, userId },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notifications] PATCH error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}