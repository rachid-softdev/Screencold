import { createWorker } from "./worker";
import { createLogger } from "./utils/logger";

async function main() {
  // Create logger
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

    // Create and start the worker
    const worker = await createWorker();

    logger.info("Worker started successfully", {
      pid: process.pid,
      nodeVersion: process.version,
      env: process.env.NODE_ENV ?? "development",
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
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
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled rejection", { reason, promise });
    });

  } catch (error) {
    logger.error("Failed to start worker", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main();