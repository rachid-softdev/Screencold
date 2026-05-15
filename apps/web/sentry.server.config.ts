import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Performance monitoring
  integrations: [
    Sentry.httpIntegration(),
  ],
  // Filter out certain errors in development
  beforeSend(event, hint) {
    if (process.env.NODE_ENV === "development") {
      return null; // Don't send errors in dev
    }
    return event;
  },
  // Attach user info when available
  initialScope: {
    tags: {
      app: "screencold-web",
    },
  },
});

export const onError = Sentry.captureException;