import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { CreditTransactionType } from "@prisma/client";
import { createLogger, createChildLogger } from "./utils/logger";
import { prisma } from "./db";
import { s3Client, uploadScreenshots } from "./services/s3";
import { captureWebsite } from "./services/playwright";
import { analyzeWithAI } from "./services/claude";
import { generateEmail, sendEmail } from "./services/email";
import { annotateScreenshot } from "./services/annotate";
import type { AuditJobData, ProspectJobData, EmailJobData, EmailRegenJobData } from "@screencold/types";
import {
  type CaptureResult,
  type AnalyzeResult,
  type EmailResult,
} from "@screencold/types";
import {
  recordJobStart,
  recordJobEnd,
  recordJobError,
  getMetrics,
} from "../lib/metrics";

// Queue names
const QUEUES = {
  AUDIT: "audit",
  EMAIL: "email",
  EMAIL_GENERATION: "email-generation",
  CAMPAIGN: "campaign",
  // Dead Letter Queues
  AUDIT_DLQ: "audit-dlq",
  EMAIL_DLQ: "email-dlq",
  EMAIL_GENERATION_DLQ: "email-generation-dlq",
  CAMPAIGN_DLQ: "campaign-dlq",
} as const;

// Get or create DLQ for a given queue
async function getDLQ(queueName: string): Promise<Queue> {
  const dlqName = `${queueName}-dlq`;
  return new Queue(dlqName, { connection: redisConnection });
}

// Move failed job to DLQ
async function moveToDLQ(job: Job, queueName: string, reason: string): Promise<void> {
  const dlq = await getDLQ(queueName);
  
  await dlq.add('failed-job', {
    originalQueue: queueName,
    originalJobId: job.id,
    data: job.data,
    reason: reason,
    failedAt: new Date().toISOString(),
    attempts: job.attemptsMade,
    stacktrace: job.stacktrace,
  }, {
    jobId: `dlq-${job.id}`,
  });
  
  logger.error(`Job moved to DLQ`, {
    queue: queueName,
    jobId: job.id,
    reason,
    attempts: job.attemptsMade,
  });
}

// Redis connection configuration
const redisConnection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisConnection.on("error", (error) => {
  logger.error("Redis connection error", { error: error.message });
});

redisConnection.on("reconnecting", () => {
  logger.info("Redis reconnecting...");
});

const logger = createLogger();

// ============================================
// RED Metrics — wrap job handlers with tracking
// ============================================

let metricsJobCounter = 0;
let metricsLogInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Wraps a job handler function with RED metrics tracking.
 * Records start, end (on success), and error (on failure).
 */
function withMetrics<T>(jobType: string, handler: (job: Job<T>) => Promise<void>) {
  return async (job: Job<T>) => {
    const startTime = Date.now();
    recordJobStart(jobType);
    try {
      await handler(job);
      recordJobEnd(jobType, Date.now() - startTime);
      maybeLogMetrics();
    } catch (error) {
      recordJobError(jobType, error instanceof Error ? error.message : "Unknown");
      maybeLogMetrics();
      throw error;
    }
  };
}

/**
 * Log RED metrics snapshot every 100 jobs or every 5 minutes.
 */
function maybeLogMetrics(): void {
  metricsJobCounter++;

  if (metricsJobCounter % 100 === 0) {
    const metrics = getMetrics();
    logger.info("RED metrics snapshot (100 jobs)", metrics);
  }
}

function startMetricsLogInterval(): void {
  if (metricsLogInterval) return;
  metricsLogInterval = setInterval(() => {
    const metrics = getMetrics();
    logger.info("RED metrics snapshot (5 min)", metrics);
  }, 5 * 60 * 1000);
  // Allow the process to exit even if this interval is still running
  if (metricsLogInterval && typeof metricsLogInterval === "object" && "unref" in metricsLogInterval) {
    metricsLogInterval.unref();
  }
}

