import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { createLogger } from "./utils/logger";
import { prisma } from "./db";
import { s3Client, uploadScreenshots } from "./services/s3";
import { captureWebsite } from "./services/playwright";
import { analyzeWithAI } from "./services/claude";
import { generateEmail, sendEmail } from "./services/email";
import type { AuditJobData, ProspectJobData, EmailJobData } from "@screencold/types";
import {
  type CaptureResult,
  type AnalyzeResult,
  type EmailResult,
} from "@screencold/types";

// Queue names
const QUEUES = {
  AUDIT: "audit",
  EMAIL: "email",
  CAMPAIGN: "campaign",
} as const;

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

// Job processors
async function processAuditJob(job: Job<AuditJobData>): Promise<void> {
  const { auditId, prospectId, userId, url, captureOnly } = job.data;
  const jobLogger = createChildLogger(logger, { auditId, jobId: job.id });

  jobLogger.info("Processing audit job", { url, captureOnly });

  try {
    // Update audit status to PROCESSING
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: "PROCESSING" },
    });

    const startTime = Date.now();

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
      annotated: captureResult.screenshots.annotated
        ? Buffer.from(captureResult.screenshots.annotated.path, "base64")
        : undefined,
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
  const { auditId, prospectId, userId, contactName, contactEmail, customMessage } =
    job.data;
  const jobLogger = createChildLogger(logger, { auditId, jobId: job.id });

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
  const { campaignId, prospectId, userId, url, companyName, contactName, contactEmail, notes } =
    job.data;
  const jobLogger = createChildLogger(logger, { campaignId, jobId: job.id });

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
        type: "audit_refund",
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

  // Audit queue worker
  const auditWorker = new Worker<AuditJobData>(
    QUEUES.AUDIT,
    async (job) => {
      await processAuditJob(job);
    },
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

  auditWorker.on("failed", (job, error) => {
    logger.error("Audit job failed", { jobId: job?.id, error: error.message });
  });

  auditWorker.on("progress", (job, progress) => {
    logger.debug("Audit job progress", { jobId: job.id, progress });
  });

  // Email queue worker
  const emailWorker = new Worker<EmailJobData>(
    QUEUES.EMAIL,
    async (job) => {
      await processEmailJob(job);
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.EMAIL_CONCURRENCY ?? "5", 10),
    }
  );

  emailWorker.on("completed", (job) => {
    logger.debug("Email job completed", { jobId: job.id });
  });

  emailWorker.on("failed", (job, error) => {
    logger.error("Email job failed", { jobId: job?.id, error: error.message });
  });

  // Campaign queue worker
  const campaignWorker = new Worker<ProspectJobData>(
    QUEUES.CAMPAIGN,
    async (job) => {
      await processCampaignJob(job);
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.CAMPAIGN_CONCURRENCY ?? "3", 10),
    }
  );

  campaignWorker.on("completed", (job) => {
    logger.debug("Campaign job completed", { jobId: job.id });
  });

  campaignWorker.on("failed", (job, error) => {
    logger.error("Campaign job failed", { jobId: job?.id, error: error.message });
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