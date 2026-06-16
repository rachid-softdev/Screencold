import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/session
 *
 * Returns the current server session as JSON.
 * Client components can call this endpoint to get session data
 * without using the NextAuth SessionProvider (e.g., via useServerSession hook).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    return NextResponse.json(session ?? { user: null });
  } catch (error) {
    console.error("[API /auth/session] Error fetching session:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
