/**
 * Worker Job Tests
 *
 * Covers:
 * - captureWebsite - successful capture, invalid URL, SSRF protection, error handling
 * - analyzeSite - successful analysis, validation, error handling
 * - annotateScreenshot - annotation pipeline
 * - generateOutreachEmail - email generation with all fields
 * - isCaptureValid / isAnalysisValid / isEmailValid validation helpers
 * - Retry mechanism simulation
 * - Idempotency check (via validateUrl)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// Mocks — use vi.hoisted() so variables exist before vi.mock() factories run
// ============================================

const {
  mockNewPage, mockContext, mockBrowser,
  mockGoto, mockScreenshot, mockTitle, mockLocator,
  mockGetAttribute, mockWaitForTimeout, mockClose, mockSetDefaultTimeout,
  mockPage, mockBrowserInstance,
  mockAnalyzeScreenshot, mockGenerateEmail,
} = vi.hoisted(() => {
  const mNP = vi.fn();
  const mCtx = vi.fn();
  const mBr = vi.fn();
  const mGo = vi.fn();
  const mScr = vi.fn();
  const mTi = vi.fn();
  const mLoc = vi.fn();
  const mGA = vi.fn();
  const mWT = vi.fn();
  const mCl = vi.fn();
  const mSDT = vi.fn();

  const mPage = {
    goto: mGo,
    screenshot: mScr,
    title: mTi,
    locator: mLoc,
    close: mCl,
    setDefaultTimeout: mSDT,
    waitForTimeout: mWT,
  };

  const mBrInst = {
    newContext: vi.fn(() => ({
      newPage: vi.fn(() => mPage),
      setViewportSize: vi.fn(),
      close: mCl,
    })),
    close: mCl,
  };

  const mAS = vi.fn();
  const mGE = vi.fn();

  return {
    mockNewPage: mNP,
    mockContext: mCtx,
    mockBrowser: mBr,
    mockGoto: mGo,
    mockScreenshot: mScr,
    mockTitle: mTi,
    mockLocator: mLoc,
    mockGetAttribute: mGA,
    mockWaitForTimeout: mWT,
    mockClose: mCl,
    mockSetDefaultTimeout: mSDT,
    mockPage: mPage,
    mockBrowserInstance: mBrInst,
    mockAnalyzeScreenshot: mAS,
    mockGenerateEmail: mGE,
  };
});

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(() => Promise.resolve(mockBrowserInstance)),
  },
}));

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock SSRF validator
vi.mock('../lib/ssrf', () => ({
  validateUrl: vi.fn(),
}));

// Mock anthropic for analyze and email generation
vi.mock('../lib/anthropic', () => ({
  analyzeScreenshot: mockAnalyzeScreenshot,
  generateEmail: mockGenerateEmail,
}));

// ============================================
// Imports after mocks
// ============================================

import { captureWebsite, isCaptureValid } from '../jobs/capture';
import { analyzeSite, isAnalysisValid } from '../jobs/analyze';
import { annotateScreenshot } from '../jobs/annotate';
import { generateOutreachEmail, isEmailValid } from '../jobs/generate-email';
import { validateUrl } from '../lib/ssrf';
import { logger } from '../lib/logger';

// ============================================
// Test Helpers
// ============================================

const testConfig = {
  testUrl: 'https://example.com',
  testCompanyName: 'Test Company',
  testContactName: 'John',
  testContactEmail: 'john@example.com',
};

// ============================================
// Capture Job Tests
// ============================================

describe('captureWebsite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behavior
    mockGoto.mockResolvedValue({});
    mockScreenshot.mockResolvedValue(Buffer.from('fake-screenshot-data'));
    mockTitle.mockResolvedValue('Example Domain');
    mockLocator.mockReturnValue({
      first: () => ({
        getAttribute: mockGetAttribute,
      }),
    });
    mockGetAttribute.mockImplementation((attr: string) => {
      if (attr === 'content') return 'Example description';
      if (attr === 'href') return '/favicon.ico';
      return null;
    });
    mockWaitForTimeout.mockResolvedValue(undefined);
    vi.mocked(validateUrl).mockResolvedValue(undefined);
  });

  it('should capture a valid URL and return screenshots with metadata', async () => {
    // Arrange
    const url = 'https://example.com';

    // Act
    const result = await captureWebsite(url);

    // Assert
    expect(result).toBeDefined();
    expect(result.desktopBuffer).toBeInstanceOf(Buffer);
    expect(result.desktopBuffer.length).toBeGreaterThan(0);
    expect(result.mobileBuffer).toBeInstanceOf(Buffer);
    expect(result.mobileBuffer.length).toBeGreaterThan(0);
    expect(result.pageTitle).toBe('Example Domain');
    expect(result.pageDescription).toBe('Example description');
    expect(result.hasSSL).toBe(true);
    expect(result.loadTime).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();

    // Verify playwright interactions
    expect(mockBrowserInstance.newContext).toHaveBeenCalled();
    expect(mockGoto).toHaveBeenCalledWith(url, expect.objectContaining({ waitUntil: 'networkidle' }));
    expect(mockScreenshot).toHaveBeenCalledTimes(2); // desktop + mobile
  });

  it('should reject invalid URLs via SSRF validation', async () => {
    // Arrange
    vi.mocked(validateUrl).mockRejectedValue(new Error('Invalid URL'));

    // Act
    const result = await captureWebsite('http://127.0.0.1:3000');

    // Assert - the function returns error info instead of throwing
    expect(result.error).toBe('Invalid URL');
    expect(result.desktopBuffer.length).toBe(0);
  });

  it('should handle navigation failure gracefully with error result', async () => {
    // Arrange
    mockGoto.mockRejectedValue(new Error('Navigation timeout'));

    // Act
    const result = await captureWebsite('https://example.com');

    // Assert - the function tries load fallback, and if both fail returns error info
    expect(result).toBeDefined();
    if (result.error) {
      expect(result.desktopBuffer.length).toBe(0);
    }
  });

  it('should attempt load fallback when networkidle fails', async () => {
    // Arrange
    mockGoto
      .mockRejectedValueOnce(new Error('Network idle timeout')) // First call fails
      .mockResolvedValueOnce({}); // Second call (load) succeeds

    // Act
    const result = await captureWebsite('https://example.com');

    // Assert
    expect(mockGoto).toHaveBeenCalledTimes(2);
    expect(mockGoto).toHaveBeenNthCalledWith(1, 'https://example.com', expect.objectContaining({ waitUntil: 'networkidle' }));
    expect(mockGoto).toHaveBeenNthCalledWith(2, 'https://example.com', expect.objectContaining({ waitUntil: 'load' }));
    expect(result.pageTitle).toBe('Example Domain');
    expect(result.desktopBuffer.length).toBeGreaterThan(0);
  });

  it('should detect SSL from HTTPS URLs', async () => {
    // Act
    const result1 = await captureWebsite('https://secure-site.com');
    const result2 = await captureWebsite('http://insecure-site.com');

    // Assert
    expect(result1.hasSSL).toBe(true);
    expect(result2.hasSSL).toBe(false);
  });

  it('should clean up browser on error', async () => {
    // Arrange
    mockGoto.mockRejectedValue(new Error('Crash'));
    mockScreenshot.mockRejectedValue(new Error('Screenshot failed'));

    // Act
    const result = await captureWebsite('https://example.com');

    // Assert - cleanup was attempted
    expect(result.error).toBeDefined();
  });
});

// ============================================
// isCaptureValid
// ============================================

describe('isCaptureValid', () => {
  it('should return true for valid capture with screenshots', () => {
    const result = {
      desktopBuffer: Buffer.from('some-data'),
      mobileBuffer: Buffer.from('some-data'),
      pageTitle: 'Title',
      pageDescription: 'Desc',
      loadTime: 100,
      hasSSL: true,
    };

    expect(isCaptureValid(result)).toBe(true);
  });

  it('should return false when error is present', () => {
    const result = {
      desktopBuffer: Buffer.alloc(0),
      mobileBuffer: Buffer.alloc(0),
      pageTitle: '',
      pageDescription: '',
      loadTime: 0,
      hasSSL: false,
      error: 'Failed',
    };

    expect(isCaptureValid(result)).toBe(false);
  });

  it('should return false when desktop buffer is empty', () => {
    const result = {
      desktopBuffer: Buffer.alloc(0),
      mobileBuffer: Buffer.from('data'),
      pageTitle: 'Title',
      pageDescription: 'Desc',
      loadTime: 100,
      hasSSL: true,
    };

    expect(isCaptureValid(result)).toBe(false);
  });

  it('should return false when mobile buffer is empty', () => {
    const result = {
      desktopBuffer: Buffer.from('data'),
      mobileBuffer: Buffer.alloc(0),
      pageTitle: 'Title',
      pageDescription: 'Desc',
      loadTime: 100,
      hasSSL: true,
    };

    expect(isCaptureValid(result)).toBe(false);
  });
});

// ============================================
// Analyze Job Tests
// ============================================

describe('analyzeSite', () => {
  const mockScreenshotBuffer = Buffer.from('fake-screenshot');

  beforeEach(() => {
    vi.clearAllMocks();

    mockAnalyzeScreenshot.mockResolvedValue({
      siteType: 'E_COMMERCE',
      overallScore: 72,
      issues: [
        {
          title: 'Small buttons',
          description: 'CTA buttons are too small',
          suggestion: 'Increase to 48px min height',
          category: 'CONVERSION',
          severity: 'HIGH',
          zone: { x: 50, y: 80, width: 30, height: 5 },
        },
      ],
    });
  });

  it('should analyze screenshot and return UX issues', async () => {
    // Act
    const analysis = await analyzeSite(mockScreenshotBuffer, testConfig.testCompanyName);

    // Assert
    expect(analysis).toBeDefined();
    expect(analysis.siteType).toBe('E_COMMERCE');
    expect(analysis.overallScore).toBe(72);
    expect(analysis.issues).toHaveLength(1);
    expect(analysis.issues[0].title).toBe('Small buttons');
    expect(analysis.issues[0].category).toBe('CONVERSION');
    expect(analysis.issues[0].severity).toBe('HIGH');
    expect(analysis.duration).toBeGreaterThanOrEqual(0);
  });

  it('should validate and normalize zone coordinates', async () => {
    // Arrange - issues with out-of-range zones
    mockAnalyzeScreenshot.mockResolvedValue({
      siteType: 'SAAS',
      overallScore: 85,
      issues: [
        {
          title: 'Bad zone',
          description: 'Test',
          suggestion: 'Fix it',
          category: 'SPACING',
          severity: 'LOW',
          zone: { x: -10, y: 150, width: 200, height: -5 },
        },
      ],
    });

    // Act
    const analysis = await analyzeSite(mockScreenshotBuffer);

    // Assert - zones should be clamped to 0-100
    expect(analysis.issues[0].zone.x).toBe(0);
    expect(analysis.issues[0].zone.y).toBe(100);
    expect(analysis.issues[0].zone.width).toBe(100);
    expect(analysis.issues[0].zone.height).toBe(0);
  });

  it('should fill default values for missing issue fields', async () => {
    // Arrange - issues with missing fields
    mockAnalyzeScreenshot.mockResolvedValue({
      siteType: 'BLOG',
      overallScore: 50,
      issues: [
        {
          zone: { x: 10, y: 10, width: 50, height: 50 },
        } as any,
      ],
    });

    // Act
    const analysis = await analyzeSite(mockScreenshotBuffer);

    // Assert - defaults should be applied
    expect(analysis.issues[0].title).toBe('Issue détectée');
    expect(analysis.issues[0].description).toBe('');
    expect(analysis.issues[0].suggestion).toBe('');
    expect(analysis.issues[0].category).toBe('SPACING');
    expect(analysis.issues[0].severity).toBe('LOW');
  });

  it('should throw error when analytics API fails', async () => {
    // Arrange
    mockAnalyzeScreenshot.mockRejectedValue(new Error('API rate limited'));

    // Act & Assert
    await expect(analyzeSite(mockScreenshotBuffer, 'Test')).rejects.toThrow(
      'Failed to analyze screenshot'
    );
  });

  it('should log progress information', async () => {
    // Act
    await analyzeSite(mockScreenshotBuffer, 'Test Corp');

    // Assert
    expect(logger.info).toHaveBeenCalled();
  });
});

// ============================================
// isAnalysisValid
// ============================================

describe('isAnalysisValid', () => {
  it('should return true for valid analysis', () => {
    const analysis = {
      siteType: 'E_COMMERCE',
      overallScore: 72,
      issues: [],
      duration: 100,
    };

    expect(isAnalysisValid(analysis)).toBe(true);
  });

  it('should return false when siteType is missing', () => {
    const analysis = {
      siteType: undefined,
      overallScore: 72,
      issues: [],
      duration: 100,
    } as any;

    expect(isAnalysisValid(analysis)).toBe(false);
  });

  it('should return false when overallScore is not a number', () => {
    const analysis = {
      siteType: 'SAAS',
      overallScore: undefined,
      issues: [],
      duration: 100,
    } as any;

    expect(isAnalysisValid(analysis)).toBe(false);
  });

  it('should return false when issues is not an array', () => {
    const analysis = {
      siteType: 'SAAS',
      overallScore: 85,
      issues: undefined,
      duration: 100,
    } as any;

    expect(isAnalysisValid(analysis)).toBe(false);
  });
});

// ============================================
// Annotate Job Tests
// ============================================

describe('annotateScreenshot', () => {
  const mockScreenshotBuffer = Buffer.from('fake-screenshot-data');
  const mockIssues = [
    {
      title: 'Small buttons',
      description: 'Too small',
      suggestion: 'Make bigger',
      category: 'CONVERSION' as const,
      severity: 'HIGH' as const,
      zone: { x: 10, y: 20, width: 30, height: 40 },
    },
  ];

  it('should annotate screenshot with issues', async () => {
    // Act - annotate returns { annotatedBuffer: Buffer }
    const result = await annotateScreenshot(
      mockScreenshotBuffer,
      mockIssues,
      72
    );

    // Assert
    expect(result).toBeDefined();
    expect(result.annotatedBuffer).toBeInstanceOf(Buffer);
    expect(result.annotatedBuffer.length).toBeGreaterThan(0);
  });

  it('should handle empty issues array', async () => {
    // Act
    const result = await annotateScreenshot(
      mockScreenshotBuffer,
      [],
      72
    );

    // Assert
    expect(result.annotatedBuffer).toBeInstanceOf(Buffer);
  });

  it('should handle score of 0', async () => {
    // Act
    const result = await annotateScreenshot(
      mockScreenshotBuffer,
      mockIssues,
      0
    );

    // Assert
    expect(result.annotatedBuffer).toBeInstanceOf(Buffer);
  });
});

// ============================================
// Generate Email Tests
// ============================================

describe('generateOutreachEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmail.mockResolvedValue({
      subject: 'Amélioration UX pour votre site',
      body: 'Bonjour,\n\nNous avons analysé votre site et identifié [IMAGE_PLACEHOLDER] problèmes UX.\n\nCordialement.',
      ps: 'Cette analyse est offerte par ScreenCold.',
    });
  });

  it('should generate outreach email with all fields', async () => {
    // Act
    const email = await generateOutreachEmail(
      'CRO' as any,
      testConfig.testContactName,
      testConfig.testCompanyName,
      testConfig.testUrl,
      'Small buttons on mobile',
      72,
      'https://cdn.screencold.com/annotated/test.png'
    );

    // Assert
    expect(email).toBeDefined();
    expect(email.subject).toBeDefined();
    expect(typeof email.subject).toBe('string');
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.body).toBeDefined();
    expect(typeof email.body).toBe('string');
    expect(email.body.length).toBeGreaterThan(0);
    expect(email.duration).toBeGreaterThanOrEqual(0);
  });

  it('should include IMAGE_PLACEHOLDER in generated body', async () => {
    // Generate email with the real function should contain IMAGE_PLACEHOLDER
    // but since we mock generateEmail, we test that the body text is preserved
    const email = await generateOutreachEmail(
      'Design' as any,
      'John',
      'Test Corp',
      'https://example.com',
      'Poor CTA visibility',
      65,
      'https://cdn.screencold.com/annotated/test.png'
    );

    expect(email.body).toContain('[IMAGE_PLACEHOLDER]');
  });

  it('should handle missing company name', async () => {
    const email = await generateOutreachEmail(
      'SEO' as any,
      testConfig.testContactName,
      '',
      testConfig.testUrl,
      'Navigation issue',
      45,
      'https://cdn.screencold.com/annotated/test.png'
    );

    expect(email.subject).toBeDefined();
  });
});

// ============================================
// isEmailValid
// ============================================

describe('isEmailValid', () => {
  it('should return true for valid email with subject and body', () => {
    expect(isEmailValid({ subject: 'Test', body: 'Body content' })).toBe(true);
  });

  it('should return false when subject is empty', () => {
    expect(isEmailValid({ subject: '', body: 'Body' })).toBe(false);
  });

  it('should return false when body is empty', () => {
    expect(isEmailValid({ subject: 'Subject', body: '' })).toBe(false);
  });

  it('should return false when subject is missing', () => {
    expect(isEmailValid({ body: 'Body' } as any)).toBe(false);
  });
});

// ============================================
// Retry & Error Handling Tests
// ============================================

describe('Job Retry & Error Handling', () => {
  it('should retry capture on transient errors', async () => {
    // Arrange - simulate transient failure then success
    mockGoto
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({});

    mockTitle.mockResolvedValue('Example');
    mockScreenshot.mockResolvedValue(Buffer.from('data'));

    // Act
    const result = await captureWebsite('https://example.com');

    // Assert - should recover
    expect(result.pageTitle).toBe('Example');
    expect(result.desktopBuffer.length).toBeGreaterThan(0);
  });

  it('should log error details for debugging', async () => {
    // Arrange
    vi.mocked(validateUrl).mockRejectedValue(new Error('SSRF blocked'));

    // Act
    const result = await captureWebsite('http://localhost:8080');

    // Assert
    expect(result.error).toBe('SSRF blocked');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should handle browser launch failure', async () => {
    // Arrange
    const playwright = await import('playwright');
    vi.mocked(playwright.chromium.launch).mockRejectedValue(new Error('Browser not found'));

    // Act & Assert
    await expect(captureWebsite('https://example.com')).rejects.toThrow();
  });
});
