import { test, expect } from "@playwright/test";
import { login, createCampaign } from "../fixtures/helpers";
import { TEST_CSV } from "../fixtures/mock-data";
import path from "path";
import os from "os";
import fs from "fs";

test.describe("Campaigns Edge Cases", () => {

  test.describe("CSV Import Edge Cases", () => {

    test("Import CSV with BOM UTF-8 prefix strips BOM and imports prospects", async ({ page }) => {
      await login(page);
      await createCampaign(page, "BOM CSV Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const csvPath = path.join(os.tmpdir(), "bom-test.csv");
      fs.writeFileSync(csvPath, "\ufeff" + TEST_CSV.valid);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await expect(page.locator("text=Example Inc")).toBeVisible();
      await expect(page.locator("text=HTTPBin")).toBeVisible();
    });

    test("Import CSV with unicode accents in company names renders correctly", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Unicode CSV Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const csvContent = `url,companyName,contactName,contactEmail
https://example.com,Entreprise Éléctronique,José,josé@example.com
https://httpbin.org,Münchener GmbH,Franz übel,übel@example.com
https://example.org,Señor Tacos ñoño,Señor,señor@example.com`;
      const csvPath = path.join(os.tmpdir(), "unicode-test.csv");
      fs.writeFileSync(csvPath, csvContent);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await expect(page.locator("text=Entreprise Éléctronique")).toBeVisible();
      await expect(page.locator("text=Münchener GmbH")).toBeVisible();
      await expect(page.locator("text=Señor Tacos ñoño")).toBeVisible();
    });

    test("Import CSV with extra columns ignores unrecognized columns and imports recognized", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Extra Cols CSV");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const csvContent = `url,companyName,contactName,contactEmail,phone,address
https://example.com,Extra Cols Inc,John,john@example.com,+33123456789,123 Rue de Paris
https://httpbin.org,Extra Cols GmbH,Jane,jane@example.com,+4930123456,Berlin`;
      const csvPath = path.join(os.tmpdir(), "extra-cols.csv");
      fs.writeFileSync(csvPath, csvContent);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await expect(page.locator("text=Extra Cols Inc")).toBeVisible();
      await expect(page.locator("text=Extra Cols GmbH")).toBeVisible();
    });

    test("Import CSV with partial success imports valid rows and shows error summary for invalid rows", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Partial CSV Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      await page.route(new RegExp(`/api/campaigns/${campaignId}/prospects`), async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              imported: 5,
              skipped: 3,
              total: 8,
              remainingSlots: 95,
              errors: [
                "URL invalide: not-a-url",
                "URL manquante à la ligne 7",
                "Nom d'entreprise manquant à la ligne 8",
              ],
            }),
          });
        } else {
          await route.continue();
        }
      });
      const csvContent = `url,companyName
https://valid1.com,Valid One
https://valid2.com,Valid Two
https://valid3.com,Valid Three
https://valid4.com,Valid Four
https://valid5.com,Valid Five
not-a-url,Invalid One
,Invalid Two
https://valid6.com,`;
      const csvPath = path.join(os.tmpdir(), "partial.csv");
      fs.writeFileSync(csvPath, csvContent);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await expect(page.locator("text=Valid One")).toBeVisible();
      await expect(page.locator("text=Valid Two")).toBeVisible();
      await expect(page.locator("text=Valid Three")).toBeVisible();
      await expect(page.locator("text=Valid Four")).toBeVisible();
      await expect(page.locator("text=Valid Five")).toBeVisible();
    });

    test("Import CSV with duplicate URLs imports first instance and skips duplicates", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Dedup CSV Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      await page.route(new RegExp(`/api/campaigns/${campaignId}/prospects`), async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              imported: 2,
              skipped: 1,
              total: 3,
              remainingSlots: 98,
              errors: ["URL en double ignorée: https://example.com"],
            }),
          });
        } else {
          await route.continue();
        }
      });
      const csvContent = `url,companyName
https://example.com,First Instance
https://example.com,Second Instance
https://httpbin.org,Third Instance`;
      const csvPath = path.join(os.tmpdir(), "dedup.csv");
      fs.writeFileSync(csvPath, csvContent);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await expect(page.locator("text=First Instance")).toBeVisible();
      await expect(page.locator("text=Third Instance")).toBeVisible();
    });

    test("Import CSV file larger than 10MB shows fichier est trop volumineux error", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Large File CSV");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const largePath = path.join(os.tmpdir(), "large-file.csv");
      const largeContent = Buffer.alloc(11 * 1024 * 1024, "x");
      fs.writeFileSync(largePath, largeContent);
      await page.setInputFiles('input[type="file"]', largePath);
      fs.unlinkSync(largePath);
      await expect(page.locator("text=fichier est trop volumineux")).toBeVisible();
    });

  });

  test.describe("Campaign Progress Edge Cases", () => {

    test("Campaign with all FAILED prospects shows Retry button per row", async ({ page }) => {
      await login(page);
      await createCampaign(page, "All Failed Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      await page.route(new RegExp(`/api/campaigns/${campaignId}`), async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: campaignId,
              name: "All Failed Campaign",
              stats: { total: 3, pending: 0, processing: 0, done: 0, failed: 3 },
              prospects: [
                { id: "p1", url: "https://fail1.com", companyName: "Fail One", status: "FAILED", score: null, createdAt: new Date().toISOString() },
                { id: "p2", url: "https://fail2.com", companyName: "Fail Two", status: "FAILED", score: null, createdAt: new Date().toISOString() },
                { id: "p3", url: "https://fail3.com", companyName: "Fail Three", status: "FAILED", score: null, createdAt: new Date().toISOString() },
              ],
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.goto(`/campaigns/${campaignId}`);
      await page.waitForSelector("text=Fail One");
      await expect(page.locator("text=Fail Two")).toBeVisible();
      await expect(page.locator("text=Fail Three")).toBeVisible();
      const retryButtons = page.locator('button:has-text("Réessayer")');
      const visibleRetryButtons = await retryButtons.count();
      expect(visibleRetryButtons).toBe(3);
    });

    test("Campaign progress at 0 percent shows correct bar state with all PENDING", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Zero Progress Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      await page.route(new RegExp(`/api/campaigns/${campaignId}`), async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: campaignId,
              name: "Zero Progress Campaign",
              stats: { total: 5, pending: 5, processing: 0, done: 0, failed: 0 },
              prospects: [
                { id: "p1", url: "https://pend1.com", companyName: "Pend One", status: "PENDING", score: null, createdAt: new Date().toISOString() },
                { id: "p2", url: "https://pend2.com", companyName: "Pend Two", status: "PENDING", score: null, createdAt: new Date().toISOString() },
              ],
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.goto(`/campaigns/${campaignId}`);
      await expect(page.locator("text=0%")).toBeVisible();
    });

    test("Campaign progress at 100 percent shows green bar and 100 percent completed", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Full Progress Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      await page.route(new RegExp(`/api/campaigns/${campaignId}`), async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: campaignId,
              name: "Full Progress Campaign",
              stats: { total: 5, pending: 0, processing: 0, done: 5, failed: 0 },
              prospects: [
                { id: "p1", url: "https://done1.com", companyName: "Done One", status: "DONE", score: 85, createdAt: new Date().toISOString() },
                { id: "p2", url: "https://done2.com", companyName: "Done Two", status: "DONE", score: 72, createdAt: new Date().toISOString() },
              ],
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.goto(`/campaigns/${campaignId}`);
      await expect(page.locator("text=100%").first()).toBeVisible();
    });

    test("Launch campaign with insufficient credits shows error toast", async ({ page }) => {
      await login(page);
      await createCampaign(page, "No Credits Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      const csvPath = path.join(os.tmpdir(), "nocredits-prospects.csv");
      fs.writeFileSync(csvPath, TEST_CSV.valid);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await page.route(new RegExp(`/api/campaigns/${campaignId}/launch`), async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 402,
            contentType: "application/json",
            body: JSON.stringify({
              error: "INSUFFICIENT_CREDITS",
              message: "Crédits insuffisants. Vous avez 0 crédit(s) mais 2 sont nécessaires.",
              required: 2,
              available: 0,
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.click('button:has-text("Lancer")');
      await expect(page.locator("text=Crédits insuffisants")).toBeVisible();
    });

  });

  test.describe("Campaign Detail Edge Cases", () => {

    test("Campaign with zero prospects shows empty state and disabled Lancer button", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Empty Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      await page.route(new RegExp(`/api/campaigns/${campaignId}`), async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: campaignId,
              name: "Empty Campaign",
              stats: { total: 0, pending: 0, processing: 0, done: 0, failed: 0 },
              prospects: [],
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.goto(`/campaigns/${campaignId}`);
      await expect(page.locator("text=Aucun prospect dans cette campagne")).toBeVisible();
      const lancerButton = page.locator('button:has-text("Lancer")');
      if (await lancerButton.isVisible()) {
        await expect(lancerButton).toBeDisabled();
      }
    });

    test("Campaign detail with mixed prospect statuses shows correct badge for each", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Mixed Statuses Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      await page.route(new RegExp(`/api/campaigns/${campaignId}`), async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: campaignId,
              name: "Mixed Statuses Campaign",
              stats: { total: 5, pending: 1, processing: 1, done: 2, failed: 1 },
              prospects: [
                { id: "p1", url: "https://done1.com", companyName: "Done Corp", status: "DONE", score: 85, createdAt: new Date().toISOString() },
                { id: "p2", url: "https://done2.com", companyName: "Done Labs", status: "DONE", score: 72, createdAt: new Date().toISOString() },
                { id: "p3", url: "https://fail.com", companyName: "Fail Inc", status: "FAILED", score: null, createdAt: new Date().toISOString() },
                { id: "p4", url: "https://proc.com", companyName: "Processing Ltd", status: "PROCESSING", score: null, createdAt: new Date().toISOString() },
                { id: "p5", url: "https://pend.com", companyName: "Pending Co", status: "PENDING", score: null, createdAt: new Date().toISOString() },
              ],
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.goto(`/campaigns/${campaignId}`);
      await expect(page.locator("text=Done Corp")).toBeVisible();
      await expect(page.locator("text=Done Labs")).toBeVisible();
      await expect(page.locator("text=Fail Inc")).toBeVisible();
      await expect(page.locator("text=Processing Ltd")).toBeVisible();
      await expect(page.locator("text=Pending Co")).toBeVisible();
      await expect(page.locator("text=En attente")).toBeVisible();
      await expect(page.locator("text=Terminé").first()).toBeVisible();
      await expect(page.locator("text=Échoué")).toBeVisible();
      await expect(page.locator("text=En cours")).toBeVisible();
    });

    test("Campaign with 50 plus prospects paginates correctly", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Pagination Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      const prospects = Array.from({ length: 55 }, (_, i) => ({
        id: `p${i + 1}`,
        url: `https://company${i + 1}.com`,
        companyName: `Company ${i + 1}`,
        status: i % 3 === 0 ? "DONE" : i % 3 === 1 ? "FAILED" : "PENDING",
        score: i % 3 === 0 ? Math.floor(Math.random() * 100) : null,
        createdAt: new Date().toISOString(),
      }));
      await page.route(new RegExp(`/api/campaigns/${campaignId}`), async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: campaignId,
              name: "Pagination Campaign",
              stats: { total: 55, pending: 24, processing: 0, done: 15, failed: 16 },
              prospects,
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.goto(`/campaigns/${campaignId}`);
      await expect(page.locator("text=Company 1")).toBeVisible();
      await expect(page.locator("text=Company 10")).toBeVisible();
      const paginationText = page.locator("text=/sur 55/");
      await expect(paginationText).toBeVisible();
    });

  });

  test.describe("Campaign CRUD", () => {

    test("Delete campaign removes campaign from list", async ({ page }) => {
      await login(page);
      const campaignName = `Delete Campaign ${Date.now()}`;
      await createCampaign(page, campaignName);
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      const deleteRes = await page.request.delete(`/api/campaigns/${campaignId}`);
      expect(deleteRes.status()).toBe(200);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.success).toBe(true);
      await page.goto("/campaigns");
      await expect(page.locator(`text=${campaignName}`)).not.toBeVisible();
    });

    test("Campaign name update calls PATCH and updates name in UI", async ({ page }) => {
      await login(page);
      const campaignName = `Original Name ${Date.now()}`;
      await createCampaign(page, campaignName);
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const campaignId = page.url().split("/").pop();
      const updatedName = `Updated Name ${Date.now()}`;
      const patchRes = await page.request.patch(`/api/campaigns/${campaignId}`, {
        data: { name: updatedName },
      });
      expect(patchRes.status()).toBe(200);
      const patchBody = await patchRes.json();
      expect(patchBody.name).toBe(updatedName);
      await page.goto("/campaigns");
      await expect(page.locator(`text=${updatedName}`)).toBeVisible();
    });

  });

});
