import pino from "pino";

// Create logger with pretty printing for development
const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV !== "production";

  return pino({
    level: process.env.LOG_LEVEL ?? (isDevelopment ? "debug" : "info"),
    transport: isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
            prepend: "🔧",
          },
        }
      : undefined,
    base: {
      pid: process.pid,
      hostname: process.env.HOSTNAME ?? "worker",
      env: process.env.NODE_ENV ?? "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ["req.headers.authorization", "*.apiKey", "*.secret"],
      censor: "[REDACTED]",
    },
  });
};

// Create a child logger with context
export function createChildLogger(
  parent: pino.Logger,
  context: Record<string, unknown>
): pino.Logger {
  return parent.child(context);
}

// Log levels helper
export const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
} as const;

export { createLogger };
export default createLogger;