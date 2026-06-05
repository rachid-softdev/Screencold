/**
 * Correlation ID Tests
 *
 * Covers:
 * - Correlation ID is present and accessible within a context
 * - Different concurrent contexts have different IDs
 * - Async operations propagate the ID correctly
 * - Default fallback when no context is active
 *
 * Run:  npx vitest run screencold-web/tests/lib/correlation-id.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  generateCorrelationId,
  getCorrelationId,
  setCorrelationId,
  runWithCorrelationId,
} from '@/lib/correlation-id';

describe('correlation-id', () => {
  describe('generateCorrelationId', () => {
    it('should return a UUID v4 string', () => {
      const id = generateCorrelationId();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should return unique IDs on each call', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('getCorrelationId (no context)', () => {
    it('should return undefined when called outside a context', () => {
      const id = getCorrelationId();
      expect(id).toBeUndefined();
    });
  });

  describe('runWithCorrelationId', () => {
    it('should make correlation ID accessible inside the context', () => {
      const testId = 'test-correlation-abc-123';

      runWithCorrelationId(testId, () => {
        const retrieved = getCorrelationId();
        expect(retrieved).toBe(testId);
      });
    });

    it('should return the value from the function', () => {
      const result = runWithCorrelationId('some-id', () => 42);
      expect(result).toBe(42);
    });

    it('should propagate through async operations', async () => {
      const testId = 'async-test-id';

      const result = await runWithCorrelationId(testId, async () => {
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 5));
        return getCorrelationId();
      });

      expect(result).toBe(testId);
    });

    it('should propagate through deeply nested async calls', async () => {
      const testId = 'deeply-nested';

      const result = await runWithCorrelationId(testId, async () => {
        const level1 = getCorrelationId();

        await new Promise((resolve) => setTimeout(resolve, 2));

        const innerResult = await (async () => {
          await new Promise((resolve) => setTimeout(resolve, 2));
          const level2 = getCorrelationId();

          return { level1, level2 };
        })();

        const afterAwait = getCorrelationId();

        return { ...innerResult, afterAwait };
      });

      expect(result.level1).toBe(testId);
      expect(result.level2).toBe(testId);
      expect(result.afterAwait).toBe(testId);
    });

    it('should restore the previous context when the function completes', () => {
      const outerId = 'outer-id';

      runWithCorrelationId(outerId, () => {
        expect(getCorrelationId()).toBe(outerId);

        runWithCorrelationId('inner-id', () => {
          expect(getCorrelationId()).toBe('inner-id');
        });

        // After inner completes, we should be back to outer
        expect(getCorrelationId()).toBe(outerId);
      });
    });
  });

  describe('concurrent contexts', () => {
    it('should keep different correlation IDs for concurrent operations', async () => {
      const idA = 'concurrent-a';
      const idB = 'concurrent-b';

      const [resultA, resultB] = await Promise.all([
        runWithCorrelationId(idA, async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return getCorrelationId();
        }),
        runWithCorrelationId(idB, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return getCorrelationId();
        }),
      ]);

      expect(resultA).toBe(idA);
      expect(resultB).toBe(idB);
      expect(resultA).not.toBe(resultB);
    });

    it('should handle many concurrent contexts', async () => {
      const count = 20;
      const ids = Array.from({ length: count }, (_, i) => `concurrent-${i}`);

      const results = await Promise.all(
        ids.map((id) =>
          runWithCorrelationId(id, async () => {
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
            return getCorrelationId();
          }),
        ),
      );

      // Every result matches its assigned ID
      for (let i = 0; i < count; i++) {
        expect(results[i]).toBe(ids[i]);
      }
    });
  });

  describe('setCorrelationId', () => {
    it('should set the correlation ID for the current context', () => {
      runWithCorrelationId('initial', () => {
        expect(getCorrelationId()).toBe('initial');

        setCorrelationId('updated-id');
        expect(getCorrelationId()).toBe('updated-id');
      });
    });
  });

  describe('error handling', () => {
    it('should propagate throw inside context', () => {
      expect(() =>
        runWithCorrelationId('err-id', () => {
          throw new Error('test error');
        }),
      ).toThrow('test error');
    });

    it('should propagate async rejection inside context', async () => {
      await expect(
        runWithCorrelationId('err-id', async () => {
          await new Promise((_, reject) => setTimeout(reject, 5));
        }),
      ).rejects.toBeUndefined();
    });
  });
});