// Job processors
async function processAuditJob(job: Job<AuditJobData>): Promise<void> {
  const { auditId, prospectId, userId, url, captureOnly, correlationId } = job.data;
  const jobLogger = createChildLogger(logger, {
    auditId,
    jobId: job.id,
    ...(correlationId ? { correlationId } : {}),
  });

  jobLogger.info("Processing audit job", { url, captureOnly });

  try {
    // Update audit status to PROCESSING
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: "PROCESSING" },
    });

    const startTime = Date.now();

    // Holds the annotated screenshot buffer (generated after AI analysis).
    // Declared here (before first use at uploadScreenshots) to avoid the
    // JS hoisting bug where it was referenced before its declaration.
    let annotatedScreenshotBuffer: Buffer | null = null;

    // Step 1: Capture screenshots
    jobLogger.info("Capturing website screenshots...");
    const captureResult: CaptureResult = await captureWebsite(url);
    
    if (!captureResult.success) {
      throw new Error(captureResult.error ?? "Failed to capture website");
    }

    // Step 2: Upload screenshots to S3
    jobLogger.info("Uploading screenshots to S3...");
    const screenshotUrls = await uploadScreenshots(userId, {
      desktop: Buffer.from(captureResult.screenshots.desktop.path, "base64"),
      mobile: captureResult.screenshots.mobile
        ? Buffer.from(captureResult.screenshots.mobile.path, "base64")
        : undefined,
      // Use the generated annotated screenshot if available, otherwise fallback to desktop
      annotated: annotatedScreenshotBuffer || 
        (captureResult.screenshots.annotated 
          ? Buffer.from(captureResult.screenshots.annotated.path, "base64")
          : undefined),
    });

    // Step 3: Analyze with AI (unless capture only mode)
    let analysisResult: AnalyzeResult | null = null;
    if (!captureOnly) {
      jobLogger.info("Analyzing with AI with screenshots...");
      
      // Extract base64 data from screenshots (already captured)
      const desktopBase64 = captureResult.screenshots.desktop.path;
      const mobileBase64 = captureResult.screenshots.mobile?.path;
      
      analysisResult = await analyzeWithAI(
        captureResult.screenshots.desktop.url,
        {
          pageUrl: url,
          screenshotBase64: desktopBase64,
          mobileScreenshotBase64: mobileBase64,
        }
      );

      if (!analysisResult.success) {
        throw new Error(analysisResult.error ?? "AI analysis failed");
      }

      // Step 3.5: Generate visual annotations
      if (analysisResult.issues && analysisResult.issues.length > 0) {
        jobLogger.info("Generating visual annotations...", {
          issuesCount: analysisResult.issues.length,
        });
        
        try {
          const desktopBuffer = Buffer.from(captureResult.screenshots.desktop.path, 'base64');
          annotatedScreenshotBuffer = await annotateScreenshot({
            screenshotBuffer: desktopBuffer,
            issues: analysisResult.issues,
            width: 1440,
            height: 900,
          });
          jobLogger.info("Annotations generated successfully");
        } catch (annotateError) {
          jobLogger.warn("Failed to generate annotations, continuing without", {
            error: annotateError instanceof Error ? annotateError.message : 'Unknown',
          });
          // Don't fail the job - continue without annotations
        }
      }
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Step 4: Update audit record
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        screenshotUrl: screenshotUrls.desktop.url,
        mobileUrl: screenshotUrls.mobile?.url,
        annotatedUrl: screenshotUrls.annotated?.url,
        issues: analysisResult?.issues ?? [],
        siteType: analysisResult?.siteType ?? null,
        overallScore: analysisResult?.overallScore ?? null,
        status: "READY",
        processingTime,
      },
    });

    // Update prospect status
    await prisma.prospect.update({
      where: { id: prospectId },
      data: { status: "DONE" },
    });

    jobLogger.info("Audit completed successfully", {
      processingTime,
      score: analysisResult?.overallScore,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    jobLogger.error("Audit job failed", { error: errorMessage });

    // Update audit status to FAILED
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });

    // Update prospect status
    await prisma.prospect.update({
      where: { id: prospectId },
      data: { status: "FAILED" },
    });

    // Refund credit
    await refundCredit(userId, auditId);

    throw error;
  }
}

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { auditId, prospectId, userId, contactName, contactEmail, customMessage, correlationId } =
    job.data;
  const jobLogger = createChildLogger(logger, {
    auditId,
    jobId: job.id,
    ...(correlationId ? { correlationId } : {}),
  });

  jobLogger.info("Processing email job", { contactEmail });

  try {
    // Get audit data
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: { prospect: true },
    });

    if (!audit) {
      throw new Error("Audit not found");
    }

    // Generate email
    const emailResult: EmailResult = await generateEmail({
      auditId,
      url: audit.prospect.url,
      issues: audit.issues as unknown[] ?? [],
      contactName,
      customMessage,
    });

if (!emailResult.success) {
        throw new Error(emailResult.error ?? "Email generation failed");
      }

      jobLogger.info("Email generated successfully", {
        subject: emailResult.subject,
      });

      // Send the email via Resend
      const emailSendResult = await sendEmail({
        to: contactEmail,
        subject: emailResult.subject,
        html: emailResult.body + (emailResult.ps ? `<p style="margin-top: 20px; font-style: italic; color: #666;">P.S. ${emailResult.ps}</p>` : ''),
      });

      if (!emailSendResult.success) {
        jobLogger.warn("Failed to send email, but audit completed", {
          error: emailSendResult.error,
        });
      } else {
        jobLogger.info("Email sent successfully", {
          to: contactEmail,
          messageId: emailSendResult.data?.id,
        });
      }

      // Update audit with email content
      await prisma.audit.update({
        where: { id: auditId },
        data: {
          emailSubject: emailResult.subject,
          emailBody: emailResult.body,
          emailPs: emailResult.ps ?? null,
        },
      });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    jobLogger.error("Email job failed", { error: errorMessage });
    throw error;
  }
}

