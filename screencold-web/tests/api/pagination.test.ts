/**
 * Pagination Utility Tests
 *
 * Covers the shared cursor-based pagination helpers:
 * - parsePaginationParams – parse and clamp cursor/limit from URLSearchParams
 * - paginatedResponse – build the standard paginated envelope
 *
 * Run:  npx vitest run screencold-web/tests/api/pagination.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parsePaginationParams, paginatedResponse } from '@/lib/pagination';

// ============================================
// parsePaginationParams
// ============================================

describe('parsePaginationParams', () => {
  it('should return default limit when no limit specified', () => {
    const params = new URLSearchParams();
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(20);
    expect(result.cursor).toBeUndefined();
  });

  it('should return the provided limit', () => {
    const params = new URLSearchParams('limit=10');
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(10);
  });

  it('should cap limit at 100', () => {
    const params = new URLSearchParams('limit=999');
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(100);
  });

  it('should floor limit at 1 for negative values', () => {
    const params = new URLSearchParams('limit=-5');
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(1);
  });

  it('should accept cursor parameter', () => {
    const params = new URLSearchParams('cursor=abc-123');
    const result = parsePaginationParams(params);
    expect(result.cursor).toBe('abc-123');
    expect(result.limit).toBe(20);
  });

  it('should combine cursor and custom limit', () => {
    const params = new URLSearchParams('cursor=cursor-1&limit=5');
    const result = parsePaginationParams(params);
    expect(result.cursor).toBe('cursor-1');
    expect(result.limit).toBe(5);
  });

  it('should handle missing cursor as undefined', () => {
    const params = new URLSearchParams('limit=50');
    const result = parsePaginationParams(params);
    expect(result.cursor).toBeUndefined();
  });
});

// ============================================
// paginatedResponse
// ============================================

describe('paginatedResponse', () => {
  it('should return correct subset when items fit within limit', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const result = paginatedResponse(items, 5);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('a');
    expect(result.data[1].id).toBe('b');
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
    expect(result.pagination.limit).toBe(5);
  });

  it('should detect hasMore when more items than limit (over-fetch by 1)', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const result = paginatedResponse(items, 2);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('a');
    expect(result.data[1].id).toBe('b');
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextCursor).toBe('b');
  });

  it('should set nextCursor to last item id when hasMore', () => {
    const items = [
      { id: 'cursor-1' },
      { id: 'cursor-2' },
      { id: 'cursor-3' },
    ];
    const result = paginatedResponse(items, 2);

    expect(result.pagination.nextCursor).toBe('cursor-2');
    expect(result.pagination.hasMore).toBe(true);
  });

  it('should return empty data and hasMore false for empty input', () => {
    const result = paginatedResponse([], 20);

    expect(result.data).toEqual([]);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
    expect(result.pagination.limit).toBe(20);
  });

  it('should handle exactly limit items (no next page)', () => {
    const items = [{ id: 'x' }, { id: 'y' }];
    const result = paginatedResponse(items, 2);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
  });

  it('should handle exactly limit + 1 items (one more page)', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const result = paginatedResponse(items, 2);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextCursor).toBe('b');
  });

  it('should work with single item and limit of 1', () => {
    const result = paginatedResponse([{ id: 'only' }], 1);
    expect(result.data).toHaveLength(1);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
  });
});
