/**
 * Logger Configuration
 * Uses Pino for structured logging
 */

import pino, { Logger, LoggerOptions } from "pino";

/**
 * Creates a pino logger instance with structured logging
 * @param service - The name of the service using the logger
 * @returns A configured pino logger instance
 */
export function createLogger(service: string): Logger {
  const isDevelopment = process.env.NODE_ENV !== "production";

  const loggerOptions: LoggerOptions = {
    name: service,
    level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      bindings: (bindings) => ({
        ...bindings,
        service,
        pid: process.pid,
        hostname: process.env.HOSTNAME || "unknown",
      }),
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: (req: unknown) => {
        const r = req as { method?: string; url?: string; headers?: Record<string, string> };
        return {
          method: r.method,
          url: r.url,
          headers: r.headers,
        };
      },
      res: (res: unknown) => {
        const r = res as { statusCode?: number };
        return {
          statusCode: r.statusCode,
        };
      },
    },
  };

  // In development, use pretty print for console output
  if (isDevelopment) {
    return pino({
      ...loggerOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
          messageFormat: "[{name}] {msg}",
        },
      },
    });
  }

  // In production, use standard JSON logging
  return pino(loggerOptions);
}

/**
 * Default logger for the worker service
 */
export const logger = createLogger("worker");

/**
 * Creates a child logger with additional bindings
 * @param service - The name of the service
 * @param bindings - Additional bindings for the child logger
 * @returns A child logger
 */
export function createChildLogger(
  service: string,
  bindings: Record<string, unknown>
): Logger {
  const parentLogger = createLogger(service);
  return parentLogger.child(bindings);
}