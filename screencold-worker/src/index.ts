import { createWorker } from "./worker";
import { createLogger } from "./utils/logger";
import { checkHealth, isAlive, isReady } from "./health";
import { startMetricsServer } from "../lib/metrics-server";

// ============================================
// Sentry Configuration
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sentry = require("@sentry/node");
} catch {
  Sentry = null;
}

if (Sentry?.init) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN_WORKER,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    release: `worker@${process.env.WORKER_VERSION || "1.0.0"}`,
    integrations: [
      Sentry?.onFinishScope?.(() => {}) ?? (() => {}),
    ].filter(Boolean),
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === "development") {
        return null;
      }
      const error = hint.originalException;
      if (error instanceof Error) {
        if (error.message.includes("getaddrinfo") || error.message.includes("ENOTFOUND")) {
          return null;
        }
      }
      return event;
    },
  });
}

// ============================================
// Health Check HTTP Server
// ============================================

function createHealthServer() {
  const http = require('http');
  
  const server = http.createServer(async (req, res) => {
    const url = req.url || '';
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    try {
      if (url === '/health' || url === '/health/liveness') {
        // Liveness probe - just check if process is running
        const alive = isAlive();
        res.writeHead(alive ? 200 : 503);
        res.end(JSON.stringify({ status: alive ? 'ok' : 'error' }));
        return;
      }
      
      if (url === '/health/readiness') {
        // Readiness probe - check if worker can handle jobs
        const ready = await isReady();
        res.writeHead(ready ? 200 : 503);
        res.end(JSON.stringify({ status: ready ? 'ok' : 'error' }));
        return;
      }
      
      if (url === '/health/full') {
        // Full health check
        const health = await checkHealth();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.writeHead(statusCode);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(health, null, 2));
        return;
      }
      
      // 404 for unknown routes
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  });
  
  return server;
}

// ============================================
// Main Function
// ============================================

async function main() {
  const logger = createLogger();

  logger.info("Starting ScreenCold worker...");

  try {
    // Verify required environment variables
    const requiredEnvVars = [
      "DATABASE_URL",
      "REDIS_URL",
      "ANTHROPIC_API_KEY",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
      "AWS_S3_BUCKET",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      logger.error(`Missing required environment variables: ${missingVars.join(", ")}`);
      process.exit(1);
    }

    // Start health check server on port 3001
    const healthPort = parseInt(process.env.HEALTH_PORT || '3001', 10);
    const healthServer = createHealthServer();
    
    healthServer.listen(healthPort, () => {
      logger.info(`Health check server running on port ${healthPort}`);
    });

    // Start metrics HTTP server for Prometheus scraping
    const metricsPort = parseInt(process.env.WORKER_METRICS_PORT || '9091', 10);
    const metricsServer = startMetricsServer({
      info: (msg: string) => logger.info(msg),
    });
    logger.info(`Metrics server configured for port ${metricsPort}`);

    // Create and start the worker
    const worker = await createWorker();

    logger.info("Worker started successfully", {
      pid: process.pid,
      nodeVersion: process.version,
      env: process.env.NODE_ENV ?? "development",
      healthPort,
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        // Close health server
        await new Promise((resolve) => {
          healthServer.close(resolve);
        });

        // Close metrics server
        await new Promise((resolve) => {
          metricsServer.close(resolve);
        });
        
        // Close worker connections
        await worker.close();

        // Give time for ongoing jobs to complete
        await new Promise((resolve) => setTimeout(resolve, 5000));

        logger.info("Worker shutdown complete");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown", { error });
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", { error: error.message, stack: error.stack });
      Sentry?.captureException?.(error);
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled rejection", { reason, promise });
      Sentry?.captureEvent?.({
        level: 'error',
        message: 'Unhandled rejection',
        extra: { reason: String(reason) },
      });
    });

  } catch (error) {
    logger.error("Failed to start worker", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    Sentry?.captureException?.(error);
    process.exit(1);
  }
}

main();