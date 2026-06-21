import { test, expect } from "@playwright/test";
import { login } from "../fixtures/helpers";
import { TEST_URLS } from "../fixtures/mock-data";

test.describe("Worker Pipeline & Error Handling", () => {
  test.describe("Audit Pipeline API", () => {
    test("creates audit via POST /api/audits and returns 201 with auditId", async ({
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

    test(
      "polls GET /api/audits/[id] until READY and returns populated fields",
      async ({ page }) => {
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
        expect(audit).toHaveProperty("overallScore");
        expect(typeof audit!.overallScore).toBe("number");
        expect(audit).toHaveProperty("issues");
        expect(Array.isArray(audit!.issues)).toBe(true);
      }
    );

    test("returns 400 VALIDATION_ERROR for invalid URL", async ({ page }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.invalid },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error", "VALIDATION_ERROR");
    });

    test("returns 400 VALIDATION_ERROR for non-http protocol", async ({
      page,
    }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.nonHTTP },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error");
    });
  });

  test.describe("SSRF Protection", () => {
    test("blocks localhost URL with 400 INVALID_URL", async ({ page }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.localhost },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error", "INVALID_URL");
    });

    test("blocks private IP 10.x.x.x with 400 INVALID_URL", async ({
      page,
    }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.privateIP },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error", "INVALID_URL");
    });

    test("blocks AWS metadata IP with 400 INVALID_URL", async ({ page }) => {
      await login(page);

      const response = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.awsMetadata },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty("error", "INVALID_URL");
    });
  });

  test.describe("Authentication & Authz", () => {
    test("returns 401 when creating audit without authentication", async ({
      request,
    }) => {
      const response = await request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });

      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body).toHaveProperty("error", "UNAUTHORIZED");
    });

    test("returns 401 when polling audit without authentication", async ({
      page,
      request,
    }) => {
      await login(page);

      const createRes = await page.request.post("/api/audits", {
        data: { url: TEST_URLS.valid },
      });
      expect(createRes.status()).toBe(201);

      const { auditId } = await createRes.json();
      expect(auditId).toBeTruthy();

      const response = await request.get(`/api/audits/${auditId}`);

      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body).toHaveProperty("error", "UNAUTHORIZED");
    });
  });

  test.describe("Health & Status", () => {
    test("returns 200 OK from GET /api/health with status field", async ({
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
    });

    test("allows unauthenticated access to GET /api/health", async ({
      page,
    }) => {
      const response = await page.request.get("/api/health");

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status");
    });
  });
});
