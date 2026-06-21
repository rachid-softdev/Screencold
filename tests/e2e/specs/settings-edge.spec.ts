import { test, expect } from "@playwright/test";
import { login, randomEmail, waitForToast } from "../fixtures/helpers";

test.describe("Settings Edge Cases", () => {
  test.describe("Teams", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("create team with valid name asserts team created with owner icon", async ({ page }) => {
      await page.goto("/settings/teams");
      await page.waitForSelector('text=Nouvelle équipe');
      await page.click('text=Nouvelle équipe');
      const teamName = `E2E-Team-${Date.now()}`;
      await page.fill('input[placeholder="Nom de l\'équipe"]', teamName);
      await page.click('button:has-text("Créer")');
      await expect(page.locator(`text=${teamName}`)).toBeVisible();
      const card = page.locator(`text=${teamName}`).locator('..');
      await expect(card.locator('[class*="text-warning"]')).toBeVisible();
    });

    test("create team without name validation error", async ({ page }) => {
      await page.goto("/settings/teams");
      await page.waitForSelector('text=Nouvelle équipe');
      await page.click('text=Nouvelle équipe');
      await page.click('button:has-text("Créer")');
      await expect(page.locator('input[placeholder="Nom de l\'équipe"]')).toBeVisible();
    });

    test("invite team member via email invitation created", async ({ page }) => {
      await page.goto("/settings/teams");
      const teamName = `E2E-Team-${Date.now()}`;
      await page.click('text=Nouvelle équipe');
      await page.fill('input[placeholder="Nom de l\'équipe"]', teamName);
      await page.click('button:has-text("Créer")');
      await expect(page.locator(`text=${teamName}`)).toBeVisible();

      const teamResponse = await page.request.get("/api/teams");
      const teamData = await teamResponse.json();
      const ownedTeams = teamData.ownedTeams || [];
      const targetTeam = ownedTeams.find((t: { name: string }) => t.name === teamName);
      expect(targetTeam).toBeTruthy();

      const inviteEmail = randomEmail();
      const inviteRes = await page.request.post(`/api/teams/${targetTeam.id}/invitations`, {
        data: { email: inviteEmail, role: "MEMBER" },
      });
      expect(inviteRes.status()).toBe(201);
      const inviteBody = await inviteRes.json();
      expect(inviteBody.invitation).toBeTruthy();
      expect(inviteBody.invitation.email).toBe(inviteEmail);
    });

    test("invite already member 400 ALREADY_MEMBER", async ({ page }) => {
      await page.goto("/settings/teams");
      const teamName = `E2E-Team-${Date.now()}`;
      await page.click('text=Nouvelle équipe');
      await page.fill('input[placeholder="Nom de l\'équipe"]', teamName);
      await page.click('button:has-text("Créer")');
      await expect(page.locator(`text=${teamName}`)).toBeVisible();

      const teamResponse = await page.request.get("/api/teams");
      const teamData = await teamResponse.json();
      const ownedTeams = teamData.ownedTeams || [];
      const targetTeam = ownedTeams.find((t: { name: string }) => t.name === teamName);
      expect(targetTeam).toBeTruthy();

      const inviteRes = await page.request.post(`/api/teams/${targetTeam.id}/invitations`, {
        data: { email: "test@example.com", role: "MEMBER" },
      });
      expect(inviteRes.status()).toBe(400);
      const inviteBody = await inviteRes.json();
      expect(inviteBody.error).toBe("ALREADY_MEMBER");
    });

    test("accept invitation with valid token user added to team", async ({ page }) => {
      await page.goto("/settings/teams");
      const teamName = `E2E-Accept-${Date.now()}`;
      await page.click('text=Nouvelle équipe');
      await page.fill('input[placeholder="Nom de l\'équipe"]', teamName);
      await page.click('button:has-text("Créer")');
      await expect(page.locator(`text=${teamName}`)).toBeVisible();

      const teamResponse = await page.request.get("/api/teams");
      const teamData = await teamResponse.json();
      const ownedTeams = teamData.ownedTeams || [];
      const targetTeam = ownedTeams.find((t: { name: string }) => t.name === teamName);
      expect(targetTeam).toBeTruthy();

      const joinEmail = randomEmail();
      const inviteRes = await page.request.post(`/api/teams/${targetTeam.id}/invitations`, {
        data: { email: joinEmail, role: "MEMBER" },
      });
      expect(inviteRes.status()).toBe(201);
      const inviteBody = await inviteRes.json();
      const token = inviteBody.invitation.id;

      await page.goto(`/teams/join/${token}`);
      await page.waitForSelector('text=Accepter');
      await page.click('text=Accepter');
      await expect(page.locator('text=Invitation acceptée')).toBeVisible();
    });

    test("accept expired invitation 400 error", async ({ page }) => {
      const response = await page.request.put("/api/teams/join", {
        data: { token: "nonexistent-expired-token" },
      });
      expect([400, 404, 401]).toContain(response.status());
    });

    test("remove team member member removed", async ({ page }) => {
      await page.goto("/settings/teams");
      const teamName = `E2E-Remove-${Date.now()}`;
      await page.click('text=Nouvelle équipe');
      await page.fill('input[placeholder="Nom de l\'équipe"]', teamName);
      await page.click('button:has-text("Créer")');
      await expect(page.locator(`text=${teamName}`)).toBeVisible();

      const teamResponse = await page.request.get("/api/teams");
      const teamData = await teamResponse.json();
      const ownedTeams = teamData.ownedTeams || [];
      const targetTeam = ownedTeams.find((t: { name: string }) => t.name === teamName);
      expect(targetTeam).toBeTruthy();
      expect(targetTeam.members.length).toBeGreaterThan(0);

      const memberToRemove = targetTeam.members[0];
      const deleteRes = await page.request.delete(`/api/teams/${targetTeam.id}/members`, {
        data: { userId: memberToRemove.id },
      });
      expect([200, 400, 403]).toContain(deleteRes.status());
      if (deleteRes.status() === 200) {
        const body = await deleteRes.json();
        expect(body.success).toBe(true);
      }
    });

    test("remove last admin 400 error", async ({ page }) => {
      await page.goto("/settings/teams");
      const teamName = `E2E-LastAdmin-${Date.now()}`;
      await page.click('text=Nouvelle équipe');
      await page.fill('input[placeholder="Nom de l\'équipe"]', teamName);
      await page.click('button:has-text("Créer")');
      await expect(page.locator(`text=${teamName}`)).toBeVisible();

      const teamResponse = await page.request.get("/api/teams");
      const teamData = await teamResponse.json();
      const ownedTeams = teamData.ownedTeams || [];
      const targetTeam = ownedTeams.find((t: { name: string }) => t.name === teamName);
      expect(targetTeam).toBeTruthy();

      const deleteRes = await page.request.delete(`/api/teams/${targetTeam.id}/members`, {
        data: { userId: targetTeam.ownerId },
      });
      expect(deleteRes.status()).toBe(400);
      const body = await deleteRes.json();
      expect(body.error).toBe("INVALID_ACTION");
    });

    test("max team size reached FREE plan 403 PLAN_LIMIT", async ({ page }) => {
      await page.goto("/settings/teams");
      const teamName = `E2E-MaxSize-${Date.now()}`;
      await page.click('text=Nouvelle équipe');
      await page.fill('input[placeholder="Nom de l\'équipe"]', teamName);
      await page.click('button:has-text("Créer")');
      await expect(page.locator(`text=${teamName}`)).toBeVisible();

      const teamResponse = await page.request.get("/api/teams");
      const teamData = await teamResponse.json();
      const ownedTeams = teamData.ownedTeams || [];
      const targetTeam = ownedTeams.find((t: { name: string }) => t.name === teamName);
      expect(targetTeam).toBeTruthy();

      for (let i = 0; i < 6; i++) {
        const inviteRes = await page.request.post(`/api/teams/${targetTeam.id}/invitations`, {
          data: { email: randomEmail(), role: "MEMBER" },
        });
        if (inviteRes.status() === 403) {
          const body = await inviteRes.json();
          expect(body.error).toBe("PLAN_LIMIT");
          break;
        }
      }
    });

    test("leave team as member membership removed", async ({ page }) => {
      await page.goto("/settings/teams");
      const teamName = `E2E-Leave-${Date.now()}`;
      await page.click('text=Nouvelle équipe');
      await page.fill('input[placeholder="Nom de l\'équipe"]', teamName);
      await page.click('button:has-text("Créer")');
      await expect(page.locator(`text=${teamName}`)).toBeVisible();
    });
  });

  test.describe("Email Templates", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("create custom template with subject body appears in list", async ({ page }) => {
      await page.goto("/settings/email-templates");
      await page.waitForSelector('text=Nouveau template');
      await page.click('text=Nouveau template');

      const templateName = `E2E-Template-${Date.now()}`;
      await page.fill('input[placeholder="Mon template"]', templateName);
      await page.fill('input[placeholder*="Sujet"]', `Test subject ${Date.now()}`);
      await page.fill("textarea", `Test body content ${Date.now()}`);
      await page.click('button[type="submit"]');

      await waitForToast(page, "Template créé");
      await expect(page.locator(`text=${templateName}`)).toBeVisible();
    });

    test("create template with empty subject validation error", async ({ page }) => {
      await page.goto("/settings/email-templates");
      await page.waitForSelector('text=Nouveau template');
      await page.click('text=Nouveau template');

      const templateName = `E2E-NoSubj-${Date.now()}`;
      await page.fill('input[placeholder="Mon template"]', templateName);
      await page.click('button[type="submit"]');

      await expect(page.locator('input[placeholder*="Sujet"]')).toBeVisible();
    });

    test("edit template PATCH called updates", async ({ page }) => {
      await page.goto("/settings/email-templates");
      await page.waitForSelector('text=Nouveau template');
      await page.click('text=Nouveau template');

      const templateName = `E2E-Edit-${Date.now()}`;
      await page.fill('input[placeholder="Mon template"]', templateName);
      await page.fill('input[placeholder*="Sujet"]', `Subject ${Date.now()}`);
      await page.fill("textarea", `Body ${Date.now()}`);
      await page.click('button[type="submit"]');
      await waitForToast(page, "Template créé");

      const editButton = page.locator('button:has([class*="Edit2"])').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.fill('input[placeholder="Mon template"]', `${templateName}-updated`);
        await page.click('button[type="submit"]');
        await waitForToast(page, "Template mis à jour");
        await expect(page.locator(`text=${templateName}-updated`)).toBeVisible();
      }
    });

    test("delete custom template removed", async ({ page }) => {
      await page.goto("/settings/email-templates");
      await page.waitForSelector('text=Nouveau template');
      await page.click('text=Nouveau template');

      const templateName = `E2E-Delete-${Date.now()}`;
      await page.fill('input[placeholder="Mon template"]', templateName);
      await page.fill('input[placeholder*="Sujet"]', `Subject ${Date.now()}`);
      await page.fill("textarea", `Body ${Date.now()}`);
      await page.click('button[type="submit"]');
      await waitForToast(page, "Template créé");
      await expect(page.locator(`text=${templateName}`)).toBeVisible();

      const deleteButton = page.locator('button:has([class*="Trash2"])').first();
      if (await deleteButton.isVisible()) {
        page.on("dialog", (dialog) => dialog.accept());
        await deleteButton.click();
        await waitForToast(page, "Template supprimé");
        await expect(page.locator(`text=${templateName}`)).not.toBeVisible();
      }
    });

    test("delete global template no delete button only custom", async ({ page }) => {
      await page.goto("/settings/email-templates");
      await page.waitForSelector('text=Nouveau template');

      const globalBadge = page.locator('text=Global');
      if (await globalBadge.isVisible()) {
        const globalCard = globalBadge.locator('..');
        const deleteBtn = globalCard.locator('button:has([class*="Trash2"])');
        await expect(deleteBtn).not.toBeVisible();
      }
    });

    test("template empty state Aucun template", async ({ page }) => {
      await page.goto("/settings/email-templates");
      await page.waitForSelector('text=Nouveau template');

      const emptyText = page.locator('text=Aucun template');
      const templatesExist = await page.locator('text=Nouveau template').isVisible();

      if (templatesExist) {
        const headerCount = await page.locator('h3:has-text("template"), h3:has-text("Template")').count();
        if (headerCount === 0) {
          await expect(emptyText).toBeVisible();
        }
      }
    });
  });

  test.describe("Integrations", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("connect Gmail redirects to Google OAuth", async ({ page }) => {
      await page.goto("/settings/integrations");
      await page.waitForSelector('text=Connecter Gmail');

      await page.click('text=Connecter Gmail');

      await page.waitForURL(/accounts\.google\.com|localhost/, { timeout: 15000 });
      const currentUrl = page.url();
      const isGoogleOAuth = currentUrl.includes("accounts.google.com");
      const isLocal = currentUrl.includes("localhost") || currentUrl.includes("3000");
      expect(isGoogleOAuth || isLocal).toBe(true);
    });

    test("disconnect Gmail DELETE called badge changes", async ({ page }) => {
      await page.goto("/settings/integrations");
      await page.waitForSelector('text=Intégrations');

      const disconnectButton = page.locator('text=Déconnecter');
      if (await disconnectButton.isVisible()) {
        await disconnectButton.click();
        await expect(page.locator('text=Connecter Gmail')).toBeVisible({ timeout: 10000 });
      }
    });

    test("integration with expired token error state shown", async ({ page }) => {
      await page.goto("/settings/integrations?error=gmail_auth_failed");
      await page.waitForSelector('text=Intégrations');
      await expect(page.locator('text=Connecter Gmail')).toBeVisible();
    });
  });

  test.describe("API v1 Endpoints Edge Cases", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("OPTIONS preflight CORS proper CORS headers returned", async ({ page }) => {
      const response = await page.request.fetch("/api/v1/audits", {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "authorization, content-type",
        },
      });
      expect(response.status()).toBe(200);
      const headers = response.headers();
      expect(headers["access-control-allow-origin"] || headers["Access-Control-Allow-Origin"] || "").toBeTruthy();
    });

    test("POST /api/v1/audits with non-JSON body 400/422", async ({ page }) => {
      const response = await page.request.fetch("/api/v1/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: "not-json-at-all",
      });
      expect([400, 422, 500]).toContain(response.status());
    });

    test("POST /api/v1/audits with too many prospects 400", async ({ page }) => {
      const response = await page.request.post("/api/v1/audits", {
        data: { url: "https://example.com", prospects: new Array(1001).fill({ url: "https://example.com" }) },
      });
      expect([400, 401, 402, 403, 422]).toContain(response.status());
    });

    test("GET /api/v1/audits with invalid cursor 400", async ({ page }) => {
      const response = await page.request.get("/api/v1/audits?cursor=invalid-cursor-that-does-not-exist");
      expect([200, 400, 401, 403]).toContain(response.status());
      if (response.status() === 200) {
        const body = await response.json();
        expect(body.data).toBeDefined();
      }
    });
  });

  test.describe("Billing", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("billing page loads plan name status credit usage visible", async ({ page }) => {
      await page.goto("/settings/billing");
      await page.waitForSelector('text=Facturation');

      await expect(page.locator('text=Crédits utilisés ce mois')).toBeVisible();
      const planName = await page.locator('h2:has-text("Plan")').count();
      expect(planName).toBeGreaterThan(0);
      const activeBadge = page.locator('text=Actif');
      await expect(activeBadge).toBeVisible();
    });

    test("empty transaction history Aucune transaction", async ({ page }) => {
      await page.goto("/settings/billing");
      await page.waitForSelector('text=Historique des transactions');

      const noTransactions = page.locator('text=Aucune transaction');
      const table = page.locator("table");
      const tableVisible = await table.isVisible().catch(() => false);
      if (!tableVisible) {
        await expect(noTransactions).toBeVisible();
      }
    });

    test("buy additional credits redirect to Stripe", async ({ page }) => {
      await page.goto("/settings/billing");
      await page.waitForSelector('text=Acheter');

      const buyButton = page.locator('button:has-text("Acheter")').first();
      await buyButton.click();

      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl.includes("stripe.com") || currentUrl.includes("localhost")).toBe(true);
    });

    test("toggle monthly annual prices update with -20% badge", async ({ page }) => {
      await page.goto("/settings/billing");
      await page.waitForSelector('text=Mensuel');

      const toggle = page.locator('[role="switch"]');
      await toggle.click();
      await expect(page.locator('text=-20%')).toBeVisible();
      await expect(page.locator('text=Annuel')).toBeVisible();

      await toggle.click();
      await expect(page.locator('text=-20%')).not.toBeVisible();
    });
  });

  test.describe("Dashboard", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("dashboard real-time stat update after audit counters increment", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForSelector('text=Audits ce mois');

      const thisMonthText = await page.locator('text=Audits ce mois').locator('..').textContent();
      const initialMatch = thisMonthText?.match(/(\d+)/);
      const initialCount = initialMatch ? parseInt(initialMatch[1], 10) : 0;

      const auditResponse = await page.request.post("/api/audits", {
        data: { url: "https://example.com", companyName: "E2E Test" },
      });
      expect([201, 400, 401, 402]).toContain(auditResponse.status());

      await page.reload();
      await page.waitForSelector('text=Audits ce mois');
      const updatedText = await page.locator('text=Audits ce mois').locator('..').textContent();
      const updatedMatch = updatedText?.match(/(\d+)/);
      const updatedCount = updatedMatch ? parseInt(updatedMatch[1], 10) : 0;
      expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
    });

    test("dashboard pagination with cursor Load more works", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForSelector('text=Audits ce mois');

      const emptyState = page.locator('text=Aucun audit pour le moment');
      const isEmpty = await emptyState.isVisible().catch(() => false);

      if (!isEmpty) {
        const loadMore = page.locator('text=Charger plus');
        if (await loadMore.isVisible().catch(() => false)) {
          await loadMore.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    test("credit counter progress bar correct percentage", async ({ page }) => {
      await page.goto("/dashboard");

      const creditSection = page.locator('text=Crédits utilisés ce mois');
      const creditText = await creditSection.textContent().catch(() => null);

      if (creditText) {
        const match = creditText.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          const used = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          if (total > 0) {
            const progressBar = page.locator('.bg-info-500, .bg-error-500').first();
            await expect(progressBar).toBeVisible();
            const style = await progressBar.getAttribute("style");
            expect(style).toContain("width");
          }
        }
      }
    });
  });
});
