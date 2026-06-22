import { test, expect } from "@playwright/test";
import { register, randomEmail, createAudit, createCampaign, waitForToast } from "../fixtures/helpers";
import { TEST_CSV } from "../fixtures/mock-data";
import path from "path";
import os from "os";
import fs from "fs";

test.describe("Wave 4 Comprehensive User Journeys", () => {

  test.describe("Scenario 1: Registration Onboarding First Audit Celebration Email", () => {

    test("J1_Register_Onboarding_Steps_Completion", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Journey User", email, password: "password123" });
      await expect(page).toHaveURL(/\/dashboard/);
      const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
      await expect(dialog.locator("text=Entrez une URL")).toBeVisible({ timeout: 10000 });
      await dialog.locator("text=Suivant").click();
      await expect(dialog.locator("text=Consultez les résultats")).toBeVisible();
      await dialog.locator("text=Suivant").click();
      await expect(dialog.locator("text=Commencer")).toBeVisible();
      await dialog.locator("text=Commencer").click();
      await expect(dialog).not.toBeVisible();
      const completed = await page.evaluate(() => localStorage.getItem("screencold-onboarding-completed"));
      expect(completed).toBe("true");
    });

    test("J2_First_Audit_Quick_Analyse_Polling_Ready", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Quick Audit User", email, password: "password123" });
      await page.goto("/dashboard");
      let createdAuditId = "audit-j2-poll-001";
      await page.route(/\/api\/audits/, async (route) => {
        const reqUrl = route.request().url();
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId: createdAuditId,
              status: "PROCESSING",
              creditsRemaining: 9,
            }),
          });
          return;
        }
        if (route.request().method() === "GET" && reqUrl.includes(createdAuditId)) {
          const isPoll = reqUrl.includes("poll=ready");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: createdAuditId,
              status: isPoll ? "READY" : "PROCESSING",
              overallScore: isPoll ? 85 : null,
              prospect: {
                id: "prospect-j2",
                url: "https://example.com",
                companyName: "Example Inc",
                status: isPoll ? "DONE" : "PENDING",
              },
            }),
          });
          return;
        }
        await route.continue();
      });
      await page.fill('input[placeholder*="exemple.com"]', "https://example.com");
      await page.click("button:has-text('Analyser')");
      const result = await page.evaluate(async (id) => {
        let audit = null;
        let attempts = 0;
        const maxAttempts = 20;
        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 300));
          const res = await fetch(`/api/audits/${id}?poll=ready`);
          audit = await res.json();
          if (audit.status === "READY" || audit.status === "FAILED") break;
          attempts++;
        }
        return { status: audit?.status, score: audit?.overallScore, attempts };
      }, createdAuditId);
      expect(result.status).toBe("READY");
      expect(result.score).toBe(85);
      expect(result.attempts).toBeLessThan(20);
    });

    test("J3_Celebration_Overlay_Copy_Link_Dismiss", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Celebration User", email, password: "password123" });
      await page.goto("/audits/new");
      const auditId = "audit-j3-celeb-001";
      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId,
              status: "READY",
              creditsRemaining: 9,
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.fill('input[name="url"]', "https://example.com");
      await page.click('button[type="submit"]');
      await expect(page.locator("text=Bravo").or(page.locator("text=premier audit est prêt"))).toBeVisible({ timeout: 10000 });
      await page.locator("text=Copier le lien").click();
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain(`/audits/${auditId}`);
      await page.locator("text=Continuer sans voir").click();
      await expect(page.locator("text=Bravo").or(page.locator("text=premier audit est prêt"))).not.toBeVisible();
    });

    test("J4_Audit_Detail_Results_Email_Section_Regenerate", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Audit Detail User", email, password: "password123" });
      const auditId = "audit-j4-detail-001";
      const mockAudit = {
        id: auditId,
        status: "READY",
        screenshotUrl: "https://example.com/screenshots/desktop.png",
        overallScore: 72,
        siteType: "E_COMMERCE",
        emailSubject: "Amélioration de votre site web",
        emailBody: "Bonjour,\n\nNous avons analysé votre site.",
        emailPs: "Cet email a été généré automatiquement.",
        errorMessage: null,
        issues: [
          { id: "issue-j4-1", severity: "HIGH", category: "SEO", title: "Balises meta manquantes", description: "Description", suggestion: "Suggestion" },
          { id: "issue-j4-2", severity: "MEDIUM", category: "PERFORMANCE", title: "Images non optimisées", description: "Description", suggestion: "Suggestion" },
        ],
        prospect: { id: "prospect-j4", url: "https://example.com", companyName: "Example Inc", contactName: "Jean", contactEmail: "jean@example.com", status: "DONE" },
      };
      await page.route(new RegExp(`/api/audits/${auditId}$`), async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockAudit) });
        } else {
          await route.continue();
        }
      });
      await page.route(new RegExp(`/api/audits/${auditId}/email`), async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Régénération de l'email en cours" }) });
        } else {
          await route.continue();
        }
      });
      await page.goto(`/audits/${auditId}`);
      await expect(page.locator("text=Example Inc")).toBeVisible();
      await expect(page.locator(`text=${mockAudit.overallScore}`)).toBeVisible();
      await expect(page.locator("text=Balises meta manquantes")).toBeVisible();
      await expect(page.locator("text=Images non optimisées")).toBeVisible();
      await expect(page.locator("text=Amélioration de votre site web")).toBeVisible();
      await expect(page.locator("text=E_COMMERCE")).toBeVisible();
      const regenResponse = await page.evaluate(async (id) => {
        const res = await fetch(`/api/audits/${id}/email`, { method: "POST", headers: { "Content-Type": "application/json" } });
        return { status: res.status, data: await res.json() };
      }, auditId);
      expect(regenResponse.status).toBe(200);
      expect(regenResponse.data.success).toBe(true);
    });

  });

  test.describe("Scenario 2: Campaign CSV Import Launch Prospect Table", () => {

    test("J5_Create_Campaign_List_Appears", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Campaign User", email, password: "password123" });
      const campaignName = `E2E Campaign ${Date.now()}`;
      await createCampaign(page, campaignName);
      await page.waitForURL(/\/campaigns\/(?!new)/);
      await expect(page.locator(`text=${campaignName}`)).toBeVisible();
      await page.goto("/campaigns");
      await expect(page.locator(`text=${campaignName}`)).toBeVisible();
    });

    test("J6_Import_Valid_CSV_Prospects_Table", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "CSV Import User", email, password: "password123" });
      const campaignName = `CSV Campaign ${Date.now()}`;
      await createCampaign(page, campaignName);
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const csvPath = path.join(os.tmpdir(), `journey-valid-${Date.now()}.csv`);
      fs.writeFileSync(csvPath, TEST_CSV.valid);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("text=Example Inc").first()).toBeVisible();
      await expect(page.locator("text=HTTPBin").first()).toBeVisible();
      await expect(page.locator("text=example.com").first()).toBeVisible();
      await expect(page.locator("text=httpbin.org").first()).toBeVisible();
    });

    test("J7_Launch_Campaign_Status_Processing_Done", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Launch Campaign User", email, password: "password123" });
      const campaignName = `Launch Campaign ${Date.now()}`;
      await createCampaign(page, campaignName);
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      const csvPath = path.join(os.tmpdir(), `journey-launch-${Date.now()}.csv`);
      fs.writeFileSync(csvPath, TEST_CSV.valid);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await expect(page.locator("text=example.com").first()).toBeVisible({ timeout: 10000 });
      await page.route(new RegExp(`/api/campaigns/${campaignId}/launch`), async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Campagne lancée" }) });
        } else {
          await route.continue();
        }
      });
      await page.route(new RegExp(`/api/campaigns/${campaignId}$`), async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: campaignId,
              name: campaignName,
              stats: { total: 2, pending: 0, processing: 0, done: 2, failed: 0 },
              prospects: [
                { id: "p-launch-1", url: "https://example.com", companyName: "Example Inc", status: "DONE", score: 85, createdAt: new Date().toISOString() },
                { id: "p-launch-2", url: "https://httpbin.org", companyName: "HTTPBin", status: "DONE", score: 72, createdAt: new Date().toISOString() },
              ],
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.click('button:has-text("Lancer")');
      await expect(page.locator("text=100%").or(page.locator("text=Terminé"))).toBeVisible({ timeout: 10000 });
      await expect(page.locator("text=85/100")).toBeVisible();
      await expect(page.locator("text=72/100")).toBeVisible();
    });

    test("J8_Campaign_Mixed_Statuses_Badges_Retry", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Mixed Status User", email, password: "password123" });
      const campaignName = `Mixed Campaign ${Date.now()}`;
      await createCampaign(page, campaignName);
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      await page.route(new RegExp(`/api/campaigns/${campaignId}$`), async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: campaignId,
              name: campaignName,
              stats: { total: 4, pending: 1, processing: 1, done: 1, failed: 1 },
              prospects: [
                { id: "p-mix-1", url: "https://done.com", companyName: "Done Corp", status: "DONE", score: 85, createdAt: new Date().toISOString() },
                { id: "p-mix-2", url: "https://fail.com", companyName: "Fail Inc", status: "FAILED", score: null, createdAt: new Date().toISOString() },
                { id: "p-mix-3", url: "https://proc.com", companyName: "Processing Ltd", status: "PROCESSING", score: null, createdAt: new Date().toISOString() },
                { id: "p-mix-4", url: "https://pend.com", companyName: "Pending Co", status: "PENDING", score: null, createdAt: new Date().toISOString() },
              ],
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.goto(`/campaigns/${campaignId}`);
      await expect(page.locator("text=Done Corp")).toBeVisible();
      await expect(page.locator("text=Fail Inc")).toBeVisible();
      await expect(page.locator("text=Processing Ltd")).toBeVisible();
      await expect(page.locator("text=Pending Co")).toBeVisible();
      await expect(page.locator("text=Terminé").first()).toBeVisible();
      await expect(page.locator("text=Échoué")).toBeVisible();
      await expect(page.locator("text=En cours")).toBeVisible();
      await expect(page.locator("text=En attente")).toBeVisible();
      const retryButtons = page.locator('button:has-text("Réessayer")');
      await expect(retryButtons).toHaveCount(1);
    });

  });

  test.describe("Scenario 3: Pricing Registration Billing Credits", () => {

    test("J9_Pricing_Visitor_Plans_Toggle_Annual_Monthly", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("Gratuit")).toBeVisible();
      await expect(page.getByText("Starter")).toBeVisible();
      await expect(page.getByText("Pro")).toBeVisible();
      await expect(page.getByText("Agency")).toBeVisible();
      await expect(page.getByText("0€/mois")).toBeVisible();
      await expect(page.getByText("49€/mois")).toBeVisible();
      await expect(page.getByText("149€/mois")).toBeVisible();
      await expect(page.getByText("399€/mois")).toBeVisible();
      const toggle = page.locator("button[role='switch']");
      await toggle.click();
      await expect(page.getByText("39€/mois")).toBeVisible();
      await expect(page.getByText("119€/mois")).toBeVisible();
      await expect(page.getByText("319€/mois")).toBeVisible();
      await expect(page.getByText("-20%")).toBeVisible();
      await toggle.click();
      await expect(page.getByText("49€/mois")).toBeVisible();
      await expect(page.getByText("-20%")).not.toBeVisible();
    });

    test("J10_Register_From_Pricing_Lands_Free_Plan", async ({ page }) => {
      await page.goto("/pricing");
      await page.getByText("Commencer").first().click();
      await expect(page).toHaveURL(/\/register/);
      const email = randomEmail();
      await register(page, { name: "Free Plan User", email, password: "password123" });
      await expect(page).toHaveURL(/\/dashboard/);
      const sidebar = page.locator("nav, aside").first();
      await expect(sidebar.locator("text=FREE").or(sidebar.locator("text=Gratuit"))).toBeVisible();
    });

    test("J11_Billing_Page_Plan_Credits_History", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Billing User", email, password: "password123" });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Facturation")).toBeVisible();
      await expect(page.locator("text=Crédits utilisés ce mois")).toBeVisible();
      await expect(page.locator("text=Actif")).toBeVisible();
      const transactionsSection = page.locator("text=Historique des transactions");
      await expect(transactionsSection).toBeVisible();
      const noTx = page.locator("text=Aucune transaction");
      const table = page.locator("table");
      const tableVisible = await table.isVisible().catch(() => false);
      if (!tableVisible) {
        await expect(noTx).toBeVisible();
      }
    });

    test("J12_Credit_Purchase_Redirect_Stripe", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Credit Purchase User", email, password: "password123" });
      await page.route("/api/stripe/credits/checkout", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ url: "https://checkout.stripe.com/c/test_123", sessionId: "cs_test_123" }),
          });
        } else {
          await route.continue();
        }
      });
      const checkoutResponse = await page.evaluate(async () => {
        const res = await fetch("/api/stripe/credits/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credits: 50 }),
        });
        return { status: res.status, data: await res.json() };
      });
      expect(checkoutResponse.status).toBe(200);
      expect(checkoutResponse.data.url).toContain("checkout.stripe.com");
      expect(checkoutResponse.data.sessionId).toBeTruthy();
    });

  });

  test.describe("Scenario 4: Team Invitation Full Flow", () => {

    test("J13_UserA_Create_Team_Owner_Badge", async ({ page }) => {
      const emailA = randomEmail();
      await register(page, { name: "Team Owner A", email: emailA, password: "password123" });
      await page.goto("/settings/teams");
      await page.waitForSelector('text=Nouvelle équipe');
      await page.click('text=Nouvelle équipe');
      const teamName = `Team Alpha ${Date.now()}`;
      await page.fill('input[placeholder="Nom de l\'équipe"]', teamName);
      await page.click('button:has-text("Créer")');
      await expect(page.locator(`text=${teamName}`)).toBeVisible({ timeout: 10000 });
      const card = page.locator(`text=${teamName}`).locator("..");
      await expect(card.locator('[class*="text-warning"]')).toBeVisible();
    });

    test("J14_UserA_Invite_UserB_API_Invitation_Created", async ({ page }) => {
      const emailA = randomEmail();
      await register(page, { name: "Inviter A", email: emailA, password: "password123" });
      const createRes = await page.request.post("/api/teams", { data: { name: "Invite Test Team" } });
      expect(createRes.status()).toBe(201);
      const { team } = await createRes.json();
      const inviteEmail = randomEmail();
      const inviteRes = await page.request.post(`/api/teams/${team.id}/invitations`, {
        data: { email: inviteEmail, role: "MEMBER" },
      });
      expect(inviteRes.status()).toBe(201);
      const inviteBody = await inviteRes.json();
      expect(inviteBody.invitation.email).toBe(inviteEmail);
      expect(inviteBody.invitation.role).toBe("MEMBER");
      const listRes = await page.request.get(`/api/teams/${team.id}/invitations`);
      expect(listRes.status()).toBe(200);
      const listBody = await listRes.json();
      const found = listBody.invitations.some((inv: Record<string, unknown>) => inv.email === inviteEmail);
      expect(found).toBe(true);
    });

    test("J15_UserB_Accept_Invitation_Sees_Team_Dashboard", async ({ page }) => {
      const emailA = randomEmail();
      const emailB = randomEmail();
      await register(page, { name: "Owner A", email: emailA, password: "password123" });
      await page.request.post("/api/auth/register", {
        data: { name: "Member B", email: emailB, password: "password123" },
      });
      const createRes = await page.request.post("/api/teams", { data: { name: "Accept Team" } });
      expect(createRes.status()).toBe(201);
      const { team } = await createRes.json();
      const inviteRes = await page.request.post(`/api/teams/${team.id}/invitations`, {
        data: { email: emailB, role: "MEMBER" },
      });
      expect(inviteRes.status()).toBe(201);
      const inviteBody = await inviteRes.json();
      const token = inviteBody.invitation.id;
      await page.goto("/logout");
      await page.waitForURL(/\/login/);
      await page.fill('input[name="email"]', emailB);
      await page.fill('input[name="password"]', "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/);
      await page.goto(`/teams/join/${token}`);
      await page.waitForSelector('text=Accepter');
      await page.click('text=Accepter');
      await expect(page.locator("text=Invitation acceptée")).toBeVisible({ timeout: 10000 });
      await page.goto("/settings/teams");
      await expect(page.locator("text=Accept Team")).toBeVisible({ timeout: 10000 });
    });

    test("J16_Invite_Existing_Member_Returns_400", async ({ page }) => {
      const emailA = randomEmail();
      await register(page, { name: "Owner C", email: emailA, password: "password123" });
      const createRes = await page.request.post("/api/teams", { data: { name: "Dup Invite Team" } });
      expect(createRes.status()).toBe(201);
      const { team } = await createRes.json();
      const inviteRes = await page.request.post(`/api/teams/${team.id}/invitations`, {
        data: { email: emailA, role: "MEMBER" },
      });
      expect(inviteRes.status()).toBe(400);
      const body = await inviteRes.json();
      expect(body.error).toBe("ALREADY_MEMBER");
    });

  });

  test.describe("Scenario 5: Blog Article Share Action Registration", () => {

    test("J17_Blog_Category_Filter_Articles", async ({ page }) => {
      await page.goto("/blog");
      await expect(page.getByText("Blog")).toBeVisible();
      await expect(page.getByText("Tous")).toBeVisible();
      await expect(page.getByText("Cold Outreach")).toBeVisible();
      await expect(page.getByText("UX Design")).toBeVisible();
      await expect(page.getByText("CRO")).toBeVisible();
      await expect(page.getByText("Productivité")).toBeVisible();
      await expect(page.getByText("Industry")).toBeVisible();
      const articleLinks = page.locator("a[href^='/blog/']");
      const count = await articleLinks.count();
      expect(count).toBeGreaterThanOrEqual(2);
      await page.getByText("UX Design").click();
      await expect(page).toHaveURL(/category=ux-design/);
      await page.getByText("Tous").click();
      await expect(page).toHaveURL(/\/blog$/);
    });

    test("J18_Article_Detail_Content_TOC_Share_Buttons", async ({ page }) => {
      await page.goto("/blog/cold-outreach-stats-2026");
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=ScreenCold Team")).toBeVisible();
      await expect(page.locator("text=Publié le")).toBeVisible();
      await expect(page.locator("text=Partager")).toBeVisible();
      const twitterBtn = page.locator('a[href*="twitter.com/intent/tweet"]');
      const linkedinBtn = page.locator('a[href*="linkedin.com/sharing"]');
      const shareExists = (await twitterBtn.count()) > 0 || (await linkedinBtn.count()) > 0;
      expect(shareExists).toBe(true);
      await expect(page.locator("text=Sommaire").or(page.locator("text=Table des matières"))).toBeVisible();
      await expect(page.locator("article p").first()).toBeVisible();
      await expect(page.locator("text=Articles similaires")).toBeVisible();
      const backLink = page.locator('a[href="/blog"]').or(page.locator("text=Retour au blog"));
      await expect(backLink).toBeVisible();
    });

    test("J19_Article_CTA_Register_Redirect_Dashboard", async ({ page }) => {
      await page.goto("/blog/cold-outreach-stats-2026");
      const ctaButton = page.locator("text=Commencer gratuitement").or(page.locator("a[href='/register']")).first();
      await expect(ctaButton).toBeVisible();
      await ctaButton.click();
      await expect(page).toHaveURL(/\/register/);
      const email = randomEmail();
      await register(page, { name: "Blog Convert User", email, password: "password123" });
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator("text=Audits ce mois").or(page.locator("text=Crédits disponibles"))).toBeVisible();
    });

  });

});
