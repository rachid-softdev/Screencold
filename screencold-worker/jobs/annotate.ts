/**
 * Image Annotation Job
 * Adds visual overlays to screenshots highlighting UX issues
 * Uses Jimp for image loading and Sharp for drawing annotations
 */

import Jimp from "jimp";
import sharp from "sharp";
import { logger } from "../lib/logger";
import { UXIssue } from "../lib/anthropic";
import {
  markJobStarted,
  markJobCompleted,
  markJobFailed,
  isJobAlreadyProcessed,
} from "../lib/job-tracker";

/**
 * Annotation color definitions by severity
 */
const COLORS = {
  HIGH: { r: 239, g: 68, b: 68, hex: "#EF4444" }, // red
  MEDIUM: { r: 245, g: 158, b: 11, hex: "#F59E0B" }, // orange
  LOW: { r: 59, g: 130, b: 246, hex: "#3B82F6" }, // blue
} as const;

/**
 * Annotation configuration
 */
const CONFIG = {
  strokeWidth: 3,
  fillOpacity: 0.15,
  badgeSize: 28,
  scoreBadgePadding: 16,
  legendPadding: 16,
  legendMaxIssues: 5,
  legendTextMaxLength: 80,
  watermarkFontSize: 12,
  watermarkOpacity: 0.4,
};

/**
 * Annotation result
 */
export interface AnnotationResult {
  annotatedBuffer: Buffer;
}

/**
 * Loads image from buffer
 */
async function loadImage(buffer: Buffer): Promise<Jimp> {
  return Jimp.read(buffer);
}

/**
 * Converts Jimp image to Buffer for Sharp processing
 */
async function jimpToBuffer(image: Jimp): Promise<Buffer> {
  const width = image.getWidth();
  const height = image.getHeight();
  const data = image.bitmap.data;

  // Create a simple buffer for Sharp
  return Buffer.from(data);
}

/**
 * Draws a rectangle on the image
 */
async function drawRectangle(
  inputBuffer: Buffer,
  x: number,
  y: number,
  width: number,
  height: number,
  strokeColor: { r: number; g: number; b: number },
  fillOpacity: number,
  strokeWidth: number,
  imageWidth: number,
  imageHeight: number
): Promise<Buffer> {
  // Calculate pixel coordinates
  const x1 = Math.round((x / 100) * imageWidth);
  const y1 = Math.round((y / 100) * imageHeight);
  const x2 = Math.round(((x + width) / 100) * imageWidth);
  const y2 = Math.round(((y + height) / 100) * imageHeight);
  const rectWidth = x2 - x1;
  const rectHeight = y2 - y1;

  // Create SVG for the rectangle
  const rectSvg = `
    <svg width="${imageWidth}" height="${imageHeight}">
      <rect
        x="${x1}"
        y="${y1}"
        width="${rectWidth}"
        height="${rectHeight}"
        fill="rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${fillOpacity})"
        stroke="rgb(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b})"
        stroke-width="${strokeWidth}"
      />
    </svg>
  `;

  return sharp(inputBuffer)
    .composite([
      {
        input: Buffer.from(rectSvg),
        top: 0,
        left: 0,
      },
    ])
    .toBuffer();
}

/**
 * Draws a numbered badge at the specified position
 */
async function drawBadge(
  inputBuffer: Buffer,
  number: number,
  x: number,
  y: number,
  badgeSize: number,
  color: { r: number; g: number; b: number },
  imageWidth: number,
  imageHeight: number
): Promise<Buffer> {
  // Calculate badge position (top-left of the issue rectangle)
  const centerX = Math.round((x / 100) * imageWidth) + 10;
  const centerY = Math.round((y / 100) * imageHeight) + 10;

  const badgeSvg = `
    <svg width="${imageWidth}" height="${imageHeight}">
      <circle
        cx="${centerX}"
        cy="${centerY}"
        r="${badgeSize / 2}"
        fill="rgb(${color.r}, ${color.g}, ${color.b})"
      />
      <text
        x="${centerX}"
        y="${centerY}"
        dy="0.35em"
        text-anchor="middle"
        fill="white"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${badgeSize * 0.6}px"
        font-weight="bold"
      >${number}</text>
    </svg>
  `;

  return sharp(inputBuffer)
    .composite([
      {
        input: Buffer.from(badgeSvg),
        top: 0,
        left: 0,
      },
    ])
    .toBuffer();
}

