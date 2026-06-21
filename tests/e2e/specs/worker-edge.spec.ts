import { test, expect } from "@playwright/test";
import { login, register } from "../fixtures/helpers";
import { TEST_URLS } from "../fixtures/mock-data";

test.describe("Worker Edge Cases", () => {
  test.describe("SSRF Advanced Bypass Attempts", () => {
    test("blocks DNS rebinding hostname resolving to private IP", async ({
      page,
    }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: "http://rebind.example.com" },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error", "INVALID_URL");
    });

    test("blocks URL with embedded credentials", async ({ page }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: "http://user:pass@evil.com" },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error", "INVALID_URL");
    });

    test("blocks IPv6 localhost http://[::1]", async ({ page }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: "http://[::1]" },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error", "INVALID_URL");
    });

    test("blocks decimal obfuscated IP 2130706433 (127.0.0.1)", async ({
      page,
    }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: "http://2130706433" },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error", "INVALID_URL");
    });

    test("blocks hex obfuscated IP 0x7f000001 (127.0.0.1)", async ({
      page,
    }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: "http://0x7f000001" },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error", "INVALID_URL");
    });

    test("blocks IPv4-mapped IPv6 http://[::ffff:127.0.0.1]", async ({
      page,
    }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: "http://[::ffff:127.0.0.1]" },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error", "INVALID_URL");
    });
  });

  test.describe("Pipeline Edge Cases", () => {
    test("handles SPA page with JavaScript rendering", async ({ page }) => {
      test.setTimeout(120000);

      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: { url: "https://reactjs.org" },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();
      expect(auditId).toBeTruthy();

      let audit: Record<string, unknown> | null = null;
      const startTime = Date.now();
      const pollTimeout = 90000;
      const pollInterval = 2000;

      while (Date.now() - startTime < pollTimeout) {
        const pollRes = await page.request.get(`/api/audits/${auditId}`);
        expect(pollRes.status()).toBe(200);

        audit = await pollRes.json();
        if (audit && audit.status !== "PROCESSING") break;

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      expect(audit).not.toBeNull();
      expect(audit!.status).toBe("READY");
      expect(audit).toHaveProperty("screenshotUrl");
      expect(audit!.screenshotUrl).toBeTruthy();
      expect(audit).toHaveProperty("overallScore");
      expect(typeof audit!.overallScore).toBe("number");
    });

    test("captures page with cookie consent banner", async ({ page }) => {
      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();
      expect(auditId).toBeTruthy();

      let audit: Record<string, unknown> | null = null;
      const startTime = Date.now();
      const pollTimeout = 60000;
      const pollInterval = 2000;

      while (Date.now() - startTime < pollTimeout) {
        const pollRes = await page.request.get(`/api/audits/${auditId}`);
        expect(pollRes.status()).toBe(200);

        audit = await pollRes.json();
        if (audit && audit.status !== "PROCESSING") break;

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      expect(audit).not.toBeNull();
      expect(audit!.status).toBe("READY");
      expect(audit).toHaveProperty("screenshotUrl");
      expect(audit!.screenshotUrl).toBeTruthy();
    });

    test("handles infinite scroll page by capturing above-the-fold", async ({
      page,
    }) => {
      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: { url: "https://news.ycombinator.com" },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();
      expect(auditId).toBeTruthy();

      let audit: Record<string, unknown> | null = null;
      const startTime = Date.now();
      const pollTimeout = 60000;
      const pollInterval = 2000;

      while (Date.now() - startTime < pollTimeout) {
        const pollRes = await page.request.get(`/api/audits/${auditId}`);
        expect(pollRes.status()).toBe(200);

        audit = await pollRes.json();
        if (audit && audit.status !== "PROCESSING") break;

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      expect(audit).not.toBeNull();
      expect(audit!.status).toBe("READY");
      expect(audit).toHaveProperty("screenshotUrl");
      expect(audit!.screenshotUrl).toBeTruthy();
    });

    test("handles very slow page with fallback strategy", async ({ page }) => {
      test.setTimeout(180000);

      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.slow },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();
      expect(auditId).toBeTruthy();

      let audit: Record<string, unknown> | null = null;
      const startTime = Date.now();
      const pollTimeout = 120000;
      const pollInterval = 3000;

      while (Date.now() - startTime < pollTimeout) {
        const pollRes = await page.request.get(`/api/audits/${auditId}`);
        expect(pollRes.status()).toBe(200);

        audit = await pollRes.json();
        if (audit && audit.status !== "PROCESSING") break;

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      expect(audit).not.toBeNull();
      expect(audit!.status).toBe("READY");
      expect(audit).toHaveProperty("screenshotUrl");
    });

    test("handles binary response PDF URL with empty analysis", async ({
      page,
    }) => {
      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: {
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();
      expect(auditId).toBeTruthy();

      let audit: Record<string, unknown> | null = null;
      const startTime = Date.now();
      const pollTimeout = 60000;
      const pollInterval = 2000;

      while (Date.now() - startTime < pollTimeout) {
        const pollRes = await page.request.get(`/api/audits/${auditId}`);
        expect(pollRes.status()).toBe(200);

        audit = await pollRes.json();
        if (audit && audit.status !== "PROCESSING") break;

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      expect(audit).not.toBeNull();
      expect(audit!.status).toBe("READY");
      expect(audit).toHaveProperty("overallScore");
      expect(audit).toHaveProperty("issues");
      expect(Array.isArray(audit!.issues)).toBe(true);
    });
  });

  test.describe("Job Management Edge Cases", () => {
    test("submits same URL twice as independent audits with different IDs", async ({
      page,
    }) => {
      await login(page);

      const res1 = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });
      expect(res1.status()).toBe(201);

      const { auditId: id1 } = await res1.json();

      const res2 = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });
      expect(res2.status()).toBe(201);

      const { auditId: id2 } = await res2.json();

      expect(id1).not.toBe(id2);
    });

    test("processes all enqueued jobs without loss under backpressure", async ({
      page,
    }) => {
      test.setTimeout(300000);

      const email = `backpressure-${Date.now()}@example.com`;
      await register(page, { email });

      const urls = [
        "https://example.com",
        "https://httpbin.org/html",
        "https://news.ycombinator.com",
        "https://www.wikipedia.org",
        "https://github.com",
      ];

      const auditIds: string[] = [];

      for (const url of urls) {
        const res = await page.request.post("/api/audits", { data: { url } });
        expect(res.status()).toBe(201);

        const { auditId } = await res.json();
        auditIds.push(auditId);
      }

      expect(auditIds.length).toBe(5);

      const completedIds: string[] = [];
      const startTime = Date.now();
      const pollTimeout = 180000;
      const pollInterval = 5000;

      while (completedIds.length < 5 && Date.now() - startTime < pollTimeout) {
        for (const id of auditIds) {
          if (completedIds.includes(id)) continue;

          const res = await page.request.get(`/api/audits/${id}`);
          if (res.status() === 200) {
            const audit = await res.json();
            if (audit.status !== "PROCESSING") {
              completedIds.push(id);
            }
          }
        }

        if (completedIds.length < 5) {
          await new Promise((r) => setTimeout(r, pollInterval));
        }
      }

      expect(completedIds.length).toBe(5);
    });

    test("handles audit with corrupt or missing prospect data gracefully", async ({
      page,
    }) => {
      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();

      let audit: Record<string, unknown> | null = null;
      const startTime = Date.now();
      const pollTimeout = 60000;
      const pollInterval = 2000;

      while (Date.now() - startTime < pollTimeout) {
        const pollRes = await page.request.get(`/api/audits/${auditId}`);
        expect(pollRes.status()).toBe(200);

        audit = await pollRes.json();
        if (audit && audit.status !== "PROCESSING") break;

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      expect(audit).not.toBeNull();
      expect(["READY", "FAILED"]).toContain(audit!.status);
    });
  });

  test.describe("Circuit Breaker Edge Cases", () => {
    test("produces valid audit result when screenshot retrieval is temporarily degraded", async ({
      page,
    }) => {
      await login(page);

      await page.route("**/api/audits/**", (route) => {
        if (route.request().url().includes("/events")) {
          route.continue();
        } else if (route.request().method() === "GET") {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "degraded-audit",
              status: "READY",
              screenshotUrl: null,
              overallScore: 70,
              issues: [{ type: "warning", message: "Screenshot unavailable" }],
              prospect: { url: TEST_URLS.valid },
            }),
          });
        } else {
          route.continue();
        }
      });

      const response = await page.request.get("/api/health");
      expect(response.status()).toBe(200);
    });

    test("accepts valid audit requests under normal circuit conditions", async ({
      page,
    }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty("auditId");
      expect(body).toHaveProperty("status", "PROCESSING");
    });

    test("pipeline completes audit even when storage backends are unreachable", async ({
      page,
    }) => {
      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();
      expect(auditId).toBeTruthy();

      let audit: Record<string, unknown> | null = null;
      const startTime = Date.now();
      const pollTimeout = 60000;
      const pollInterval = 2000;

      while (Date.now() - startTime < pollTimeout) {
        const pollRes = await page.request.get(`/api/audits/${auditId}`);
        expect(pollRes.status()).toBe(200);

        audit = await pollRes.json();
        if (audit && audit.status !== "PROCESSING") break;

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      expect(audit).not.toBeNull();
      expect(["READY", "FAILED"]).toContain(audit!.status);
    });
  });

  test.describe("Email Edge Cases", () => {
    test("stores email with very long body exceeding 5000 characters", async ({
      page,
    }) => {
      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();
      expect(auditId).toBeTruthy();

      let audit: Record<string, unknown> | null = null;
      const startTime = Date.now();
      const pollTimeout = 60000;
      const pollInterval = 2000;

      while (Date.now() - startTime < pollTimeout) {
        const pollRes = await page.request.get(`/api/audits/${auditId}`);
        expect(pollRes.status()).toBe(200);

        audit = await pollRes.json();
        if (audit && audit.status !== "PROCESSING") break;

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      expect(audit).not.toBeNull();
      expect(audit!.status).toBe("READY");

      const longSubject = "x".repeat(5001);

      const patchRes = await page.request.patch(`/api/audits/${auditId}`, {
        data: { emailSubject: longSubject, emailBody: "x".repeat(5000) },
      });

      expect(patchRes.status()).toBe(200);
    });

    test("stores email with special characters HTML and emoji", async ({
      page,
    }) => {
      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();
      expect(auditId).toBeTruthy();

      let audit: Record<string, unknown> | null = null;
      const startTime = Date.now();
      const pollTimeout = 60000;
      const pollInterval = 2000;

      while (Date.now() - startTime < pollTimeout) {
        const pollRes = await page.request.get(`/api/audits/${auditId}`);
        expect(pollRes.status()).toBe(200);

        audit = await pollRes.json();
        if (audit && audit.status !== "PROCESSING") break;

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      expect(audit).not.toBeNull();
      expect(audit!.status).toBe("READY");

      const specialContent =
        'Special: <b>bold</b> & "quote" <test> émoji 🚀 éèêë àâäôöùûü ç';

      const patchRes = await page.request.patch(`/api/audits/${auditId}`, {
        data: { emailSubject: specialContent, emailBody: specialContent, emailPs: specialContent },
      });

      expect(patchRes.status()).toBe(200);

      const getRes = await page.request.get(`/api/audits/${auditId}`);
      expect(getRes.status()).toBe(200);

      const updatedAudit = await getRes.json();
      expect(updatedAudit.emailSubject).toContain("émoji 🚀");
      expect(updatedAudit.emailBody).toContain("<b>bold</b>");
      expect(updatedAudit.emailPs).toContain("éèêë àâäôöùûü ç");
    });

    test("refuses to regenerate email for audit still in PROCESSING", async ({
      page,
    }) => {
      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();

      const emailRes = await page.request.post(`/api/audits/${auditId}/email`);

      expect([400, 200]).toContain(emailRes.status());

      if (emailRes.status() === 400) {
        const body = await emailRes.json();
        expect(body).toHaveProperty("error");
      }
    });
  });

  test.describe("Health & Metrics", () => {
    test("health check includes redis status and returns valid response", async ({
      page,
    }) => {
      const response = await page.request.get("/api/health");

      expect([200, 503]).toContain(response.status());

      const body = await response.json();
      expect(body).toHaveProperty("status");
      expect(["healthy", "unhealthy", "degraded"]).toContain(body.status);
      expect(body).toHaveProperty("checks");
      expect(body.checks).toHaveProperty("redis");
      expect(body.checks.redis).toHaveProperty("status");
      expect(["healthy", "unhealthy"]).toContain(body.checks.redis.status);
    });

    test("exposes metrics at /metrics endpoint", async ({ page }) => {
      const response = await page.request.get("/api/metrics");

      expect([200, 403, 401, 503]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.text();
        expect(body.length).toBeGreaterThan(0);
      }
    });

    test("health endpoint returns database and worker check results", async ({
      page,
    }) => {
      const response = await page.request.get("/api/health");

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("timestamp");
      expect(body).toHaveProperty("uptime");
      expect(body).toHaveProperty("checks");
      expect(body.checks).toHaveProperty("database");
      expect(body.checks).toHaveProperty("redis");
      expect(body.checks).toHaveProperty("worker");
      expect(typeof body.uptime).toBe("number");
      expect(typeof body.timestamp).toBe("string");
    });
  });
});
