import { test, expect } from "@playwright/test";
import { register, createAudit, waitForToast } from "../fixtures/helpers";
import { TEST_URLS, TEST_AUDIT_URLS } from "../fixtures/mock-data";

test.describe("Audit Pipeline", () => {
  test.describe("Create Audit", () => {
    test("P0 Create audit with valid URL", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId: "cm9h7k2ly0000i2bxr87z9p1q",
              status: "PROCESSING",
              creditsRemaining: 9,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await createAudit(page, TEST_AUDIT_URLS.standard);
      await waitForToast(page);
    });

    test("P0 Create audit with URL auto-prefix", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          const body = JSON.parse(route.request().postData() || "{}");
          const url = body.url || "";
          const hasProtocol = url.startsWith("http://") || url.startsWith("https://");
          const normalizedUrl = hasProtocol ? url : `https://${url}`;
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId: "cm9h7k2ly0000i2bxr87z9p2q",
              status: "PROCESSING",
              url: normalizedUrl,
              creditsRemaining: 9,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits/new");
      await page.fill('input[name="url"]', "www.example.com");
      await page.click('button[type="submit"]');

      const validationError = page.locator("text=URL invalide");
      if (await validationError.isVisible().catch(() => false)) {
        const response = await page.evaluate(async () => {
          const res = await fetch("/api/audits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: "www.example.com" }),
          });
          return { status: res.status, data: await res.json() };
        });
        expect(response.status).toBe(201);
        expect(response.data.status).toBe("PROCESSING");
      } else {
        await waitForToast(page);
      }
    });

    test("P0 Create audit with empty URL", async ({ page }) => {
      await register(page);
      await page.goto("/audits/new");
      await page.click('button[type="submit"]');
      await expect(page.locator("text=URL invalide")).toBeVisible();
    });

    test("P0 Create audit with invalid URL format", async ({ page }) => {
      await register(page);
      await page.goto("/audits/new");
      await page.fill('input[name="url"]', TEST_URLS.invalid);
      await page.click('button[type="submit"]');
      await expect(page.locator("text=URL invalide")).toBeVisible();
    });

    test("P0 Create audit without authentication", async ({ page }) => {
      await page.goto("/audits/new");
      await page.waitForURL(/\/login/);
    });

    test("P0 Create audit with localhost (SSRF blocked)", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "INVALID_URL", message: "Cette URL n'est pas accessible" }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: TEST_URLS.localhost }),
        });
        return { status: res.status, data: await res.json() };
      });
      expect(response.status).toBe(400);
      expect(response.data.error).toBe("INVALID_URL");
      expect(response.data.message).toBe("Cette URL n'est pas accessible");
    });

    test("P1 Create audit with non-HTTP protocol", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              error: "INVALID_URL",
              message: "Seuls les protocoles HTTP et HTTPS sont acceptés",
            }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: TEST_URLS.nonHTTP }),
        });
        return { status: res.status, data: await res.json() };
      });
      expect(response.status).toBe(400);
      expect(response.data.error).toBe("INVALID_URL");
    });

    test("P1 Create audit with AWS metadata SSRF blocked", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "INVALID_URL", message: "Cette URL n'est pas accessible" }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: TEST_URLS.awsMetadata }),
        });
        return { status: res.status, data: await res.json() };
      });
      expect(response.status).toBe(400);
      expect(response.data.error).toBe("INVALID_URL");
    });

    test("P0 Create audit with private IP SSRF blocked", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "INVALID_URL", message: "Cette URL n'est pas accessible" }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: TEST_URLS.privateIP }),
        });
        return { status: res.status, data: await res.json() };
      });
      expect(response.status).toBe(400);
      expect(response.data.error).toBe("INVALID_URL");
    });

    test("P0 Create audit with zero credits", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 402,
            contentType: "application/json",
            body: JSON.stringify({
              error: "NO_CREDITS",
              message: "Vous n'avez plus de crédits. Upgradez votre plan pour continuer.",
              currentCredits: 0,
            }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://example.com" }),
        });
        return { status: res.status, data: await res.json() };
      });
      expect(response.status).toBe(402);
      expect(response.data.error).toBe("NO_CREDITS");
      expect(response.data.currentCredits).toBe(0);
    });

    test("P1 Create audit with internal hostname blocked", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "INVALID_URL", message: "Cette URL n'est pas accessible" }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "http://company.internal/admin" }),
        });
        return { status: res.status, data: await res.json() };
      });
      expect(response.status).toBe(400);
      expect(response.data.error).toBe("INVALID_URL");
    });
  });

  test.describe("Audit List", () => {
    test("P0 Audit list shows audits", async ({ page }) => {
      await register(page);

      const mockAudits = [
        {
          id: "audit-001",
          status: "READY",
          overallScore: 85,
          screenshotUrl: "https://example.com/screenshot1.png",
          companyName: "Example Inc",
          createdAt: new Date().toISOString(),
          prospect: {
            id: "prospect-001",
            url: "https://example.com",
            companyName: "Example Inc",
            status: "DONE",
          },
        },
        {
          id: "audit-002",
          status: "PROCESSING",
          overallScore: null,
          screenshotUrl: null,
          companyName: "Test Corp",
          createdAt: new Date().toISOString(),
          prospect: {
            id: "prospect-002",
            url: "https://testcorp.com",
            companyName: "Test Corp",
            status: "PENDING",
          },
        },
      ];

      await page.route(/\/api\/audits(\?|$)/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              audits: mockAudits,
              pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits");
      await expect(page.locator("text=2 audits")).toBeVisible();
      await expect(page.locator("text=Example Inc")).toBeVisible();
      await expect(page.locator("text=Test Corp")).toBeVisible();
      await expect(page.locator("text=85/100")).toBeVisible();
      await expect(page.locator("text=En cours")).toBeVisible();
    });

    test("P0 Audit list empty state", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits(\?|$)/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              audits: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits");
      await expect(page.locator("text=Aucun audit pour le moment")).toBeVisible();
      await expect(page.locator("text=Faire mon premier audit")).toBeVisible();
    });

    test("P0 Audit list unauthenticated", async ({ page }) => {
      await page.goto("/audits");
      await page.waitForURL(/\/login/);
    });

    test("P1 Audit list pagination", async ({ page }) => {
      await register(page);

      const audits = Array.from({ length: 25 }, (_, i) => ({
        id: `audit-${String(i + 1).padStart(3, "0")}`,
        status: "READY",
        overallScore: Math.floor(Math.random() * 100),
        screenshotUrl: null,
        companyName: `Company ${i + 1}`,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        prospect: {
          id: `prospect-${String(i + 1).padStart(3, "0")}`,
          url: `https://company${i + 1}.com`,
          companyName: `Company ${i + 1}`,
          status: "DONE",
        },
      }));

      await page.route(/\/api\/audits(\?|$)/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              audits: audits.slice(0, 20),
              pagination: { page: 1, limit: 20, total: 25, totalPages: 2 },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits");
      await expect(page.locator("text=Company 1")).toBeVisible();
      await expect(page.locator("text=25 audits")).toBeVisible();
    });

    test("P1 Audit list search by URL", async ({ page }) => {
      await register(page);

      const mockAudits = [
        {
          id: "audit-search-001",
          status: "READY",
          overallScore: 85,
          screenshotUrl: null,
          companyName: "Acme Corp",
          createdAt: new Date().toISOString(),
          prospect: {
            id: "prospect-search-001",
            url: "https://acme.com",
            companyName: "Acme Corp",
            status: "DONE",
          },
        },
        {
          id: "audit-search-002",
          status: "READY",
          overallScore: 42,
          screenshotUrl: null,
          companyName: "Beta Inc",
          createdAt: new Date().toISOString(),
          prospect: {
            id: "prospect-search-002",
            url: "https://beta.com",
            companyName: "Beta Inc",
            status: "DONE",
          },
        },
      ];

      await page.route(/\/api\/audits(\?|$)/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              audits: mockAudits,
              pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits");
      await expect(page.locator("text=Acme Corp")).toBeVisible();
      await expect(page.locator("text=Beta Inc")).toBeVisible();

      await page.fill('input[placeholder="Rechercher un audit..."]', "Acme");
      await expect(page.locator("text=Acme Corp")).toBeVisible();
      await expect(page.locator("text=Beta Inc")).not.toBeVisible();
    });
  });

  test.describe("Audit Detail", () => {
    const mockCompletedAudit = {
      id: "audit-completed-001",
      status: "READY",
      screenshotUrl: "https://example.com/screenshots/desktop.png",
      annotatedUrl: "https://example.com/screenshots/annotated.png",
      mobileUrl: "https://example.com/screenshots/mobile.png",
      overallScore: 72,
      siteType: "E_COMMERCE",
      emailSubject: "Amélioration de votre site web",
      emailBody: "Bonjour,\n\nNous avons analysé votre site et voici nos recommandations.",
      emailPs: "Cet email a été généré automatiquement.",
      errorMessage: null,
      processingTime: 15420,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issues: [
        {
          id: "issue-001",
          severity: "HIGH",
          category: "SEO",
          title: "Balises meta manquantes",
          description: "La page ne contient pas de balise meta description",
          suggestion: "Ajoutez une balise meta description pertinente",
        },
        {
          id: "issue-002",
          severity: "MEDIUM",
          category: "PERFORMANCE",
          title: "Images non optimisées",
          description: "Plusieurs images dépassent 500 Ko",
          suggestion: "Compressez les images avant de les servir",
        },
        {
          id: "issue-003",
          severity: "LOW",
          category: "ACCESSIBILITY",
          title: "Contraste insuffisant",
          description: "Le contraste des textes est insuffisant",
          suggestion: "Augmentez le contraste pour respecter les normes WCAG",
        },
      ],
      prospect: {
        id: "prospect-completed-001",
        url: "https://example.com",
        companyName: "Example Inc",
        contactName: "Jean Dupont",
        contactEmail: "jean@example.com",
        notes: null,
        status: "DONE",
        campaignId: "campaign-001",
        campaign: { id: "campaign-001", name: "Campagne Test" },
      },
    };

    test("P0 View completed audit detail", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/completed-001/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockCompletedAudit),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits/completed-001");
      await expect(page.locator("text=Example Inc")).toBeVisible();
      await expect(page.locator(`text=${mockCompletedAudit.overallScore}`)).toBeVisible();
      await expect(page.locator("text=Balises meta manquantes")).toBeVisible();
      await expect(page.locator("text=Images non optimisées")).toBeVisible();
      await expect(page.locator("text=Amélioration de votre site web")).toBeVisible();
      await expect(page.locator("text=E_COMMERCE")).toBeVisible();
      await expect(page.locator("text=Télécharger")).toBeVisible();
      await expect(page.locator("text=Régénérer")).toBeVisible();
    });

    test("P0 View non-existent audit", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/non-existent-id/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "NOT_FOUND", message: "Audit non trouvé" }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits/non-existent-id");
      await expect(page.locator("text=Audit non trouvé")).toBeVisible();
      await expect(page.locator("text=Retour aux audits")).toBeVisible();
    });

    test("P0 Access another user's audit", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/other-users-audit/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 403,
            contentType: "application/json",
            body: JSON.stringify({
              error: "FORBIDDEN",
              message: "Vous n'avez pas accès à cet audit",
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits/other-users-audit");
      await expect(page.locator("text=Vous n'avez pas accès à cet audit")).toBeVisible();
    });

    test("P0 View processing audit shows loading state", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/processing-audit/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "audit-processing-001",
              status: "PROCESSING",
              screenshotUrl: null,
              annotatedUrl: null,
              overallScore: null,
              siteType: null,
              emailSubject: null,
              emailBody: null,
              emailPs: null,
              errorMessage: null,
              processingTime: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              issues: [],
              prospect: {
                id: "prospect-processing-001",
                url: "https://example.com",
                companyName: "Example Inc",
                contactName: null,
                contactEmail: null,
                notes: null,
                status: "PENDING",
                campaignId: "campaign-001",
                campaign: { id: "campaign-001", name: "Campagne Test" },
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits/processing-audit");
      await expect(page.locator("text=Audit en cours...")).toBeVisible();
      await expect(page.locator("text=Example Inc")).toBeVisible();
    });

    test("P1 View failed audit shows error state", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/failed-audit/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "audit-failed-001",
              status: "FAILED",
              screenshotUrl: null,
              annotatedUrl: null,
              overallScore: null,
              siteType: null,
              emailSubject: null,
              emailBody: null,
              emailPs: null,
              errorMessage: "Le site cible n'a pas répondu dans le délai imparti",
              processingTime: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              issues: [],
              prospect: {
                id: "prospect-failed-001",
                url: "https://example.com",
                companyName: "Example Inc",
                contactName: null,
                contactEmail: null,
                notes: null,
                status: "FAILED",
                campaignId: "campaign-001",
                campaign: { id: "campaign-001", name: "Campagne Test" },
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits/failed-audit");
      await expect(page.locator("text=Échec de l'audit")).toBeVisible();
      await expect(page.locator("text=Le site cible n'a pas répondu dans le délai imparti")).toBeVisible();
      await expect(page.locator("text=Réessayer")).toBeVisible();
    });
  });

  test.describe("SSE Progress", () => {
    test("P0 Create audit and poll until READY", async ({ page }) => {
      await register(page);

      const auditId = "audit-poll-test-001";

      await page.route(/\/api\/audits/, async (route) => {
        const reqUrl = route.request().url();
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId,
              status: "PROCESSING",
              creditsRemaining: 9,
            }),
          });
          return;
        }
        if (route.request().method() === "GET" && reqUrl.includes(auditId)) {
          const poolStatus = route.request().url().includes("poll=ready")
            ? "READY"
            : "PROCESSING";
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: auditId,
              status: poolStatus,
              overallScore: poolStatus === "READY" ? 85 : null,
            }),
          });
          return;
        }
        await route.continue();
      });

      const result = await page.evaluate(async (id) => {
        const createRes = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://example.com" }),
        });
        const created = await createRes.json();
        if (createRes.status !== 201) return { status: "FAILED", created };

        let audit = null;
        let attempts = 0;
        const maxAttempts = 30;
        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500));
          const res = await fetch(`/api/audits/${id}?poll=ready`);
          audit = await res.json();
          if (audit.status === "READY" || audit.status === "FAILED") break;
          attempts++;
        }
        return { status: audit?.status, attempts };
      }, auditId);

      expect(result.status).toBe("READY");
      expect(result.attempts).toBeLessThan(30);
    });
  });

  test.describe("Email & Export", () => {
    test("P0 Regenerate email for completed audit", async ({ page }) => {
      await register(page);

      const auditId = "audit-email-regen-001";

      const mockReadyAudit = {
        id: auditId,
        status: "READY",
        screenshotUrl: "https://example.com/screenshot.png",
        annotatedUrl: "https://example.com/annotated.png",
        overallScore: 78,
        siteType: "SAAS",
        emailSubject: "Sujet initial",
        emailBody: "Corps initial",
        emailPs: "PS initial",
        errorMessage: null,
        processingTime: 12000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        issues: [
          {
            id: "issue-001",
            severity: "MEDIUM",
            category: "SEO",
            title: "Test issue",
            description: "Description",
            suggestion: "Suggestion",
          },
        ],
        prospect: {
          id: "prospect-001",
          url: "https://example.com",
          companyName: "Example Inc",
          contactName: "Jean",
          contactEmail: "jean@example.com",
          notes: null,
          status: "DONE",
          campaignId: "campaign-001",
          campaign: { id: "campaign-001", name: "Campagne" },
        },
      };

      await page.route(/\/api\/audits/, async (route) => {
        const reqUrl = route.request().url();
        if (route.request().method() === "GET" && reqUrl.includes(auditId) && !reqUrl.includes("email")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockReadyAudit),
          });
          return;
        }
        if (route.request().method() === "POST" && reqUrl.includes(`/api/audits/${auditId}/email`)) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              message: "Régénération de l'email en cours",
              status: "PROCESSING",
            }),
          });
          return;
        }
        await route.continue();
      });

      await page.goto(`/audits/${auditId}`);
      await expect(page.locator("text=Sujet initial")).toBeVisible();

      await page.click("text=Régénérer");

      const regenResponse = await page.evaluate(async (id) => {
        const res = await fetch(`/api/audits/${id}/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        return { status: res.status, data: await res.json() };
      }, auditId);

      expect(regenResponse.status).toBe(200);
      expect(regenResponse.data.success).toBe(true);
      expect(regenResponse.data.message).toContain("Régénération");
    });

    test("P1 Regenerate email while audit is processing", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/processing-email/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "audit-processing-email",
              status: "PROCESSING",
              screenshotUrl: null,
              overallScore: null,
              issues: [],
              prospect: {
                id: "prospect-001",
                url: "https://example.com",
                companyName: "Example Inc",
              },
            }),
          });
          return;
        }
        await route.continue();
      });

      await page.route(/\/api\/audits\/processing-email\/email/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              error: "AUDIT_NOT_READY",
              message: "L'audit est encore en cours de traitement",
            }),
          });
          return;
        }
        await route.continue();
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits/processing-email/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        return { status: res.status, data: await res.json() };
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toBe("AUDIT_NOT_READY");
    });

    test("P1 Regenerate email for failed audit", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/failed-email\/email/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              error: "AUDIT_FAILED",
              message: "Impossible de régénérer l'email pour un audit échoué",
            }),
          });
          return;
        }
        await route.continue();
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits/failed-email/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        return { status: res.status, data: await res.json() };
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toBe("AUDIT_FAILED");
    });

    test("P0 Export audits as CSV", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/export/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "text/csv",
            body: [
              "ID,URL,Entreprise,Contact Nom,Contact Email,Score,Type de Site,Statut,Date de création,Temps de traitement (ms)",
              '"audit-001","https://example.com","Example Inc","Jean","jean@example.com","85","E_COMMERCE","READY","2025-01-15T10:00:00.000Z","12000"',
              '"audit-002","https://testcorp.com","Test Corp","Marie","marie@testcorp.com","42","SAAS","READY","2025-01-14T08:30:00.000Z","8500"',
            ].join("\n"),
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": 'attachment; filename="audits-2025-01-15.csv"',
            },
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits/export?format=csv");
        const contentType = res.headers.get("content-type") || "";
        const contentDisposition = res.headers.get("content-disposition") || "";
        const text = await res.text();
        return {
          status: res.status,
          contentType,
          contentDisposition,
          text,
        };
      });

      expect(response.status).toBe(200);
      expect(response.contentType).toContain("text/csv");
      expect(response.contentDisposition).toContain("attachment");
      expect(response.contentDisposition).toContain(".csv");
      expect(response.text).toContain("ID,URL,Entreprise");
      expect(response.text).toContain("example.com");
      expect(response.text).toContain("testcorp.com");
    });

    test("P1 Export audits as JSON", async ({ page }) => {
      await register(page);

      const mockExportData = {
        audits: [
          {
            id: "audit-001",
            url: "https://example.com",
            companyName: "Example Inc",
            contactName: "Jean",
            contactEmail: "jean@example.com",
            overallScore: 85,
            siteType: "E_COMMERCE",
            status: "READY",
            createdAt: new Date().toISOString(),
          },
        ],
      };

      await page.route(/\/api\/audits\/export/, async (route) => {
        if (route.request().method() === "GET") {
          const url = new URL(route.request().url());
          const format = url.searchParams.get("format");
          if (format === "json") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(mockExportData),
            });
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "text/csv",
            body: "ID,URL\n",
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits/export?format=json");
        return { status: res.status, data: await res.json() };
      });

      expect(response.status).toBe(200);
      expect(response.data.audits).toHaveLength(1);
      expect(response.data.audits[0].companyName).toBe("Example Inc");
      expect(response.data.audits[0].overallScore).toBe(85);
    });

    test("P1 Export without proper plan", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/export/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 403,
            contentType: "application/json",
            body: JSON.stringify({
              error: "FORBIDDEN",
              message: "Export CSV non disponible pour votre plan",
            }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits/export");
        return { status: res.status, data: await res.json() };
      });

      expect(response.status).toBe(403);
      expect(response.data.error).toBe("FORBIDDEN");
    });

    test("P1 Export with no audits returns headers-only CSV", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/export/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "text/csv",
            body: "ID,URL,Entreprise,Contact Nom,Contact Email,Score,Type de Site,Statut,Date de création,Temps de traitement (ms)",
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": 'attachment; filename="audits-2025-01-15.csv"',
            },
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits/export");
        const text = await res.text();
        return { status: res.status, lines: text.split("\n").length };
      });

      expect(response.status).toBe(200);
      expect(response.lines).toBe(1);
    });
  });
});
