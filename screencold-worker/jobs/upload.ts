/**
 * S3 Upload Job
 * Uploads desktop and mobile screenshots to AWS S3
 */

import { logger } from "../lib/logger";
import { uploadScreenshot, generateScreenshotKey } from "../lib/s3";
import {
  checkJobIdempotency,
  markJobComplete,
  markJobFailed,
} from "./index";

/**
 * Upload result containing URLs
 */
export interface UploadResult {
  screenshotUrl: string;
  mobileUrl: string;
}

/**
 * Uploads screenshots to S3
 * @param desktopBuffer - Desktop screenshot buffer
 * @param mobileBuffer - Mobile screenshot buffer
 * @param userId - User ID for S3 key generation
 * @param prospectId - Prospect ID for S3 key generation
 * @returns UploadResult with both URLs
 */
export async function uploadScreenshots(
  desktopBuffer: Buffer,
  mobileBuffer: Buffer,
  userId: string,
  prospectId: string,
  jobId?: string,
  auditId?: string,
): Promise<UploadResult> {
  const startTime = Date.now();

  // Idempotency check
  if (jobId && auditId) {
    if (await checkJobIdempotency(jobId, auditId, "upload")) {
      logger.info({ jobId, auditId }, "Upload already processed, skipping");
      return { screenshotUrl: "", mobileUrl: "" };
    }
  }

  try {
    logger.info(
      { userId, prospectId, desktopSize: desktopBuffer.length, mobileSize: mobileBuffer.length },
      "Starting S3 upload"
    );

    // Generate keys for both screenshots
    const desktopKey = generateScreenshotKey(userId, prospectId, "desktop");
    const mobileKey = generateScreenshotKey(userId, prospectId, "mobile");

    // Upload both in parallel
    const [screenshotUrl, mobileUrl] = await Promise.all([
      uploadScreenshot(desktopBuffer, desktopKey),
      uploadScreenshot(mobileBuffer, mobileKey),
    ]);

    const duration = Date.now() - startTime;

    logger.info(
      { screenshotUrl, mobileUrl, duration },
      "Screenshots uploaded successfully"
    );

    // Mark job as completed
    if (jobId && auditId) {
      await markJobComplete(jobId, auditId, "upload", { screenshotUrl, mobileUrl, duration });
    }

    return {
      screenshotUrl,
      mobileUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown upload error";

    logger.error(
      { userId, prospectId, error: errorMessage },
      "S3 upload failed"
    );

    // Mark job as failed
    if (jobId && auditId) {
      await markJobFailed(jobId, auditId, "upload", errorMessage);
    }

    throw new Error(`Failed to upload screenshots: ${errorMessage}`);
  }
}

/**
 * Uploads annotated screenshot to S3
 * @param annotatedBuffer - Annotated screenshot buffer
 * @param userId - User ID for S3 key generation
 * @param prospectId - Prospect ID for S3 key generation
 * @returns The S3 URL of the annotated screenshot
 */
export async function uploadAnnotatedScreenshot(
  annotatedBuffer: Buffer,
  userId: string,
  prospectId: string,
  jobId?: string,
  auditId?: string,
): Promise<string> {
  const startTime = Date.now();

  // Idempotency check
  if (jobId && auditId) {
    if (await checkJobIdempotency(jobId, auditId, "upload-annotated")) {
      logger.info({ jobId, auditId }, "Annotated upload already processed, skipping");
      return "";
    }
  }

  try {
    logger.info(
      { userId, prospectId, size: annotatedBuffer.length },
      "Uploading annotated screenshot"
    );

    const key = generateScreenshotKey(userId, prospectId, "annotated");
    const url = await uploadScreenshot(annotatedBuffer, key);

    const duration = Date.now() - startTime;

    logger.info({ url, duration }, "Annotated screenshot uploaded");

    // Mark job as completed
    if (jobId && auditId) {
      await markJobComplete(jobId, auditId, "upload-annotated", { url, duration });
    }

    return url;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown upload error";

    logger.error(
      { userId, prospectId, error: errorMessage },
      "Annotated screenshot upload failed"
    );

    // Mark job as failed
    if (jobId && auditId) {
      await markJobFailed(jobId, auditId, "upload-annotated", errorMessage);
    }

    throw new Error(`Failed to upload annotated screenshot: ${errorMessage}`);
  }
}