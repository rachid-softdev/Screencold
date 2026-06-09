/**
 * Email Generation Job
 * Generates personalized outreach emails using Claude
 */

import { logger } from "../lib/logger";
import { generateEmail, EmailContext, EmailResult } from "../lib/anthropic";
import {
  checkJobIdempotency,
  markJobComplete,
  markJobFailed,
} from "./index";

/**
 * Email generation result
 */
export interface EmailGenerationResult extends EmailResult {
  duration: number;
}

/**
 * Generates a personalized outreach email
 * @param agencyType - Type of agency (Design, CRO, SEO, Dev, Branding)
 * @param contactName - Name of the contact
 * @param companyName - Company name
 * @param url - URL that was analyzed
 * @param primaryIssue - Main issue identified from analysis
 * @param overallScore - Overall conversion score
 * @param annotatedImageUrl - URL of the annotated screenshot
 * @returns Generated email with subject, body, and optional PS
 */
export async function generateOutreachEmail(
  agencyType: "Design" | "CRO" | "SEO" | "Dev" | "Branding",
  contactName: string,
  companyName: string,
  url: string,
  primaryIssue: string,
  overallScore: number,
  annotatedImageUrl: string,
  jobId?: string,
  auditId?: string,
): Promise<EmailGenerationResult> {
  const startTime = Date.now();

  // Idempotency check
  if (jobId && auditId) {
    if (await checkJobIdempotency(jobId, auditId, "email-gen")) {
      logger.info({ jobId, auditId }, "Email generation already processed, skipping");
      return {
        subject: "",
        body: "",
        ps: undefined,
        duration: 0,
      };
    }
  }

  try {
    logger.info(
      { agencyType, contactName, companyName },
      "Starting email generation"
    );

    const context: EmailContext = {
      agencyType,
      contactName: contactName || "client",
      companyName: companyName || "votre entreprise",
      url,
      primaryIssue,
      overallScore,
      annotatedImageUrl,
    };

    const result = await generateEmail(context);

    const duration = Date.now() - startTime;

    logger.info(
      { subjectLength: result.subject.length, bodyLength: result.body.length, duration },
      "Email generation completed"
    );

    // Mark job as completed
    if (jobId && auditId) {
      await markJobComplete(jobId, auditId, "email-gen", {
        subjectLength: result.subject.length,
        bodyLength: result.body.length,
        duration,
      });
    }

    return {
      ...result,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown email generation error";

    logger.error({ error: errorMessage }, "Email generation failed");

    // Mark job as failed
    if (jobId && auditId) {
      await markJobFailed(jobId, auditId, "email-gen", errorMessage);
    }

    throw new Error(`Failed to generate email: ${errorMessage}`);
  }
}

/**
 * Validates email result has required fields
 */
export function isEmailValid(result: EmailGenerationResult): boolean {
  return (
    typeof result.subject === "string" &&
    result.subject.length > 0 &&
    typeof result.body === "string" &&
    result.body.length > 0
  );
}

/**
 * Replaces the image placeholder in email body with actual URL
 */
export function insertImagePlaceholder(
  body: string,
  imageUrl: string
): string {
  return body.replace("[IMAGE_PLACEHOLDER]", imageUrl);
}