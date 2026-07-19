import { NextRequest } from "next/server";

export interface CursorParams {
  take: number;
  skip?: number;
  cursor?: { id: string };
}

/**
 * Parse cursor-based pagination params from a request.
 *
 * Supported query params (all optional, backward compatible):
 *   - `limit`  : page size (default 50, capped at `maxLimit`)
 *   - `cursor` : last item id from the previous page (keyset pagination)
 *   - `page`   : 1-based offset page (fallback for offset-based clients)
 *
 * Uses keyset (cursor) pagination over `id` to avoid the OFFSET scan cost that
 * makes `findMany` without limits OOM / time out on large tables.
 */
export function getCursorParams(
  req: NextRequest,
  defaultLimit = 50,
  maxLimit = 200
): CursorParams {
  const sp = req.nextUrl.searchParams;

  const rawLimit = sp.get("limit");
  let take = defaultLimit;
  if (rawLimit) {
    const parsed = parseInt(rawLimit, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      take = Math.min(parsed, maxLimit);
    }
  }

  const cursor = sp.get("cursor");
  const rawPage = sp.get("page");

  if (cursor) {
    return { take, cursor: { id: cursor } };
  }

  if (rawPage) {
    const page = parseInt(rawPage, 10);
    if (!Number.isNaN(page) && page > 1) {
      return { take, skip: (page - 1) * take };
    }
  }

  return { take };
}

/**
 * Safely cap an unbounded `findMany` result set to prevent full-table scans /
 * OOM on large tables. Use when the caller does not otherwise paginate.
 */
export function boundedTake(limit = 100, max = 500): number {
  return Math.min(Math.max(limit, 1), max);
}
