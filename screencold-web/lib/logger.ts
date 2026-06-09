import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'secret', 'apiKey'],
    censor: '[REDACTED]',
  },
});

export function createLogger(context?: Record<string, unknown>) {
  return context ? logger.child(context) : logger;
}

export default logger;