/**
 * Draws the score badge in the top-right corner
 */
async function drawScoreBadge(
  inputBuffer: Buffer,
  score: number,
  imageWidth: number,
  imageHeight: number
): Promise<Buffer> {
  const padding = CONFIG.scoreBadgePadding;
  const badgeHeight = 40;
  const x = imageWidth - 140 - padding;
  const y = padding;

  const scoreSvg = `
    <svg width="${imageWidth}" height="${imageHeight}">
      <rect
        x="${x}"
        y="${y}"
        width="140"
        height="${badgeHeight}"
        rx="8"
        fill="rgba(0, 0, 0, 0.7)"
      />
      <text
        x="${x + 70}"
        y="${y + badgeHeight / 2}"
        dy="0.35em"
        text-anchor="middle"
        fill="white"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="16px"
        font-weight="bold"
      >Score: ${score}/100</text>
    </svg>
  `;

  return sharp(inputBuffer)
    .composite([
      {
        input: Buffer.from(scoreSvg),
        top: 0,
        left: 0,
      },
    ])
    .toBuffer();
}

/**
 * Draws the legend at the bottom of the image
 */
async function drawLegend(
  inputBuffer: Buffer,
  issues: UXIssue[],
  imageWidth: number,
  imageHeight: number
): Promise<Buffer> {
  const padding = CONFIG.legendPadding;
  const maxIssues = CONFIG.legendMaxIssues;
  const displayIssues = issues.slice(0, maxIssues);
  const lineHeight = 24;
  const legendHeight = displayIssues.length * lineHeight + padding * 2;
  const legendY = imageHeight - legendHeight - 20;

  // Build SVG content
  let legendContent = `
    <rect
      x="20"
      y="${legendY}"
      width="${imageWidth - 40}"
      height="${legendHeight}"
      rx="8"
      fill="rgba(255, 255, 255, 0.95)"
      stroke="#e5e7eb"
      stroke-width="1"
    />
  `;

  displayIssues.forEach((issue, index) => {
    const color = COLORS[issue.severity];
    const yPos = legendY + padding + index * lineHeight + 16;
    const truncatedTitle =
      issue.title.length > CONFIG.legendTextMaxLength
        ? issue.title.substring(0, CONFIG.legendTextMaxLength - 3) + "..."
        : issue.title;
    const truncatedSuggestion =
      issue.suggestion.length > CONFIG.legendTextMaxLength
        ? issue.suggestion.substring(0, CONFIG.legendTextMaxLength - 3) + "..."
        : issue.suggestion;

    legendContent += `
      <circle cx="40" cy="${yPos - 6}" r="10" fill="rgb(${color.r}, ${color.g}, ${color.b})"/>
      <text x="58" y="${yPos}" fill="#1f2937" font-family="system-ui, -apple-system, sans-serif" font-size="12px" font-weight="bold">${index + 1}. ${truncatedTitle}</text>
      <text x="58" y="${yPos + 14}" fill="#6b7280" font-family="system-ui, -apple-system, sans-serif" font-size="11px">${truncatedSuggestion}</text>
    `;
  });

  // Add "more issues" text if needed
  if (issues.length > maxIssues) {
    const moreYPos = legendY + padding + maxIssues * lineHeight + 14;
    legendContent += `
      <text x="40" y="${moreYPos}" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="11px">+ ${issues.length - maxIssues} autres problèmes...</text>
    `;
  }

  const legendSvg = `
    <svg width="${imageWidth}" height="${imageHeight}">
      ${legendContent}
    </svg>
  `;

  return sharp(inputBuffer)
    .composite([
      {
        input: Buffer.from(legendSvg),
        top: 0,
        left: 0,
      },
    ])
    .toBuffer();
}

