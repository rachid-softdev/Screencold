import { test, expect } from "@playwright/test";
import { login, register, createCampaign, waitForToast } from "../fixtures/helpers";
import { TEST_CAMPAIGN, TEST_CSV } from "../fixtures/mock-data";
import path from "path";
import os from "os";
import fs from "fs";

test.describe("Campaigns & Prospects", () => {
  test.describe("Create Campaign", () => {
    test("Create campaign with valid name → asserts appears in campaign list", async ({ page }) => {
      await login(page);
      await createCampaign(page, TEST_CAMPAIGN.name);
      await expect(page.locator(`text=${TEST_CAMPAIGN.name}`)).toBeVisible();
      await page.goto("/campaigns");
      await expect(page.locator(`text=${TEST_CAMPAIGN.name}`)).toBeVisible();
    });

    test("Create campaign with empty name → asserts validation error", async ({ page }) => {
      await login(page);
      await page.goto("/campaigns");
      await page.click("text=Nouvelle campagne");
      await page.click('button[type="submit"]');
      const error = page.locator("[role='alert']").or(page.locator(".error")).or(page.locator("text=requis"));
      await expect(error).toBeVisible();
    });

    test("Create campaign unauthenticated → asserts redirect to /login", async ({ page }) => {
      await page.goto("/campaigns");
      await page.waitForURL(/\/login/);
      await expect(page.locator('input[name="email"]')).toBeVisible();
    });
  });

  test.describe("Campaign List", () => {
    test("Campaign list shows all campaigns → asserts campaign cards visible", async ({ page }) => {
      await login(page);
      const names = ["Alpha Campaign", "Beta Campaign", "Gamma Campaign"];
      for (const name of names) {
        await createCampaign(page, name);
      }
      await page.goto("/campaigns");
      for (const name of names) {
        await expect(page.locator(`text=${name}`).first()).toBeVisible();
      }
    });

    test("Campaign list empty state → asserts Aucune campagne message", async ({ page }) => {
      await register(page);
      await page.goto("/campaigns");
      await expect(page.locator("text=Aucune campagne")).toBeVisible();
    });
  });

  test.describe("Campaign Detail", () => {
    test("Campaign detail shows prospects and stats → asserts header, progress, table", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Detail Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      await expect(page.locator("text=Detail Campaign")).toBeVisible();
      const csvPath = path.join(os.tmpdir(), "detail-prospects.csv");
      fs.writeFileSync(csvPath, TEST_CSV.valid);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await expect(page.locator("table")).toBeVisible();
      await expect(page.locator("text=example.com").first()).toBeVisible();
      await expect(page.locator("text=httpbin.org").first()).toBeVisible();
    });

    test("Campaign detail with non-existent ID → asserts 404", async ({ page }) => {
      await login(page);
      await page.goto("/campaigns/non-existent-id-12345");
      await expect(page.locator("text=404").or(page.locator("text=non trouvé")).or(page.locator("text=introuvable"))).toBeVisible();
    });
  });

  test.describe("CSV Import", () => {
    test("Import valid CSV → asserts prospects created in table", async ({ page }) => {
      await login(page);
      await createCampaign(page, "CSV Import Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const csvPath = path.join(os.tmpdir(), "valid-import.csv");
      fs.writeFileSync(csvPath, TEST_CSV.valid);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await expect(page.locator("table")).toBeVisible();
      await expect(page.locator("text=Example Inc")).toBeVisible();
      await expect(page.locator("text=HTTPBin")).toBeVisible();
    });

    test("Import invalid file type → asserts error Veuillez sélectionner un fichier CSV", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Invalid File Type");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const txtPath = path.join(os.tmpdir(), "test.txt");
      fs.writeFileSync(txtPath, "not a csv content");
      await page.setInputFiles('input[type="file"]', txtPath);
      fs.unlinkSync(txtPath);
      await expect(page.locator("text=Veuillez sélectionner un fichier CSV")).toBeVisible();
    });

    test("Import empty CSV → asserts error fichier CSV vide", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Empty CSV");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const emptyPath = path.join(os.tmpdir(), "empty.csv");
      fs.writeFileSync(emptyPath, TEST_CSV.empty);
      await page.setInputFiles('input[type="file"]', emptyPath);
      fs.unlinkSync(emptyPath);
      await expect(page.locator("text=fichier CSV vide")).toBeVisible();
    });
  });

  test.describe("Launch Campaign", () => {
    test("Launch campaign with pending prospects → asserts success toast", async ({ page }) => {
      await login(page);
      await createCampaign(page, "Launch Campaign");
      await page.waitForURL(/\/campaigns\/(?!new)/);
      const csvPath = path.join(os.tmpdir(), "launch-prospects.csv");
      fs.writeFileSync(csvPath, TEST_CSV.valid);
      await page.setInputFiles('input[type="file"]', csvPath);
      fs.unlinkSync(csvPath);
      await expect(page.locator("text=example.com").first()).toBeVisible();
      await page.click('button:has-text("Lancer")');
      await waitForToast(page);
    });
  });
});
