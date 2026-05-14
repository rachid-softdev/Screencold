import { chromium, type Browser, type Page } from "playwright";
import { createLogger } from "../utils/logger";
import type { CaptureResult } from "@screencold/types";

const logger = createLogger();

// Browser instance (reused)
let browser: Browser | null = null;
let browserInitPromise: Promise<Browser> | null = null;

// Initialize browser with retry logic
async function initBrowser(): Promise<Browser> {
  if (browser) return browser;

  if (browserInitPromise) return browserInitPromise;

  browserInitPromise = (async () => {
    logger.info("Initializing Playwright browser...");

    const playwrightBrowsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;

    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,SitePerProcess",
      ],
    };

    if (playwrightBrowsersPath) {
      launchOptions.executablePath = undefined; // Let Playwright find the browser in the custom path
    }

    try {
      browser = await chromium.launch(launchOptions);
      logger.info("Playwright browser initialized successfully");

      // Handle browser close event
      browser.on("disconnected", () => {
        logger.warn("Browser disconnected");
        browser = null;
        browserInitPromise = null;
      });

      return browser;
    } catch (error) {
      logger.error("Failed to launch browser", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  })();

  return browserInitPromise;
}

// Close browser
async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    browserInitPromise = null;
  }
}

// Capture website screenshots
export async function captureWebsite(
  url: string
): Promise<CaptureResult> {
  const startTime = Date.now();
  let page: Page | null = null;

  try {
    // Normalize URL
    let targetUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      targetUrl = `https://${url}`;
    }

    // Initialize browser if needed
    const browserInstance = await initBrowser();

    // Create new page with viewport
    page = await browserInstance.newPage();

    // Set viewport for desktop (1440px width)
    await page.setViewportSize({ width: 1440, height: 900 });

    logger.debug("Navigating to URL", { url: targetUrl });

    // Navigate with timeout
    const navigationPromise = page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for network to be idle
    await Promise.race([
      navigationPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Navigation timeout")), 30000)
      ),
    ]);

    // Wait a bit for any lazy-loaded content
    await page.waitForTimeout(2000);

    // Get page metadata
    const title = await page.title();
    const loadTime = Date.now() - startTime;

    // Capture desktop screenshot
    const desktopScreenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    // Capture mobile screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const mobileScreenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    // Close page
    await page.close();
    page = null;

    // Calculate total duration
    const duration = Date.now() - startTime;

    return {
      success: true,
      url: targetUrl,
      screenshots: {
        desktop: {
          url: "", // Will be set after S3 upload
          path: desktopScreenshot.toString("base64"),
          width: 1440,
          height: 900,
        },
        mobile: {
          url: "", // Will be set after S3 upload
          path: mobileScreenshot.toString("base64"),
          width: 375,
          height: 812,
        },
      },
      viewport: {
        desktop: { width: 1440, height: 900 },
        mobile: { width: 375, height: 812 },
      },
      timestamp: new Date().toISOString(),
      metadata: {
        title,
        loadTime,
      },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Close page if still open
    if (page) {
      await page.close();
      page = null;
    }

    logger.error("Failed to capture website", { url, error: errorMessage });

    return {
      success: false,
      url,
      screenshots: {
        desktop: {
          url: "",
          path: "",
          width: 0,
          height: 0,
        },
      },
      viewport: {
        desktop: { width: 1440, height: 900 },
        mobile: { width: 375, height: 812 },
      },
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };
  }
}

// Capture with annotations (call this from worker after AI analysis)
export async function captureWithAnnotations(url: string): Promise<string> {
  try {
    const browserInstance = await initBrowser();
    const page = await browserInstance.newPage();

    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to page
    let targetUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      targetUrl = `https://${url}`;
    }

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Add visual markers for issues
    await page.evaluate(() => {
      // This would be enhanced with actual issue coordinates from AI analysis
      // For now, just add a simple overlay
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 99999;
        background: rgba(59, 130, 246, 0.1);
      `;
      document.body.appendChild(overlay);
    });

    // Capture screenshot with annotations
    const annotatedScreenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    await page.close();

    return annotatedScreenshot.toString("base64");

  } catch (error) {
    logger.error("Failed to capture with annotations", { error });
    throw error;
  }
}

// Cleanup function for graceful shutdown
export async function cleanupPlaywright(): Promise<void> {
  await closeBrowser();
}

export { initBrowser, closeBrowser };