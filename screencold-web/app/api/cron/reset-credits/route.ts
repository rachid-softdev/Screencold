import { NextRequest, NextResponse } from "next/server";
import { resetCreditsForAllPlans } from "@/lib/credits";

/**
 * POST /api/cron/reset-credits
 *
 * Resets credits for all users whose monthly credit period has lapsed.
 * Protected by CRON_SECRET — accepts the secret via:
 *   - Authorization: Bearer <secret>
 *   - x-cron-secret: <secret>
 *
 * Returns: { reset: number, skipped: number }
 */
export async function POST(request: NextRequest) {
  // 1. Validate CRON_SECRET from environment
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON not configured" },
      { status: 500 }
    );
  }

  // 2. Check auth header
  const authHeader = request.headers.get("authorization");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const providedSecret =
    authHeader?.replace("Bearer ", "") ?? cronSecretHeader;

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing CRON_SECRET" },
      { status: 401 }
    );
  }

  // 3. Execute credit reset
  try {
    const result = await resetCreditsForAllPlans();

    return NextResponse.json({
      success: true,
      reset: result.reset,
      skipped: result.skipped,
      message: `Credits reset for ${result.reset} users (${result.skipped} skipped)`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Reset failed", message },
      { status: 500 }
    );
  }
}
