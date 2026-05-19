/**
 * Annotation Service
 * Draws visual annotations on screenshots based on AI-detected issues
 */

import sharp from 'sharp';
import { createLogger } from '../utils/logger';
import type { UXIssue } from '@screencold/types';

const logger = createLogger();

// Color palette for severity levels
const SEVERITY_COLORS = {
  critical: { rgb: [239, 68, 68], hex: '#EF4444' },   // Red - HIGH
  major: { rgb: [245, 158, 11], hex: '#F59E0B' },     // Orange - MEDIUM
  minor: { rgb: [59, 130, 246], hex: '#3B82F6' },     // Blue - LOW
};

// Fallback for unknown severity
const DEFAULT_COLOR = { rgb: [156, 163, 175], hex: '#9CA3AF' };

interface AnnotateOptions {
  screenshotBuffer: Buffer;
  issues: UXIssue[];
  width: number;
  height: number;
}

/**
 * Annotate a screenshot with visual markers for UX issues
 */
export async function annotateScreenshot(options: AnnotateOptions): Promise<Buffer> {
  const { screenshotBuffer, issues, width, height } = options;

  try {
    // Load the base image
    const image = sharp(screenshotBuffer);
    const metadata = await image.metadata();

    // If no issues to annotate, just return the original
    if (!issues || issues.length === 0) {
      logger.debug('No issues to annotate, returning original screenshot');
      return screenshotBuffer;
    }

    // Create SVG overlay for annotations
    const annotationsSvg = createAnnotationsSvg(issues, width, height);
    const legendSvg = createLegendSvg(issues, width);

    // Compositing: base image + annotations + legend
    const annotatedBuffer = await image
      .composite([
        {
          input: Buffer.from(annotationsSvg),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    // Add legend at bottom
    const finalBuffer = await sharp(annotatedBuffer)
      .extend({
        bottom: 80,
        background: { r: 255, g: 255, b: 255, alpha: 0.95 },
      })
      .composite([
        {
          input: Buffer.from(legendSvg),
          top: (metadata.height || height) + 10,
          left: 20,
        },
      ])
      .png()
      .toBuffer();

    logger.info('Screenshot annotated successfully', {
      issuesCount: issues.length,
      width: metadata.width,
      height: metadata.height,
    });

    return finalBuffer;
  } catch (error) {
    logger.error('Failed to annotate screenshot', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Create SVG for annotation rectangles and badges
 */
function createAnnotationsSvg(issues: UXIssue[], width: number, height: number): string {
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Add defs for filters and styles
  svg += `
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
      </filter>
    </defs>
    <style>
      .badge { font-family: system-ui, -apple-system, sans-serif; font-weight: 700; font-size: 14px; }
      .rect { fill-opacity: 0.15; stroke-width: 3; }
    </style>
  `;

  issues.forEach((issue, index) => {
    const severity = (issue.severity || 'minor').toLowerCase() as 'critical' | 'major' | 'minor';
    const color = SEVERITY_COLORS[severity] || DEFAULT_COLOR;
    const number = index + 1;

    // Calculate position from percentage (zone)
    let x = 0, y = 0, w = 100, h = 50; // defaults
    if (issue.zone) {
      x = (issue.zone.x / 100) * width;
      y = (issue.zone.y / 100) * height;
      w = (issue.zone.width / 100) * width;
      h = (issue.zone.height / 100) * height;
    }

    // Ensure minimum size
    w = Math.max(w, 60);
    h = Math.max(h, 40);

    // Rectangle around the issue area
    svg += `
      <rect
        x="${x}"
        y="${y}"
        width="${w}"
        height="${h}"
        fill="rgb(${color.rgb.join(',')})"
        stroke="rgb(${color.rgb.join(',')})"
        class="rect"
        filter="url(#shadow)"
      />
    `;

    // Badge number in top-left corner of the rectangle
    const badgeSize = 28;
    const badgeX = Math.max(x - badgeSize / 2, 10);
    const badgeY = Math.max(y - badgeSize / 2, 10);

    // Badge circle
    svg += `
      <circle
        cx="${badgeX + badgeSize / 2}"
        cy="${badgeY + badgeSize / 2}"
        r="${badgeSize / 2}"
        fill="rgb(${color.rgb.join(',')})"
        filter="url(#shadow)"
      />
    `;

    // Badge number
    svg += `
      <text
        x="${badgeX + badgeSize / 2}"
        y="${badgeY + badgeSize / 2 + 5}"
        text-anchor="middle"
        fill="white"
        class="badge"
      >${number}</text>
    `;
  });

  svg += '</svg>';
  return svg;
}

/**
 * Create SVG for the legend at bottom
 */
function createLegendSvg(issues: UXIssue[], _width: number): string {
  const padding = 16;
  const lineHeight = 24;
  const fontSize = 12;
  const badgeSize = 18;

  // Calculate height based on number of issues
  const height = Math.max(60, padding * 2 + issues.length * lineHeight);
  const legendWidth = 400;

  let svg = `<svg width="${legendWidth}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `
    <style>
      .legend-text { font-family: system-ui, -apple-system, sans-serif; font-size: ${fontSize}px; fill: #374151; }
      .legend-title { font-weight: 600; }
    </style>
    <rect x="0" y="0" width="${legendWidth}" height="${height}" fill="white" fill-opacity="0.95" rx="8"/>
  `;

  // Title
  svg += `
    <text x="${padding}" y="${padding + 12}" class="legend-text legend-title">
      Problèmes détectés:
    </text>
  `;

  // List items
  issues.forEach((issue, index) => {
    const severity = (issue.severity || 'minor').toLowerCase() as 'critical' | 'major' | 'minor';
    const color = SEVERITY_COLORS[severity] || DEFAULT_COLOR;
    const number = index + 1;
    const y = padding + 35 + index * lineHeight;

    // Colored dot
    svg += `
      <circle
        cx="${padding + 10}"
        cy="${y - 4}"
        r="${badgeSize / 2}"
        fill="rgb(${color.rgb.join(',')})"
      />
      <text x="${padding + 10}" y="${y}" text-anchor="middle" fill="white" font-size="10" font-weight="bold">
        ${number}
      </text>
    `;

    // Issue title (truncated)
    const title = issue.title?.substring(0, 40) || 'Problème';
    svg += `
      <text x="${padding + 35}" y="${y}" class="legend-text">
        ${title}${title.length >= 40 ? '...' : ''}
      </text>
    `;
  });

  // ScreenCold watermark
  svg += `
    <text x="${legendWidth - padding}" y="${height - padding}" text-anchor="end" fill="#9CA3AF" font-size="10" font-family="system-ui">
      Generated by ScreenCold
    </text>
  `;

  svg += '</svg>';
  return svg;
}

/**
 * Quick function to just add a simple overlay (for backwards compatibility)
 * This is what was being used before the full annotation system
 */
export async function addSimpleOverlay(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .composite([
      {
        input: Buffer.from(
          `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#3B82F6" fill-opacity="0.05"/>
          </svg>`
        ),
      },
    ])
    .png()
    .toBuffer();
}

export default {
  annotateScreenshot,
  addSimpleOverlay,
};