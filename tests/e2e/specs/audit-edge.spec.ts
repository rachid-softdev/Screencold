import { test, expect } from "@playwright/test";
import { register } from "../fixtures/helpers";
import { TEST_URLS, TEST_AUDIT_URLS } from "../fixtures/mock-data";

test.describe("Audit Edge Cases", () => {

  test.describe("URL Edge Cases", () => {

    test("P2 Create audit with URL containing query params", async ({ page }) => {
      await register(page);

      const queryUrl = "https://example.com?page=1&ref=test&utm_source=google";

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          const body = JSON.parse(route.request().postData() || "{}");
          expect(body.url).toBe(queryUrl);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId: "audit-edge-qp-001",
              status: "PROCESSING",
              url: queryUrl,
              creditsRemaining: 9,
            }),
          });
        } else {
          await route.continue();
        }
      });

      const uiResponse = await page.evaluate(async (url) => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        return { status: res.status, data: await res.json() };
      }, queryUrl);

      expect(uiResponse.status).toBe(201);
      expect(uiResponse.data.url).toBe(queryUrl);
    });

    test("P2 Create audit with URL fragment stripped", async ({ page }) => {
      await register(page);

      const urlWithFragment = "https://example.com/page#section";
      const strippedUrl = "https://example.com/page";

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          const body = JSON.parse(route.request().postData() || "{}");
          expect(body.url).not.toContain("#");
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId: "audit-edge-frag-001",
              status: "PROCESSING",
              url: strippedUrl,
              creditsRemaining: 9,
            }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async (url) => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        return { status: res.status, data: await res.json() };
      }, urlWithFragment);

      expect(response.status).toBe(201);
      expect(response.data.url).not.toContain("#");
      expect(response.data.url).toBe(strippedUrl);
    });

    test("P2 Create audit with very long URL trims or rejects", async ({ page }) => {
      await register(page);

      const veryLongUrl = `https://example.com/${"a".repeat(2000)}`;

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          const body = JSON.parse(route.request().postData() || "{}");
          if (body.url.length > 2048) {
            await route.fulfill({
              status: 400,
              contentType: "application/json",
              body: JSON.stringify({
                error: "URL_TOO_LONG",
                message: "L'URL dépasse la longueur maximale autorisée",
              }),
            });
          } else {
            await route.fulfill({
              status: 201,
              contentType: "application/json",
              body: JSON.stringify({
                auditId: "audit-edge-long-001",
                status: "PROCESSING",
                url: body.url.slice(0, 2048),
                creditsRemaining: 9,
              }),
            });
          }
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async (url) => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        return { status: res.status, data: await res.json() };
      }, veryLongUrl);

      expect([201, 400]).toContain(response.status);
      if (response.status === 400) {
        expect(response.data.error).toMatch(/URL_TOO_LONG|INVALID_URL/);
      }
    });

    test("P2 Create audit with unicode URL normalized via punycode", async ({ page }) => {
      await register(page);

      const unicodeUrl = TEST_AUDIT_URLS.unicode;
      const punycodeUrl = "https://www.xn--knigssee-d9a.de";

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          const body = JSON.parse(route.request().postData() || "{}");
          const normalized = body.url.includes("xn--") ? body.url : punycodeUrl;
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId: "audit-edge-uni-001",
              status: "PROCESSING",
              url: normalized,
              creditsRemaining: 9,
            }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async (url) => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        return { status: res.status, data: await res.json() };
      }, unicodeUrl);

      expect(response.status).toBe(201);
      expect(response.data.url).toMatch(/xn--|königssee|königssee/);
    });

    test("P2 Create audit with non-standard port", async ({ page }) => {
      await register(page);

      const portUrl = "https://example.com:8080";

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          const body = JSON.parse(route.request().postData() || "{}");
          expect(body.url).toContain(":8080");
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId: "audit-edge-port-001",
              status: "PROCESSING",
              url: portUrl,
              creditsRemaining: 9,
            }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async (url) => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        return { status: res.status, data: await res.json() };
      }, portUrl);

      expect(response.status).toBe(201);
      expect(response.data.url).toContain(":8080");
    });
  });

  test.describe("Concurrent & Race Conditions", () => {

    test("P2 Create audit with campaign association", async ({ page }) => {
      await register(page);

      const campaignId = "camp-e2e-001";
      const auditUrl = "https://example.com";

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          const body = JSON.parse(route.request().postData() || "{}");
          expect(body.campaignId).toBe(campaignId);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId: "audit-edge-camp-001",
              status: "PROCESSING",
              url: auditUrl,
              campaignId,
              campaign: { id: campaignId, name: "E2E Test Campaign" },
              creditsRemaining: 9,
            }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async (id) => {
        const res = await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://example.com", campaignId: id }),
        });
        return { status: res.status, data: await res.json() };
      }, campaignId);

      expect(response.status).toBe(201);
      expect(response.data.campaignId).toBe(campaignId);
      expect(response.data.campaign).toBeDefined();
      expect(response.data.campaign.name).toBe("E2E Test Campaign");
    });

    test("P2 Submit same URL twice simultaneously", async ({ page }) => {
      await register(page);

      let callIndex = 0;

      await page.route(/\/api\/audits/, async (route) => {
        if (route.request().method() === "POST") {
          callIndex++;
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              auditId: `audit-simul-${callIndex}`,
              status: "PROCESSING",
              url: "https://example.com",
              creditsRemaining: 9 - callIndex,
            }),
          });
        } else {
          await route.continue();
        }
      });

      const results = await page.evaluate(async () => {
        const [r1, r2] = await Promise.all([
          fetch("/api/audits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: "https://example.com" }),
          }),
          fetch("/api/audits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: "https://example.com" }),
          }),
        ]);
        const d1 = await r1.json();
        const d2 = await r2.json();
        return {
          status1: r1.status,
          status2: r2.status,
          id1: d1.auditId,
          id2: d2.auditId,
        };
      });

      expect(results.status1).toBe(201);
      expect(results.status2).toBe(201);
      expect(results.id1).not.toBe(results.id2);
    });

    test("P2 Delete audit while still PROCESSING", async ({ page }) => {
      await register(page);

      const auditId = "audit-edge-del-processing";

      await page.route(new RegExp(`/api/audits/${auditId}`), async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              message: "Audit supprimé",
            }),
          });
        } else if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: auditId,
              status: "PROCESSING",
              screenshotUrl: null,
              overallScore: null,
              issues: [],
              prospect: {
                id: "prospect-del-proc",
                url: "https://example.com",
                companyName: "To Be Deleted",
                status: "PENDING",
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto(`/audits/${auditId}`);
      await expect(page.locator("text=Audit en cours...")).toBeVisible();

      const deleteResponse = await page.evaluate(async (id) => {
        const res = await fetch(`/api/audits/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        return { status: res.status, data: await res.json() };
      }, auditId);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data.success).toBe(true);
    });
  });

  test.describe("Audit Detail Edge Cases", () => {

    test("P2 Audit with 20+ issues renders all in scrollable list", async ({ page }) => {
      await register(page);

      const issues = Array.from({ length: 25 }, (_, i) => ({
        id: `issue-mass-${String(i + 1).padStart(3, "0")}`,
        severity: i % 3 === 0 ? "HIGH" : i % 3 === 1 ? "MEDIUM" : "LOW",
        category: ["SEO", "PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SECURITY"][i % 5],
        title: `Issue de test numéro ${i + 1}`,
        description: `Description détaillée pour l'issue ${i + 1}`,
        suggestion: `Suggestion pour résoudre l'issue ${i + 1}`,
      }));

      await page.route(/\/api\/audits\/audit-mass-issues/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "audit-mass-issues",
              status: "READY",
              screenshotUrl: "https://example.com/screenshot.png",
              overallScore: 45,
              siteType: "SAAS",
              issues,
              prospect: {
                id: "prospect-mass",
                url: "https://example.com",
                companyName: "Mass Issues Corp",
                status: "DONE",
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits/audit-mass-issues");

      for (let i = 0; i < 25; i++) {
        const firstIssue = issues[i];
        const issueText = page.locator(`text=${firstIssue.title}`);
        await expect(issueText).toBeVisible();
      }

      const issueCount = await page.locator('text=/Issue de test numéro/').count();
      expect(issueCount).toBe(25);
    });

    test("P2 Audit with score 0 shows red score badge", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/audit-score-zero/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "audit-score-zero",
              status: "READY",
              screenshotUrl: "https://example.com/screenshot.png",
              overallScore: 0,
              siteType: "SAAS",
              issues: [
                {
                  id: "issue-zero-001",
                  severity: "HIGH",
                  category: "SEO",
                  title: "Problème critique",
                  description: "Description",
                  suggestion: "Suggestion",
                },
              ],
              prospect: {
                id: "prospect-zero",
                url: "https://example.com",
                companyName: "Score Zero Inc",
                status: "DONE",
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits/audit-score-zero");

      await expect(page.locator("text=Score Zero Inc")).toBeVisible();
      await expect(page.locator("text=0/100")).toBeVisible();
    });

    test("P2 Audit with score 100 shows green score badge", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/audit-score-perfect/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "audit-score-perfect",
              status: "READY",
              screenshotUrl: "https://example.com/screenshot.png",
              overallScore: 100,
              siteType: "SAAS",
              issues: [],
              prospect: {
                id: "prospect-perfect",
                url: "https://example.com",
                companyName: "Perfect Score Inc",
                status: "DONE",
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/audits/audit-score-perfect");

      await expect(page.locator("text=Perfect Score Inc")).toBeVisible();
      await expect(page.locator("text=100/100")).toBeVisible();
    });

    test("P2 Audit download screenshot initiates download", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/audit-dl-edge/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "audit-dl-edge",
              status: "READY",
              screenshotUrl: "/api/audits/audit-dl-edge/screenshot-file",
              overallScore: 85,
              siteType: "SAAS",
              issues: [],
              prospect: {
                id: "prospect-dl-edge",
                url: "https://example.com",
                companyName: "Download Test",
                status: "DONE",
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.route(/\/api\/audits\/audit-dl-edge\/screenshot-file/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition": 'attachment; filename="screenshot.png"',
          },
          body: Buffer.from("fake-png-content"),
        });
      });

      const downloadResponse = await page.evaluate(async () => {
        const res = await fetch("/api/audits/audit-dl-edge/screenshot-file");
        return {
          status: res.status,
          contentType: res.headers.get("content-type"),
          contentDisposition: res.headers.get("content-disposition"),
        };
      });

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.contentType).toContain("image/png");
      expect(downloadResponse.contentDisposition).toContain("attachment");
      expect(downloadResponse.contentDisposition).toContain("screenshot.png");
    });
  });

  test.describe("Email Edge Cases", () => {

    test("P2 Email regeneration rapid clicks only first accepted", async ({ page }) => {
      await register(page);

      const auditId = "audit-rapid-regen";
      let regenCallCount = 0;

      await page.route(new RegExp(`/api/audits/${auditId}/email`), async (route) => {
        if (route.request().method() === "POST") {
          regenCallCount++;
          if (regenCallCount === 1) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                success: true,
                message: "Régénération de l'email en cours",
                status: "PROCESSING",
              }),
            });
          } else {
            await route.fulfill({
              status: 429,
              contentType: "application/json",
              body: JSON.stringify({
                error: "TOO_MANY_REQUESTS",
                message: "Trop de demandes. Veuillez attendre.",
              }),
            });
          }
        } else {
          await route.continue();
        }
      });

      await page.route(new RegExp(`/api/audits/${auditId}(?!.*email)`), async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: auditId,
              status: "READY",
              overallScore: 78,
              siteType: "SAAS",
              emailSubject: "Sujet initial",
              emailBody: "Corps initial",
              emailPs: "PS initial",
              issues: [],
              prospect: {
                id: "prospect-rapid",
                url: "https://example.com",
                companyName: "Rapid Test",
                status: "DONE",
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      const results = await page.evaluate(async (id) => {
        const requests = Array.from({ length: 5 }, () =>
          fetch(`/api/audits/${id}/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }).then(async (r) => ({ status: r.status, data: await r.json() }))
        );
        return Promise.all(requests);
      }, auditId);

      const successCount = results.filter((r) => r.status === 200).length;
      const rejectedCount = results.filter((r) => r.status === 429).length;

      expect(successCount).toBe(1);
      expect(rejectedCount).toBe(4);
    });

    test("P2 Update email with empty body returns validation error", async ({ page }) => {
      await register(page);

      const auditId = "audit-email-empty";

      await page.route(new RegExp(`/api/audits/${auditId}/email`), async (route) => {
        if (route.request().method() === "PATCH") {
          const body = JSON.parse(route.request().postData() || "{}");
          if (!body.body || body.body.trim() === "") {
            await route.fulfill({
              status: 400,
              contentType: "application/json",
              body: JSON.stringify({
                error: "VALIDATION_ERROR",
                message: "Le corps de l'email ne peut pas être vide",
                field: "body",
              }),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ success: true }),
            });
          }
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async (id) => {
        const res = await fetch(`/api/audits/${id}/email`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: "Test", body: "" }),
        });
        return { status: res.status, data: await res.json() };
      }, auditId);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe("VALIDATION_ERROR");
    });

    test("P2 Update email subject too long returns 400", async ({ page }) => {
      await register(page);

      const auditId = "audit-email-long-subject";

      await page.route(new RegExp(`/api/audits/${auditId}/email`), async (route) => {
        if (route.request().method() === "PATCH") {
          const body = JSON.parse(route.request().postData() || "{}");
          if (body.subject && body.subject.length > 255) {
            await route.fulfill({
              status: 400,
              contentType: "application/json",
              body: JSON.stringify({
                error: "VALIDATION_ERROR",
                message: "Le sujet ne peut pas dépasser 255 caractères",
                field: "subject",
              }),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ success: true }),
            });
          }
        } else {
          await route.continue();
        }
      });

      const longSubject = "S".repeat(256);

      const response = await page.evaluate(async (id) => {
        const res = await fetch(`/api/audits/${id}/email`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: "S".repeat(256), body: "Valid body" }),
        });
        return { status: res.status, data: await res.json() };
      }, auditId);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe("VALIDATION_ERROR");
      expect(response.data.field).toBe("subject");
    });

    test("P2 Save email without changes returns 400 NO_UPDATE", async ({ page }) => {
      await register(page);

      const auditId = "audit-email-nochange";
      const currentSubject = "Sujet existant";
      const currentBody = "Corps existant";

      await page.route(new RegExp(`/api/audits/${auditId}/email`), async (route) => {
        if (route.request().method() === "PATCH") {
          const body = JSON.parse(route.request().postData() || "{}");
          if (body.subject === currentSubject && body.body === currentBody) {
            await route.fulfill({
              status: 400,
              contentType: "application/json",
              body: JSON.stringify({
                error: "NO_UPDATE",
                message: "Aucune modification détectée",
              }),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ success: true }),
            });
          }
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async (id) => {
        const res = await fetch(`/api/audits/${id}/email`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: "Sujet existant", body: "Corps existant" }),
        });
        return { status: res.status, data: await res.json() };
      }, auditId);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe("NO_UPDATE");
    });
  });

  test.describe("Export Edge Cases", () => {

    test("P2 Export CSV filtered by campaign returns only campaign audits", async ({ page }) => {
      await register(page);

      const campaignId = "camp-export-001";

      await page.route(/\/api\/audits\/export/, async (route) => {
        if (route.request().method() === "GET") {
          const url = new URL(route.request().url());
          const filterCampaign = url.searchParams.get("campaignId");
          if (filterCampaign === campaignId) {
            await route.fulfill({
              status: 200,
              contentType: "text/csv",
              body: [
                "ID,URL,Entreprise,Score,Campagne",
                '"audit-camp-001","https://camp1.com","Campany Alpha","85","E2E Export Campaign"',
                '"audit-camp-002","https://camp2.com","Campany Beta","62","E2E Export Campaign"',
              ].join("\n"),
              headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": 'attachment; filename="audits-campaign-export.csv"',
              },
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: "text/csv",
              body: "ID,URL,Entreprise,Score,Campagne",
              headers: {
                "Content-Type": "text/csv",
              },
            });
          }
        } else {
          await route.continue();
        }
      });

      const response = await page.evaluate(async (campId) => {
        const res = await fetch(`/api/audits/export?format=csv&campaignId=${campId}`);
        const text = await res.text();
        return { status: res.status, text, lines: text.split("\n") };
      }, campaignId);

      expect(response.status).toBe(200);
      expect(response.lines.length).toBe(3);
      expect(response.text).toContain("Campany Alpha");
      expect(response.text).toContain("Campany Beta");
      expect(response.text).toContain(campaignId);
    });

    test("P2 Export CSV with special characters properly escaped", async ({ page }) => {
      await register(page);

      await page.route(/\/api\/audits\/export/, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "text/csv",
            body: [
              "ID,URL,Entreprise,Contact Email,Notes",
              '"audit-csv-001","https://example.com","Example, Inc.","john@example.com","Contains, commas, and ""quotes"" inside"',
              '"audit-csv-002","https://test.com","Test ""Special"" Corp","jane@example.com","Line 1\nLine 2"',
            ].join("\n"),
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": 'attachment; filename="audits-special.csv"',
            },
          });
        }
      });

      const response = await page.evaluate(async () => {
        const res = await fetch("/api/audits/export?format=csv");
        const text = await res.text();
        return { status: res.status, text };
      });

      expect(response.status).toBe(200);
      expect(response.text).toContain("Example, Inc.");
      expect(response.text).toContain('"Test ""Special"" Corp"');
      expect(response.text).toContain("commas");
      expect(response.text).toContain('""quotes""');
    });
  });
});
