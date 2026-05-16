/**
 * Integration tests for the audit processing pipeline
 * Tests: capture → analyze → annotate → generate-email
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { captureSite } from '../jobs/capture';
import { analyzeSite } from '../jobs/analyze';
import { annotateScreenshot } from '../jobs/annotate';
import { generateOutreachEmail } from '../jobs/generate-email';

// Mock config for tests
const testConfig = {
  testUrl: 'https://example.com',
  testCompanyName: 'Test Company',
  testContactName: 'John',
  testContactEmail: 'john@example.com',
};

describe('Audit Pipeline Integration', () => {
  describe('Step 1: Capture', () => {
    it('should capture a valid URL and return screenshot', async () => {
      const result = await captureSite(testConfig.testUrl);

      expect(result).toBeDefined();
      expect(result.desktopBuffer).toBeInstanceOf(Buffer);
      expect(result.desktopBuffer.length).toBeGreaterThan(0);
      expect(result.pageTitle).toBeDefined();
      expect(result.hasSSL).toBe(true);
    }, 30000);

    it('should reject invalid URLs', async () => {
      await expect(captureSite('invalid-url')).rejects.toThrow();
    });

    it('should reject private IP addresses', async () => {
      await expect(captureSite('http://127.0.0.1:3000')).rejects.toThrow();
      await expect(captureSite('http://localhost:3000')).rejects.toThrow();
      await expect(captureSite('http://10.0.0.1')).rejects.toThrow();
    }, 10000);
  });

  describe('Step 2: Analysis', () => {
    it('should analyze screenshot and return UX issues', async () => {
      // First capture a screenshot
      const captureResult = await captureSite(testConfig.testUrl);
      
      // Then analyze
      const analysis = await analyzeSite(
        captureResult.desktopBuffer,
        testConfig.testCompanyName
      );

      expect(analysis).toBeDefined();
      expect(analysis.siteType).toBeDefined();
      expect(typeof analysis.overallScore).toBe('number');
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(analysis.issues)).toBe(true);
    }, 30000);

    it('should return valid zone coordinates', async () => {
      const captureResult = await captureSite(testConfig.testUrl);
      const analysis = await analyzeSite(captureResult.desktopBuffer);

      for (const issue of analysis.issues) {
        expect(issue.zone).toBeDefined();
        expect(issue.zone.x).toBeGreaterThanOrEqual(0);
        expect(issue.zone.x).toBeLessThanOrEqual(100);
        expect(issue.zone.y).toBeGreaterThanOrEqual(0);
        expect(issue.zone.y).toBeLessThanOrEqual(100);
        expect(issue.zone.width).toBeGreaterThan(0);
        expect(issue.zone.height).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Step 3: Annotate', () => {
    it('should annotate screenshot with issues', async () => {
      const captureResult = await captureSite(testConfig.testUrl);
      const analysis = await analyzeSite(captureResult.desktopBuffer);

      const annotatedBuffer = await annotateScreenshot(
        captureResult.desktopBuffer,
        analysis.issues,
        testConfig.testCompanyName
      );

      expect(annotatedBuffer).toBeInstanceOf(Buffer);
      expect(annotatedBuffer.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Step 4: Generate Email', () => {
    it('should generate outreach email with all fields', async () => {
      const captureResult = await captureSite(testConfig.testUrl);
      const analysis = await analyzeSite(
        captureResult.desktopBuffer,
        testConfig.testCompanyName
      );

      const email = await generateOutreachEmail({
        companyName: testConfig.testCompanyName,
        contactName: testConfig.testContactName,
        contactEmail: testConfig.testContactEmail,
        issues: analysis.issues,
        overallScore: analysis.overallScore,
        url: testConfig.testUrl,
        agencyType: 'CRO Agency',
      });

      expect(email).toBeDefined();
      expect(email.subject).toBeDefined();
      expect(email.subject.length).toBeLessThanOrEqual(50);
      expect(email.body).toBeDefined();
      expect(email.body.length).toBeGreaterThan(0);
      expect(email.body.length).toBeLessThanOrEqual(1500);
    }, 30000);

    it('should include IMAGE_PLACEHOLDER in email body', async () => {
      const captureResult = await captureSite(testConfig.testUrl);
      const analysis = await analyzeSite(captureResult.desktopBuffer);

      const email = await generateOutreachEmail({
        companyName: testConfig.testCompanyName,
        contactName: testConfig.testContactName,
        contactEmail: testConfig.testContactEmail,
        issues: analysis.issues,
        overallScore: analysis.overallScore,
        url: testConfig.testUrl,
        agencyType: 'Design Agency',
      });

      expect(email.body).toContain('[IMAGE_PLACEHOLDER]');
    }, 30000);
  });

  describe('End-to-End Pipeline', () => {
    it('should complete full pipeline from URL to email', async () => {
      // Step 1: Capture
      const capture = await captureSite(testConfig.testUrl);
      expect(capture.desktopBuffer).toBeDefined();

      // Step 2: Analyze
      const analysis = await analyzeSite(
        capture.desktopBuffer,
        testConfig.testCompanyName
      );
      expect(analysis.issues.length).toBeGreaterThanOrEqual(0);

      // Step 3: Annotate
      const annotated = await annotateScreenshot(
        capture.desktopBuffer,
        analysis.issues,
        testConfig.testCompanyName
      );
      expect(annotated).toBeDefined();

      // Step 4: Generate Email
      const email = await generateOutreachEmail({
        companyName: testConfig.testCompanyName,
        contactName: testConfig.testContactName,
        contactEmail: testConfig.testContactEmail,
        issues: analysis.issues,
        overallScore: analysis.overallScore,
        url: testConfig.testUrl,
        agencyType: 'SEO Agency',
      });
      expect(email.subject).toBeDefined();
      expect(email.body).toBeDefined();
    }, 60000);
  });
});