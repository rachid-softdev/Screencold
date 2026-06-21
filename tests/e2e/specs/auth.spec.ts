import { test, expect } from "@playwright/test";
import { login, register, randomEmail } from "../fixtures/helpers";

test.describe("Auth & User Flows", () => {
  test.describe("Registration", () => {
    test("Register new user successfully", async ({ page }) => {
      const email = randomEmail();
      await register(page, {
        name: "Test User",
        email,
        password: "password123",
      });
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator("text=Aucun audit pour le moment")).toBeVisible();
    });

    test("Register with invalid email", async ({ page }) => {
      await page.goto("/register");
      await page.fill('input[type="text"]', "Test User");
      await page.fill('input[type="email"]', "invalid-email");
      await page.fill('input[type="password"]', "password123");
      await page.click('button[type="submit"]');
      await expect(page.locator("text=Email invalide")).toBeVisible();
    });

    test("Register with weak password", async ({ page }) => {
      await page.goto("/register");
      await page.fill('input[type="text"]', "Test User");
      await page.fill('input[type="email"]', randomEmail());
      await page.fill('input[type="password"]', "abc");
      await page.click('button[type="submit"]');
      await expect(
        page.locator(
          "text=Le mot de passe doit contenir au moins 8 caractères"
        )
      ).toBeVisible();
    });

    test("Register with missing fields", async ({ page }) => {
      await page.goto("/register");
      await page.click('button[type="submit"]');
      await expect(page.locator("text=Le nom est requis")).toBeVisible();
      await expect(page.locator("text=L'email est requis")).toBeVisible();
      await expect(
        page.locator("text=Le mot de passe est requis")
      ).toBeVisible();
    });
  });

  test.describe("Login", () => {
    test("Login with valid credentials", async ({ page }) => {
      const email = randomEmail();
      const password = "password123";
      await register(page, { name: "Test User", email, password });
      await page.locator("button").filter({ has: page.locator(".lucide-user") }).click();
      await page.locator('[role="menuitem"]:has-text("Se d\u00e9connecter")').click();
      await page.waitForURL("/login");
      await login(page, email, password);
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("Login with wrong password", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email, password: "password123" });
      await page.locator("button").filter({ has: page.locator(".lucide-user") }).click();
      await page.locator('[role="menuitem"]:has-text("Se d\u00e9connecter")').click();
      await page.waitForURL("/login");
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', "wrongpassword");
      await page.click('button[type="submit"]');
      await expect(
        page.locator("text=Email ou mot de passe incorrect")
      ).toBeVisible({ timeout: 10000 });
    });

    test("Login with non-existent email", async ({ page }) => {
      await page.goto("/login");
      await page.fill('input[type="email"]', "nonexistent@example.com");
      await page.fill('input[type="password"]', "password123");
      await page.click('button[type="submit"]');
      await expect(
        page.locator("text=Email ou mot de passe incorrect")
      ).toBeVisible({ timeout: 10000 });
    });

    test("Login with empty fields", async ({ page }) => {
      await page.goto("/login");
      await page.click('button[type="submit"]');
      await expect(page.locator("text=L'email est requis")).toBeVisible();
      await expect(
        page.locator("text=Le mot de passe est requis")
      ).toBeVisible();
    });
  });

  test.describe("Password Reset", () => {
    test("Forgot password with valid email", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email, password: "password123" });
      await page.goto("/forgot-password");
      await page.fill('input[type="email"]', email);
      await page.click('button[type="submit"]');
      await expect(page.locator("h1:has-text('Email envoy\u00e9')")).toBeVisible();
    });

    test("Forgot password with non-existent email", async ({ page }) => {
      await page.goto("/forgot-password");
      await page.fill('input[type="email"]', "unknown@example.com");
      await page.click('button[type="submit"]');
      await expect(page.locator("h1:has-text('Email envoy\u00e9')")).toBeVisible();
    });

    test("Reset password with valid token", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email, password: "password123" });
      await page.goto("/forgot-password");
      await page.fill('input[type="email"]', email);
      await page.click('button[type="submit"]');
      await expect(page.locator("h1:has-text('Email envoy\u00e9')")).toBeVisible();

      const resetToken =
        process.env.TEST_RESET_TOKEN ||
        "00000000-0000-0000-0000-000000000000";
      await page.goto(`/reset-password?token=${resetToken}`);

      const newPassword = "NewPassword123!";
      await page.fill(
        'input[placeholder="Nouveau mot de passe"]',
        newPassword
      );
      await page.fill(
        'input[placeholder="Confirmer le mot de passe"]',
        newPassword
      );
      await page.click('button[type="submit"]');

      await expect(
        page.locator("text=Mot de passe modifi\u00e9")
      ).toBeVisible({ timeout: 10000 });
      await page.waitForURL("/login", { timeout: 15000 });
    });

    test("Reset password with invalid token", async ({ page }) => {
      await page.goto("/reset-password?token=invalid-token-123");
      await page.fill(
        'input[placeholder="Nouveau mot de passe"]',
        "NewPassword123"
      );
      await page.fill(
        'input[placeholder="Confirmer le mot de passe"]',
        "NewPassword123"
      );
      await page.click('button[type="submit"]');
      await expect(
        page.locator("text=Token invalide ou expir\u00e9")
      ).toBeVisible({ timeout: 10000 });
    });

    test("Reset password with mismatched passwords", async ({ page }) => {
      await page.goto("/reset-password?token=sometoken");
      await page.fill(
        'input[placeholder="Nouveau mot de passe"]',
        "Password123"
      );
      await page.fill(
        'input[placeholder="Confirmer le mot de passe"]',
        "Different456"
      );
      await page.click('button[type="submit"]');
      await expect(
        page.locator("text=Les mots de passe ne correspondent pas")
      ).toBeVisible();
    });

    test("Reset password with missing token", async ({ page }) => {
      await page.goto("/reset-password");
      await expect(
        page.locator("h1:has-text('Lien invalide')")
      ).toBeVisible();
      await expect(
        page.locator("text=Demander un nouveau lien")
      ).toBeVisible();
    });

    test("Reset password with short password", async ({ page }) => {
      await page.goto("/reset-password?token=sometoken");
      await page.fill(
        'input[placeholder="Nouveau mot de passe"]',
        "Short1"
      );
      await page.fill(
        'input[placeholder="Confirmer le mot de passe"]',
        "Short1"
      );
      await page.click('button[type="submit"]');
      await expect(
        page.locator(
          "text=Le mot de passe doit contenir au moins 8 caract\u00e8res"
        )
      ).toBeVisible();
    });
  });

  test.describe("Protected Routes", () => {
    test("Unauthenticated access to /dashboard redirects to login", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      await page.waitForURL("/login");
      await expect(
        page.locator("h1:has-text('Se connecter')")
      ).toBeVisible();
    });

    test("Authenticated user can access dashboard", async ({ page }) => {
      const email = randomEmail();
      await register(page, {
        name: "Test User",
        email,
        password: "password123",
      });
      await page.goto("/dashboard");
      await expect(
        page.locator("text=Aucun audit pour le moment")
      ).toBeVisible();
    });
  });

  test.describe("Logout", () => {
    test("Logout clears session and redirects to login", async ({
      page,
    }) => {
      const email = randomEmail();
      await register(page, {
        name: "Test User",
        email,
        password: "password123",
      });
      await expect(page).toHaveURL(/\/dashboard/);

      await page
        .locator("button")
        .filter({ has: page.locator(".lucide-user") })
        .click();
      await page
        .locator('[role="menuitem"]:has-text("Se d\u00e9connecter")')
        .click();
      await page.waitForURL("/login");
      await expect(
        page.locator("h1:has-text('Se connecter')")
      ).toBeVisible();

      await page.goto("/dashboard");
      await page.waitForURL("/login");
    });
  });
});
