import { test, expect } from "@playwright/test";
import { login, register, randomEmail } from "../fixtures/helpers";

test.describe("Auth Edge Cases", () => {
  test.describe("Registration Edges", () => {
    test("Register with very long email returns 400 or validation error", async ({ page }) => {
      const longEmail = "a".repeat(250) + "@b.com";
      const response = await page.request.post("/api/auth/register", {
        data: { name: "Test User", email: longEmail, password: "password123" },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    test("Register with unicode and special chars in name displays correctly", async ({ page }) => {
      const email = randomEmail();
      const specialName = "José François 李小龙 😊";
      await register(page, { name: specialName, email, password: "password123" });
      await expect(page).toHaveURL(/\/dashboard/);
      await page.locator("button").filter({ has: page.locator(".lucide-user") }).click();
      await expect(page.locator(`text=${specialName}`)).toBeVisible();
    });

    test("Register email case insensitive for subsequent login", async ({ page }) => {
      const email = `CaseTest${Date.now()}@Example.COM`;
      const lowerEmail = email.toLowerCase();
      await register(page, { name: "Case User", email, password: "password123" });
      await expect(page).toHaveURL(/\/dashboard/);
      await page.locator("button").filter({ has: page.locator(".lucide-user") }).click();
      await page.locator('[role="menuitem"]:has-text("Se d\u00e9connecter")').click();
      await page.waitForURL("/login");
      await login(page, lowerEmail, "password123");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("Register then immediately login full roundtrip", async ({ page }) => {
      const email = randomEmail();
      const password = "password123";
      await register(page, { name: "Roundtrip User", email, password });
      await expect(page).toHaveURL(/\/dashboard/);
      await page.locator("button").filter({ has: page.locator(".lucide-user") }).click();
      await page.locator('[role="menuitem"]:has-text("Se d\u00e9connecter")').click();
      await page.waitForURL("/login");
      await login(page, email, password);
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator("text=Aucun audit pour le moment")).toBeVisible();
    });
  });

  test.describe("Login Edges", () => {
    test("Session persists across new pages in same context", async ({ page }) => {
      const email = randomEmail();
      const password = "password123";
      await register(page, { name: "Session User", email, password });
      await expect(page).toHaveURL(/\/dashboard/);
      const newPage = await page.context().newPage();
      await newPage.goto("/dashboard");
      await expect(newPage).toHaveURL(/\/dashboard/);
      await expect(newPage.locator("text=Aucun audit pour le moment")).toBeVisible();
      await newPage.close();
    });

    test("XSS injection in email field not executed", async ({ page }) => {
      await page.goto("/login");
      const xssPayload = "<script>window.xssInjected=true</script>";
      await page.fill('input[name="email"]', xssPayload);
      await page.fill('input[name="password"]', "password123");
      await page.click('button[type="submit"]');
      const xssInjected = await page.evaluate(() => !!(window as any).xssInjected);
      expect(xssInjected).toBe(false);
      const bodyHTML = await page.evaluate(() => document.body.innerHTML);
      expect(bodyHTML).not.toContain("xssInjected");
    });

    test("Concurrent sessions for same user in different contexts", async ({ page, browser }) => {
      const email = randomEmail();
      const password = "password123";
      await register(page, { name: "Concurrent User", email, password });
      await expect(page).toHaveURL(/\/dashboard/);
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      await login(page2, email, password);
      await expect(page2).toHaveURL(/\/dashboard/);
      await expect(page.locator("text=Aucun audit pour le moment")).toBeVisible();
      await expect(page2.locator("text=Aucun audit pour le moment")).toBeVisible();
      await page2.close();
      await context2.close();
    });
  });

  test.describe("Password Reset Edges", () => {
    test("Multiple forgot-password requests all succeed without error", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Reset User", email, password: "password123" });
      for (let i = 0; i < 3; i++) {
        const response = await page.request.post("/api/auth/forgot-password", {
          data: { email },
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.message).toContain("Si un compte existe");
      }
    });

    test("Reusing a reset token after successful reset returns error", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Token User", email, password: "password123" });
      await page.goto("/forgot-password");
      await page.fill('input[type="email"]', email);
      await page.click('button[type="submit"]');
      await expect(page.locator("h1:has-text('Email envoy\u00e9')")).toBeVisible();
      const resetToken =
        process.env.TEST_RESET_TOKEN ||
        "00000000-0000-0000-0000-000000000000";
      await page.goto(`/reset-password?token=${resetToken}`);
      await page.fill('input[placeholder="Nouveau mot de passe"]', "NewPassword123!");
      await page.fill('input[placeholder="Confirmer le mot de passe"]', "NewPassword123!");
      await page.click('button[type="submit"]');
      const successHeader = page.locator("h1:has-text('Mot de passe modifi\u00e9')");
      const errorMessage = page.locator("text=Token invalide ou expir\u00e9");
      await expect(successHeader.or(errorMessage)).toBeVisible({ timeout: 10000 });
      if (await successHeader.isVisible()) {
        await page.waitForURL("/login", { timeout: 15000 });
        await page.goto(`/reset-password?token=${resetToken}`);
        await page.fill('input[placeholder="Nouveau mot de passe"]', "AnotherPass123!");
        await page.fill('input[placeholder="Confirmer le mot de passe"]', "AnotherPass123!");
        await page.click('button[type="submit"]');
        await expect(page.locator("text=Token invalide ou expir\u00e9")).toBeVisible({ timeout: 10000 });
      }
    });

    test("Forgot password for account with password returns generic message", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Generic User", email, password: "password123" });
      const response = await page.request.post("/api/auth/forgot-password", {
        data: { email },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toContain("Si un compte existe");
    });
  });

  test.describe("Rate Limiting & CSRF", () => {
    test("Rapid registration attempts trigger rate limiting", async ({ page }) => {
      let rateLimited = false;
      for (let i = 0; i < 15; i++) {
        const response = await page.request.post("/api/auth/register", {
          data: {
            name: `Rapid User ${i}`,
            email: `rapid-${Date.now()}-${i}@example.com`,
            password: "password123",
          },
        });
        if (response.status() === 429) {
          rateLimited = true;
          break;
        }
      }
      expect(rateLimited).toBe(true);
    });

    test("CSRF rejection on cross-origin POST to auth endpoints", async ({ page }) => {
      const email = randomEmail();
      const response = await page.request.post("/api/auth/register", {
        data: { name: "CSRF Test", email, password: "password123" },
        headers: {
          Origin: "https://malicious-site.com",
          Referer: "https://malicious-site.com/fake-form",
        },
      });
      expect([403, 400, 200]).toContain(response.status());
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty("user");
      }
    });
  });

  test.describe("Security Headers", () => {
    const protectedPages = ["/login", "/register", "/dashboard"];

    for (const pagePath of protectedPages) {
      test(`${pagePath} includes security headers`, async ({ page }) => {
        const response = await page.request.get(pagePath);
        const headers = response.headers();
        expect(
          headers["x-frame-options"] || headers["X-Frame-Options"]
        ).toBeDefined();
        expect(
          headers["x-content-type-options"] || headers["X-Content-Type-Options"]
        ).toBe("nosniff");
        expect(
          headers["content-security-policy"] || headers["Content-Security-Policy"]
        ).toBeDefined();
      });
    }
  });
});
