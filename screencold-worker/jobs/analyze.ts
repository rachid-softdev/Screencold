/**
 * Claude Vision Analysis Job
 * Analyzes screenshots using Anthropic Claude for UX/CRO insights
 */

import { logger } from "../lib/logger";
import { analyzeScreenshot, AnalyzeResult, UXIssue } from "../lib/anthropic";
import {
  checkJobIdempotency,
  markJobComplete,
  markJobFailed,
} from "./index";

/**
 * Analysis result with parsed data
 */
export interface AnalysisResult extends AnalyzeResult {
  duration: number;
}

/**
 * Validates zone coordinates to ensure they're within 0-100 range
 * @param zone - The zone to validate
 * @returns The validated zone
 */
function validateZone(zone: { x: number; y: number; width: number; height: number }): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: Math.min(100, Math.max(0, zone.x)),
    y: Math.min(100, Math.max(0, zone.y)),
    width: Math.min(100, Math.max(0, zone.width)),
    height: Math.min(100, Math.max(0, zone.height)),
  };
}

/**
 * Validates all issues in the analysis result
 * @param issues - Array of issues to validate
 * @returns Validated issues
 */
function validateIssues(issues: UXIssue[]): UXIssue[] {
  return issues.map((issue) => ({
    ...issue,
    zone: validateZone(issue.zone),
    // Ensure required fields have defaults
    title: issue.title || "Issue détectée",
    description: issue.description || "",
    suggestion: issue.suggestion || "",
    category: issue.category || "SPACING",
    severity: issue.severity || "LOW",
  }));
}

/**
 * Analyzes a screenshot using Claude Vision
 * @param screenshotBuffer - The desktop screenshot buffer
 * @param jobId - BullMQ job ID for idempotency tracking
 * @param auditId - Audit record ID for idempotency tracking
 * @param companyName - Optional company name for context
 * @returns AnalysisResult with parsed UX issues
 */
export async function analyzeSite(
  screenshotBuffer: Buffer,
  jobId?: string,
  auditId?: string,
  companyName?: string,
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // Idempotency check
  if (jobId && auditId) {
    if (await checkJobIdempotency(jobId, auditId, "analyze")) {
      logger.info({ jobId, auditId }, "Analysis already processed, skipping");
      return {
        siteType: "Unknown",
        overallScore: 0,
        issues: [],
        duration: 0,
      };
    }
  }

  try {
    logger.info(
      { companyName, screenshotSize: screenshotBuffer.length },
      "Starting Claude Vision analysis"
    );

    // Call Claude Vision API
    const result = await analyzeScreenshot(screenshotBuffer, companyName);

    // Validate and normalize issues
    const validatedIssues = validateIssues(result.issues);

    const duration = Date.now() - startTime;

    logger.info(
      {
        siteType: result.siteType,
        overallScore: result.overallScore,
        issuesCount: validatedIssues.length,
        duration,
      },
      "Analysis completed"
    );

    const analysisResult: AnalysisResult = {
      ...result,
      issues: validatedIssues,
      duration,
    };

    // Mark job as completed
    if (jobId && auditId) {
      await markJobComplete(jobId, auditId, "analyze", {
        siteType: result.siteType,
        overallScore: result.overallScore,
        issuesCount: validatedIssues.length,
        duration,
      });
    }

    return analysisResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown analysis error";

    logger.error({ error: errorMessage }, "Claude Vision analysis failed");

    // Mark job as failed
    if (jobId && auditId) {
      await markJobFailed(jobId, auditId, "analyze", errorMessage);
    }

    throw new Error(`Failed to analyze screenshot: ${errorMessage}`);
  }
}

/**
 * Validates analysis result has minimum required data
 */
export function isAnalysisValid(result: AnalysisResult): boolean {
  return (
    result.siteType !== undefined &&
    typeof result.overallScore === "number" &&
    Array.isArray(result.issues)
  );
}