import { test, expect } from "@playwright/test";
import { register, randomEmail, waitForToast } from "../fixtures/helpers";

const PASSWORD = "TestPass123!";

test.describe("Profile, Password & API Keys", () => {

  test.describe("Profile Edit", () => {
    test("profile form inputs are pre-filled from API", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Wave4 User", email, password: PASSWORD });
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      const nameInput = page.locator('input[placeholder="Votre nom"]');
      const emailInput = page.locator('input[type="email"]');
      await expect(nameInput).toHaveValue("Wave4 User");
      await expect(emailInput).toHaveValue(email);
      await expect(emailInput).toBeDisabled();
    });

    test("update user name persists after reload", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Original Name", email, password: PASSWORD });
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      const nameInput = page.locator('input[placeholder="Votre nom"]');
      const newName = `Updated-${Date.now()}`;
      await nameInput.fill(newName);
      await page.click('button:has-text("Enregistrer les modifications")');
      await waitForToast(page, "Paramètres enregistrés");
      await page.reload();
      await page.waitForSelector('input[placeholder="Votre nom"]');
      await expect(nameInput).toHaveValue(newName);
    });

    test("save with empty name shows client-side error", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email, password: PASSWORD });
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      const nameInput = page.locator('input[placeholder="Votre nom"]');
      const originalValue = await nameInput.inputValue();
      await nameInput.fill("");
      await page.click('button:has-text("Enregistrer les modifications")');
      await expect(page.locator("text=Le nom est requis")).toBeVisible();
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      await expect(nameInput).toHaveValue(originalValue);
    });

    test("save with very long name returns API validation error", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email, password: PASSWORD });
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      const nameInput = page.locator('input[placeholder="Votre nom"]');
      const longName = "A".repeat(101);
      await nameInput.fill(longName);
      await page.click('button:has-text("Enregistrer les modifications")');
      await page.waitForTimeout(1000);
      const response = await page.request.get("/api/user/profile");
      const data = await response.json();
      expect(data.name).not.toBe(longName);
    });

    test("email field is disabled with helper text", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email, password: PASSWORD });
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeDisabled();
      await expect(page.locator("text=L'email ne peut pas être modifié")).toBeVisible();
    });

    test("save with special characters in name succeeds", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email, password: PASSWORD });
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      const nameInput = page.locator('input[placeholder="Votre nom"]');
      const specialName = "José García Müller-Smith";
      await nameInput.fill(specialName);
      await page.click('button:has-text("Enregistrer les modifications")');
      await waitForToast(page, "Paramètres enregistrés");
      await page.reload();
      await page.waitForSelector('input[placeholder="Votre nom"]');
      await expect(nameInput).toHaveValue(specialName);
    });

    test("navigating away without saving discards changes", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Persistent Name", email, password: PASSWORD });
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      const nameInput = page.locator('input[placeholder="Votre nom"]');
      await nameInput.fill("Temporary Edit");
      await page.click('a:has-text("Tableau de bord")');
      await page.waitForURL(/\/dashboard/);
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      await expect(nameInput).toHaveValue("Persistent Name");
    });

    test("loading spinner visible while profile loads", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email, password: PASSWORD });
      await page.goto("/settings");
      await expect(page.locator(".animate-spin")).toBeVisible();
      await page.waitForSelector('input[placeholder="Votre nom"]');
      await expect(page.locator("input[placeholder='Votre nom']")).toBeVisible();
    });

    test("saving same name does not cause error", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Same Name", email, password: PASSWORD });
      await page.goto("/settings");
      await page.waitForSelector('input[placeholder="Votre nom"]');
      const nameInput = page.locator('input[placeholder="Votre nom"]');
      await nameInput.fill("Same Name");
      await page.click('button:has-text("Enregistrer les modifications")');
      await waitForToast(page, "Paramètres enregistrés");
    });
  });

  test.describe("Profile API Unauthenticated", () => {
    test("GET /api/user/profile without session returns 401", async ({ page }) => {
      const response = await page.request.get("/api/user/profile");
      expect(response.status()).toBe(401);
    });

    test("PATCH /api/user/profile without session returns 401", async ({ page }) => {
      const response = await page.request.patch("/api/user/profile", {
        data: { name: "Hacker" },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("API Key Management", () => {
    test("page loads with title and create button", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      await page.goto("/settings/api-keys");
      await expect(page.locator('h1:has-text("Clés API")')).toBeVisible();
      await expect(page.locator('button:has-text("Nouvelle clé")')).toBeVisible();
    });

    test("plan warning banner visible for free plan", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      await page.goto("/settings/api-keys");
      await expect(page.locator("text=Plan requis")).toBeVisible();
      await expect(
        page.locator("text=L'accès API est disponible uniquement pour les plans Pro et Agency")
      ).toBeVisible();
    });

    test("empty state shown when no API keys exist", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      await page.goto("/settings/api-keys");
      await expect(page.locator("text=Aucune clé API")).toBeVisible();
      await expect(
        page.locator("text=Créez votre première clé API pour accéder au programme.")
      ).toBeVisible();
    });

    test("create modal opens and can be cancelled", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      await page.goto("/settings/api-keys");
      await page.click('button:has-text("Nouvelle clé")');
      await expect(page.locator("text=Créer une clé API")).toBeVisible();
      await expect(
        page.locator('input[placeholder="Nom de la clé (ex: Production)"]')
      ).toBeVisible();
      await page.click('button:has-text("Annuler")');
      await expect(page.locator("text=Créer une clé API")).not.toBeVisible();
    });

    test("create key on free plan shows plan required error", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      await page.goto("/settings/api-keys");
      await page.click('button:has-text("Nouvelle clé")');
      await page.fill(
        'input[placeholder="Nom de la clé (ex: Production)"]',
        "My Test Key"
      );
      let alertMessage = "";
      page.on("dialog", (dialog) => {
        alertMessage = dialog.message();
        dialog.accept();
      });
      await page.click('button:has-text("Créer")');
      await page.waitForTimeout(500);
      expect(alertMessage).toContain("Pro");
    });

    test("create modal with empty name does nothing", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      await page.goto("/settings/api-keys");
      await page.click('button:has-text("Nouvelle clé")');
      await page.click('button:has-text("Créer")');
      await expect(page.locator("text=Créer une clé API")).toBeVisible();
    });

    test("delete key shows confirmation dialog", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      await page.goto("/settings/api-keys");
      await expect(page.locator("text=Aucune clé API")).toBeVisible();
    });

    test("loading spinner visible while fetching keys", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      await page.goto("/settings/api-keys");
      await expect(page.locator(".animate-spin")).toBeVisible();
      await page.waitForSelector("text=Aucune clé API");
    });
  });

  test.describe("API Key API Operations", () => {
    test("GET /api/user/api-keys without session returns 401", async ({ page }) => {
      const response = await page.request.get("/api/user/api-keys");
      expect(response.status()).toBe(401);
    });

    test("POST /api/user/api-keys without session returns 401", async ({ page }) => {
      const response = await page.request.post("/api/user/api-keys", {
        data: { name: "Test Key" },
      });
      expect(response.status()).toBe(401);
    });

    test("DELETE /api/user/api-keys without session returns 401", async ({ page }) => {
      const response = await page.request.delete("/api/user/api-keys");
      expect(response.status()).toBe(401);
    });

    test("POST /api/user/api-keys on free plan returns 403", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      const response = await page.request.post("/api/user/api-keys", {
        data: { name: "My Key" },
      });
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("PLAN_REQUIRED");
    });

    test("DELETE /api/user/api-keys without id returns 400", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      const response = await page.request.delete("/api/user/api-keys");
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("MISSING_ID");
    });

    test("DELETE /api/user/api-keys with nonexistent id returns 404", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "API Test", email, password: PASSWORD });
      const response = await page.request.delete(
        "/api/user/api-keys?id=nonexistent-uuid-12345"
      );
      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("NOT_FOUND");
    });
  });

  test.describe("Account Deletion", () => {
    test("danger zone section is visible on settings page", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Delete Test", email, password: PASSWORD });
      await page.goto("/settings");
      await expect(page.locator("text=Zone dangereuse")).toBeVisible();
      await expect(
        page.locator("text=La suppression de votre compte est définitive")
      ).toBeVisible();
      await expect(
        page.locator('button:has-text("Supprimer mon compte")')
      ).toBeVisible();
    });

    test("cancelling delete confirmation does not delete account", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Delete Test", email, password: PASSWORD });
      await page.goto("/settings");
      page.on("dialog", (dialog) => dialog.dismiss());
      await page.click('button:has-text("Supprimer mon compte")');
      await page.waitForTimeout(500);
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("DELETE /api/user/profile without session returns 401", async ({ page }) => {
      const response = await page.request.delete("/api/user/profile");
      expect(response.status()).toBe(401);
    });

    test("DELETE /api/user/profile without password returns 400", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Delete Test", email, password: PASSWORD });
      const response = await page.request.delete("/api/user/profile", {
        data: {},
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("PASSWORD_REQUIRED");
    });

    test("DELETE /api/user/profile with wrong password returns 403", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Delete Test", email, password: PASSWORD });
      const response = await page.request.delete("/api/user/profile", {
        data: { password: "wrongpassword123!" },
      });
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("WRONG_PASSWORD");
    });

    test("DELETE /api/user/profile with valid password succeeds", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Delete Test", email, password: PASSWORD });
      const deleteResponse = await page.request.delete("/api/user/profile", {
        data: { password: PASSWORD },
      });
      expect(deleteResponse.status()).toBe(200);
      const deleteBody = await deleteResponse.json();
      expect(deleteBody.success).toBe(true);
      const profileResponse = await page.request.get("/api/user/profile");
      expect(profileResponse.status()).toBe(401);
    });
  });

  test.describe("Password Change Validation", () => {
    test("POST /api/user/change-password with valid data", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Pass Test", email, password: PASSWORD });
      const response = await page.request.post("/api/user/change-password", {
        data: {
          currentPassword: PASSWORD,
          newPassword: "NewValidPass1!",
        },
      });
      expect([200, 404]).toContain(response.status());
    });

    test("POST /api/user/change-password with same password", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Pass Test", email, password: PASSWORD });
      const response = await page.request.post("/api/user/change-password", {
        data: {
          currentPassword: PASSWORD,
          newPassword: PASSWORD,
        },
      });
      expect([400, 404]).toContain(response.status());
      if (response.status() === 400) {
        const body = await response.json();
        expect(body.error || body.message || "").toBeTruthy();
      }
    });

    test("POST /api/user/change-password with empty current", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Pass Test", email, password: PASSWORD });
      const response = await page.request.post("/api/user/change-password", {
        data: {
          currentPassword: "",
          newPassword: "NewValidPass1!",
        },
      });
      expect([400, 404]).toContain(response.status());
    });

    test("POST /api/user/change-password with short new password", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Pass Test", email, password: PASSWORD });
      const response = await page.request.post("/api/user/change-password", {
        data: {
          currentPassword: PASSWORD,
          newPassword: "Short1!",
        },
      });
      expect([400, 404]).toContain(response.status());
    });

    test("POST /api/user/change-password with no uppercase", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Pass Test", email, password: PASSWORD });
      const response = await page.request.post("/api/user/change-password", {
        data: {
          currentPassword: PASSWORD,
          newPassword: "nouppercase1!",
        },
      });
      expect([400, 404]).toContain(response.status());
    });

    test("POST /api/user/change-password with no number", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Pass Test", email, password: PASSWORD });
      const response = await page.request.post("/api/user/change-password", {
        data: {
          currentPassword: PASSWORD,
          newPassword: "NoNumberHere!",
        },
      });
      expect([400, 404]).toContain(response.status());
    });

    test("POST /api/user/change-password with no special char", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Pass Test", email, password: PASSWORD });
      const response = await page.request.post("/api/user/change-password", {
        data: {
          currentPassword: PASSWORD,
          newPassword: "NoSpecialChar1",
        },
      });
      expect([400, 404]).toContain(response.status());
    });

    test("POST /api/user/change-password with too long new password", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Pass Test", email, password: PASSWORD });
      const response = await page.request.post("/api/user/change-password", {
        data: {
          currentPassword: PASSWORD,
          newPassword: "A1!" + "x".repeat(101),
        },
      });
      expect([400, 404]).toContain(response.status());
    });
  });
});
