/**
 * Correlation ID Context
 *
 * Provides AsyncLocalStorage-based correlation ID propagation
 * across request handlers, services, and worker jobs.
 *
 * Usage:
 *   runWithCorrelationId(crypto.randomUUID(), () => {
 *     // All downstream calls can read the ID via getCorrelationId()
 *     doWork();
 *   });
 */

import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

const correlationIdStorage = new AsyncLocalStorage<string>();

/**
 * Generates a UUID v4 correlation ID.
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Returns the correlation ID for the current async context,
 * or `undefined` if no context has been established.
 */
export function getCorrelationId(): string | undefined {
  return correlationIdStorage.getStore();
}

/**
 * Sets the correlation ID for the current async context.
 * Must be called inside a `runWithCorrelationId` context.
 */
export function setCorrelationId(id: string): void {
  correlationIdStorage.enterWith(id);
}

/**
 * Runs `fn` within an async context that has the given `correlationId`.
 * All synchronous and promise-based work inside `fn` can retrieve the
 * ID via `getCorrelationId()`.
 */
export function runWithCorrelationId<T>(
  correlationId: string,
  fn: () => T,
): T {
  return correlationIdStorage.run(correlationId, fn);
}