/**
 * Draws the watermark in the bottom-right corner
 */
async function drawWatermark(
  inputBuffer: Buffer,
  imageWidth: number,
  imageHeight: number
): Promise<Buffer> {
  const x = imageWidth - 100;
  const y = imageHeight - 30;

  const watermarkSvg = `
    <svg width="${imageWidth}" height="${imageHeight}">
      <text
        x="${x}"
        y="${y}"
        fill="rgba(0, 0, 0, 0.4)"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${CONFIG.watermarkFontSize}px"
        font-weight="500"
      >ScreenCold</text>
    </svg>
  `;

  return sharp(inputBuffer)
    .composite([
      {
        input: Buffer.from(watermarkSvg),
        top: 0,
        left: 0,
      },
    ])
    .toBuffer();
}

/**
 * Annotates a screenshot with UX issues
 * @param screenshotBuffer - The original screenshot buffer
 * @param issues - Array of UX issues to highlight
 * @param overallScore - Overall conversion score
 * @param jobId - BullMQ job ID for idempotency tracking
 * @param auditId - Audit record ID for idempotency tracking
 * @returns Annotated image buffer
 */
export async function annotateScreenshot(
  screenshotBuffer: Buffer,
  issues: UXIssue[],
  overallScore: number,
  jobId?: string,
  auditId?: string,
): Promise<AnnotationResult> {
  const startTime = Date.now();

  // Idempotency check
  if (jobId && auditId) {
    await markJobStarted(jobId, auditId, "annotate");

    if (await isJobAlreadyProcessed(jobId, auditId, "annotate")) {
      logger.info({ jobId, auditId }, "Annotation already processed, skipping");
      return { annotatedBuffer: screenshotBuffer };
    }
  }

  try {
    logger.info(
      { issuesCount: issues.length, overallScore },
      "Starting image annotation"
    );

    // Get image dimensions
    const metadata = await sharp(screenshotBuffer).metadata();
    const imageWidth = metadata.width || 1440;
    const imageHeight = metadata.height || 900;

    // Start with the original image as Buffer
    let currentBuffer = screenshotBuffer;

    // Process each issue in order
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const color = COLORS[issue.severity as keyof typeof COLORS] || COLORS.LOW;

      // Draw rectangle
      currentBuffer = await drawRectangle(
        currentBuffer,
        issue.zone.x,
        issue.zone.y,
        issue.zone.width,
        issue.zone.height,
        color,
        CONFIG.fillOpacity,
        CONFIG.strokeWidth,
        imageWidth,
        imageHeight
      );

      // Draw badge
      currentBuffer = await drawBadge(
        currentBuffer,
        i + 1,
        issue.zone.x,
        issue.zone.y,
        CONFIG.badgeSize,
        color,
        imageWidth,
        imageHeight
      );
    }

    // Draw score badge
    currentBuffer = await drawScoreBadge(currentBuffer, overallScore, imageWidth, imageHeight);

    // Draw legend
    if (issues.length > 0) {
      currentBuffer = await drawLegend(currentBuffer, issues, imageWidth, imageHeight);
    }

    // Draw watermark
    currentBuffer = await drawWatermark(currentBuffer, imageWidth, imageHeight);

    // Final output as PNG with quality
    const finalBuffer = await sharp(currentBuffer)
      .png({ quality: 90 })
      .toBuffer();

    const duration = Date.now() - startTime;

    logger.info({ duration }, "Image annotation completed");

    const result: AnnotationResult = {
      annotatedBuffer: finalBuffer,
    };

    // Mark job as completed
    if (jobId && auditId) {
      await markJobCompleted(jobId, auditId, "annotate", {
        duration,
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown annotation error";

    logger.error({ error: errorMessage }, "Image annotation failed");

    // Mark job as failed
    if (jobId && auditId) {
      await markJobFailed(jobId, auditId, "annotate", errorMessage);
    }

    throw new Error(`Failed to annotate screenshot: ${errorMessage}`);
  }
}