async function processCampaignJob(job: Job<ProspectJobData>): Promise<void> {
  const { campaignId, prospectId, userId, url, companyName, contactName, contactEmail, notes, correlationId } =
    job.data;
  const jobLogger = createChildLogger(logger, {
    campaignId,
    jobId: job.id,
    ...(correlationId ? { correlationId } : {}),
  });

  jobLogger.info("Processing campaign prospect", { url });

  try {
    // Create audit record
    const audit = await prisma.audit.create({
      data: {
        prospectId,
        userId,
        status: "PROCESSING",
      },
    });

    // Update prospect with audit ID
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        auditId: audit.id,
        status: "PROCESSING",
      },
    });

    // Add audit job to queue
    const auditQueue = await getQueue(QUEUES.AUDIT);
    await auditQueue.add("process-audit", {
      auditId: audit.id,
      prospectId,
      userId,
      url,
      captureOnly: false,
    });

    jobLogger.info("Campaign prospect queued for audit", { auditId: audit.id });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    jobLogger.error("Campaign job failed", { error: errorMessage });
    throw error;
  }
}

// Helper functions
async function refundCredit(userId: string, auditId: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: 1 } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount: 1,
        type: CreditTransactionType.REFUND,
        auditId,
      },
    }),
  ]);
}

// Queue management
let queues: Record<string, Queue> = {};

async function getQueue(name: string): Promise<Queue> {
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection: redisConnection });
  }
  return queues[name];
}

// Create workers for each queue
export async function createWorker() {
  logger.info("Creating BullMQ workers...");

  startMetricsLogInterval();

  // Audit queue worker
  const auditWorker = new Worker<AuditJobData>(
    QUEUES.AUDIT,
    withMetrics("audit", processAuditJob),
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.AUDIT_CONCURRENCY ?? "2", 10),
      limiter: {
        max: parseInt(process.env.AUDIT_RATE_LIMIT ?? "10", 10),
        duration: 60000, // 1 minute
      },
    }
  );

  auditWorker.on("completed", (job) => {
    logger.debug("Audit job completed", { jobId: job.id, auditId: job.data.auditId });
  });

  auditWorker.on("failed", async (job, error) => {
    logger.error("Audit job failed", { jobId: job?.id, error: error.message });
    
    // Move to DLQ if all retries exhausted
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      await moveToDLQ(job, QUEUES.AUDIT, error.message);
    }
  });

  auditWorker.on("progress", (job, progress) => {
    logger.debug("Audit job progress", { jobId: job.id, progress });
  });

  // Email queue worker
  const emailWorker = new Worker<EmailJobData>(
    QUEUES.EMAIL,
    withMetrics("email", processEmailJob),
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.EMAIL_CONCURRENCY ?? "5", 10),
    }
  );

  emailWorker.on("completed", (job) => {
    logger.debug("Email job completed", { jobId: job.id });
  });

  emailWorker.on("failed", async (job, error) => {
    logger.error("Email job failed", { jobId: job?.id, error: error.message });
    
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      await moveToDLQ(job, QUEUES.EMAIL, error.message);
    }
  });

  // Campaign queue worker
  const campaignWorker = new Worker<ProspectJobData>(
    QUEUES.CAMPAIGN,
    withMetrics("campaign", processCampaignJob),
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.CAMPAIGN_CONCURRENCY ?? "3", 10),
    }
  );

  campaignWorker.on("completed", (job) => {
    logger.debug("Campaign job completed", { jobId: job.id });
  });

  campaignWorker.on("failed", async (job, error) => {
    logger.error("Campaign job failed", { jobId: job?.id, error: error.message });
    
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      await moveToDLQ(job, QUEUES.CAMPAIGN, error.message);
    }
  });

  // Email generation queue worker (for email regeneration)
  const emailGenWorker = new Worker<EmailRegenJobData>(
    QUEUES.EMAIL_GENERATION,
    withMetrics("email-gen", processEmailRegenJob),
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.EMAIL_CONCURRENCY ?? "5", 10),
    }
  );

  emailGenWorker.on("completed", (job) => {
    logger.debug("Email regeneration job completed", { jobId: job.id, auditId: job.data.auditId });
  });

  emailGenWorker.on("failed", async (job, error) => {
    logger.error("Email regeneration job failed", { jobId: job?.id, error: error.message });
    
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      await moveToDLQ(job, QUEUES.EMAIL_GENERATION, error.message);
    }
  });

  logger.info("All workers created successfully");

  // Return worker manager for graceful shutdown
  return {
    close: async () => {
      logger.info("Closing all workers...");

      await Promise.all([
        auditWorker.close(),
        emailWorker.close(),
        campaignWorker.close(),
        emailGenWorker.close(),
      ]);

      // Close all queues
      await Promise.all(Object.values(queues).map((q) => q.close()));

      // Close Redis connection
      await redisConnection.quit();

      logger.info("All workers closed");
    },
  };
}

export { QUEUES, getQueue };