/**
 * Cursor-based Pagination Utilities
 *
 * Provides helper functions for implementing cursor-based pagination
 * across API endpoints using Prisma's cursor-based pagination.
 */

export interface PaginationParams {
  cursor?: string;
  limit: number;
}

export interface PaginationResult {
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parses cursor and limit from URL search params.
 * Limit is clamped between 1 and MAX_LIMIT inclusive.
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
): PaginationParams {
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  return { cursor, limit };
}

/**
 * Builds the response for cursor-based pagination.
 *
 * Expects `items` to have length of `limit + 1` (one extra fetched to
 * determine whether more records exist).  Returns the trimmed data array
 * together with pagination metadata.
 */
export function paginatedResponse<T extends { id: string }>(
  items: T[],
  limit: number,
): { data: T[]; pagination: PaginationResult } {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

  return {
    data,
    pagination: {
      hasMore,
      nextCursor,
      limit,
    },
  };
}
