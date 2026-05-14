/**
 * Playwright Screenshot Capture Job
 * Captures desktop and mobile screenshots of a website
 */

import { chromium, Browser, Page, ViewportSize } from "playwright";
import { logger } from "../lib/logger";
import { validateUrl } from "../lib/ssrf";

/**
 * Capture result containing all screenshot data and metadata
 */
export interface CaptureResult {
  desktopBuffer: Buffer;
  mobileBuffer: Buffer;
  pageTitle: string;
  pageDescription: string;
  loadTime: number;
  hasSSL: boolean;
  faviconUrl?: string;
  ogImageUrl?: string;
  error?: string;
}

/**
 * Viewport configurations
 */
const DESKTOP_VIEWPORT: ViewportSize = { width: 1440, height: 900 };
const MOBILE_VIEWPORT: ViewportSize = { width: 390, height: 844 };

/**
 * Capture timeout in milliseconds
 */
const CAPTURE_TIMEOUT = 30000;

/**
 * Captures screenshots with Playwright
 * @param url - The URL to capture
 * @returns CaptureResult with screenshots and metadata
 */
export async function captureWebsite(url: string): Promise<CaptureResult> {
  const startTime = Date.now();
  let browser: Browser | null = null;

  // Validate URL for SSRF protection
  await validateUrl(url);

  try {
    logger.info({ url }, "Starting screenshot capture");

    // Launch browser with required arguments
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-extensions",
      ],
    });

    const context = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });

    // Create desktop page
    const desktopPage = await context.newPage();

    // Set timeout for page operations
    desktopPage.setDefaultTimeout(CAPTURE_TIMEOUT);

    // Navigate to URL with retry logic
    let loadTime = 0;
    let navigateSuccess = false;

    try {
      // Try networkidle first (waits for network to be idle)
      const navStart = Date.now();
      await desktopPage.goto(url, {
        waitUntil: "networkidle",
        timeout: CAPTURE_TIMEOUT - 5000,
      });
      loadTime = Date.now() - navStart;
      navigateSuccess = true;
    } catch {
      // Fallback to load + additional wait
      logger.warn({ url }, "Network idle failed, trying load strategy");
      const navStart = Date.now();
      await desktopPage.goto(url, {
        waitUntil: "load",
        timeout: CAPTURE_TIMEOUT - 5000,
      });
      // Wait additional time for any dynamic content
      await desktopPage.waitForTimeout(3000);
      loadTime = Date.now() - navStart;
      navigateSuccess = true;
    }

    if (!navigateSuccess) {
      throw new Error("Failed to load page");
    }

    // Extract metadata
    const metadata = await extractMetadata(desktopPage, url);

    // Capture desktop screenshot
    const desktopBuffer = await desktopPage.screenshot({
      type: "png",
      fullPage: false, // Above the fold only
    });

    // Switch to mobile viewport
    await context.setViewportSize(MOBILE_VIEWPORT);

    // Capture mobile screenshot
    const mobileBuffer = await desktopPage.screenshot({
      type: "png",
      fullPage: false,
    });

    // Cleanup
    await desktopPage.close();
    await context.close();
    await browser.close();

    const totalTime = Date.now() - startTime;

    logger.info(
      { url, loadTime, totalTime, hasSSL: metadata.hasSSL },
      "Screenshot capture completed"
    );

    return {
      desktopBuffer: Buffer.from(desktopBuffer),
      mobileBuffer: Buffer.from(mobileBuffer),
      pageTitle: metadata.title,
      pageDescription: metadata.description,
      loadTime,
      hasSSL: metadata.hasSSL,
      faviconUrl: metadata.favicon,
      ogImageUrl: metadata.ogImage,
    };
  } catch (error) {
    // Ensure cleanup on error
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore cleanup errors
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown capture error";

    logger.error({ url, error: errorMessage }, "Screenshot capture failed");

    // Return error info instead of throwing to allow graceful handling
    return {
      desktopBuffer: Buffer.alloc(0),
      mobileBuffer: Buffer.alloc(0),
      pageTitle: "",
      pageDescription: "",
      loadTime: 0,
      hasSSL: url.startsWith("https"),
      error: errorMessage,
    };
  }
}

/**
 * Extracts metadata from the page (title, description, favicon, og:image)
 */
async function extractMetadata(
  page: Page,
  url: string
): Promise<{
  title: string;
  description: string;
  favicon: string | undefined;
  ogImage: string | undefined;
  hasSSL: boolean;
}> {
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

  // Extract title
  let title = "";
  try {
    title = (await page.title()) || "";
  } catch {
    title = "";
  }

  // Extract meta description
  let description = "";
  try {
    description =
      (await page.locator('meta[name="description"]').first().getAttribute(
        "content"
      )) || "";
  } catch {
    description = "";
  }

  // Extract favicon
  let favicon: string | undefined;
  try {
    const faviconLink = await page
      .locator('link[rel="icon"], link[rel="shortcut icon"]')
      .first()
      .getAttribute("href");

    if (faviconLink) {
      favicon = faviconLink.startsWith("http")
        ? faviconLink
        : faviconLink.startsWith("//")
          ? `${urlObj.protocol}${faviconLink}`
          : `${baseUrl}${faviconLink.startsWith("/") ? "" : "/"}${faviconLink}`;
    }
  } catch {
    // Fallback to default favicon
    favicon = `${baseUrl}/favicon.ico`;
  }

  // Extract og:image
  let ogImage: string | undefined;
  try {
    ogImage =
      (await page.locator('meta[property="og:image"]').first().getAttribute(
        "content"
      )) || undefined;
  } catch {
    ogImage = undefined;
  }

  return {
    title,
    description,
    favicon,
    ogImage,
    hasSSL: url.startsWith("https"),
  };
}

/**
 * Validates that capture was successful
 */
export function isCaptureValid(result: CaptureResult): boolean {
  return (
    !result.error &&
    result.desktopBuffer.length > 0 &&
    result.mobileBuffer.length > 0
  );
}