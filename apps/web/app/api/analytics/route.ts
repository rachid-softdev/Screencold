import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, properties, timestamp, url } = body;

    if (!event) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      );
    }

    // Log analytics event (in production, send to PostHog/Plausible/etc.)
    console.log('[Analytics]', {
      event,
      properties,
      timestamp,
      url,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Analytics should never fail the app
    console.error('[Analytics] Error:', error);
    return NextResponse.json({ success: true });
  }
}
