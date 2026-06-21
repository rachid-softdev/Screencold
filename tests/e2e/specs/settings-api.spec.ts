import { test, expect } from "@playwright/test";
import { login, waitForToast } from "../fixtures/helpers";

test.describe("Settings, Billing & API", () => {
  test.describe("User Settings", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("profile form loads with user name and email pre-filled", async ({ page }) => {
      await page.goto("/settings");

      await page.waitForSelector('input[placeholder="Votre nom"]');
      await page.waitForSelector('input[type="email"]');

      const nameInput = page.locator('input[placeholder="Votre nom"]');
      const emailInput = page.locator('input[type="email"]');

      await expect(nameInput).toHaveValue(/.+/);
      await expect(emailInput).toHaveValue(/.+/);
      await expect(emailInput).toBeDisabled();
    });

    test("update user name successfully", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');

      const nameInput = page.locator('input[placeholder="Votre nom"]');
      const newName = `User-${Date.now()}`;
      await nameInput.fill(newName);

      await page.click('button:has-text("Enregistrer les modifications")');
      await waitForToast(page, "Paramètres enregistrés");

      await page.reload();
      await page.waitForSelector('input[placeholder="Votre nom"]');
      await expect(nameInput).toHaveValue(newName);
    });

    test("cancel changes navigates away restores original name", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');

      const nameInput = page.locator('input[placeholder="Votre nom"]');
      const originalName = await nameInput.inputValue();

      await nameInput.fill(`${originalName}-edited`);

      await page.click('a:has-text("Tableau de bord")');
      await page.waitForURL(/\/dashboard/);

      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      await expect(nameInput).toHaveValue(originalName);
    });
  });

  test.describe("Settings Unauthenticated", () => {
    test("redirects to login when accessing settings without session", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForURL(/\/login/);
    });
  });

  test.describe("Dashboard Analytics", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("dashboard loads with correct stats", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.locator('text=Audits ce mois')).toBeVisible();
      await expect(page.locator('text=Total audits')).toBeVisible();
      await expect(page.locator('text=Crédits utilisés')).toBeVisible();
    });

    test("dashboard shows empty state for new user", async ({ page }) => {
      await page.goto("/dashboard");

      const emptyState = page.locator('text=Aucun audit pour le moment');
      const recentAudits = page.locator('text=Audits récents');

      const isRecentAuditsVisible = await recentAudits.isVisible().catch(() => false);

      if (!isRecentAuditsVisible) {
        await expect(emptyState).toBeVisible();
      }
    });

    test("recent audits list renders when audits exist", async ({ page }) => {
      await page.goto("/dashboard");

      const recentAudits = page.locator('text=Audits récents');
      const emptyState = page.locator('text=Aucun audit pour le moment');

      const isEmptyVisible = await emptyState.isVisible().catch(() => false);

      if (!isEmptyVisible) {
        await expect(recentAudits).toBeVisible();
        const auditCards = page.locator('a[href^="/audits/"]');
        const count = await auditCards.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Dashboard Unauthenticated", () => {
    test("redirects to login when accessing dashboard without session", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForURL(/\/login/);
    });
  });

  test.describe("API Key Management", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("API keys page loads with plan warning for free plan", async ({ page }) => {
      await page.goto("/settings/api-keys");

      await expect(page.locator('h1:has-text("Clés API")')).toBeVisible();
      await expect(page.locator('text=Plan requis')).toBeVisible();
      await expect(page.locator('text=L\'accès API est disponible uniquement pour les plans Pro et Agency')).toBeVisible();
    });
  });

  test.describe("API v1 Endpoints", () => {
    test("GET /api/health returns 200", async ({ page }) => {
      const response = await page.request.get("/api/health");
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status");
    });

    test("GET /api/v1/credits without auth returns 401", async ({ page }) => {
      const response = await page.request.get("/api/v1/credits");
      expect(response.status()).toBe(401);
    });

    test("GET /api/v1/credits with session returns credits", async ({ page }) => {
      await login(page);
      const response = await page.request.get("/api/v1/credits");
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty("data");
      expect(body.data).toHaveProperty("credits");
    });

    test("GET /api/v1/audits with session returns paginated response", async ({ page }) => {
      await login(page);
      const response = await page.request.get("/api/v1/audits");
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("pagination");
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  test.describe("Notifications", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("notification bell is visible in header", async ({ page }) => {
      await page.goto("/dashboard");
      const bellButton = page.locator('button[aria-label="Notifications"]');
      await expect(bellButton).toBeVisible();
    });

    test("notification icon renders on dashboard and settings pages", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.locator('button[aria-label="Notifications"]')).toBeVisible();

      await page.goto("/settings");
      await expect(page.locator('button[aria-label="Notifications"]')).toBeVisible();
    });

    test("notifications section does not cause console errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      await page.goto("/dashboard");
      await page.waitForSelector('button[aria-label="Notifications"]');

      expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
    });
  });
});
