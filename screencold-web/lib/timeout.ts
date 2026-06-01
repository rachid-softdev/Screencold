/**
 * Timeout helper for external API calls.
 * Uses AbortController (native in Node 20+) to enforce timeouts on async operations.
 */

/**
 * Error thrown when an operation times out.
 */
export class TimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps an async operation with a timeout using AbortController.
 *
 * If the operation does not complete within `timeoutMs` milliseconds,
 * the provided `signal` is aborted (if it accepts an AbortSignal) and
 * a TimeoutError is thrown.
 *
 * @param operation - The async operation to wrap.
 * @param timeoutMs - Timeout in milliseconds.
 * @returns The result of the operation.
 */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted && !(error instanceof TimeoutError)) {
      throw new TimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Create an AbortSignal that aborts after the given timeout.
 * Convenience wrapper around AbortSignal.timeout() with better typing.
 */
export function timeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}
