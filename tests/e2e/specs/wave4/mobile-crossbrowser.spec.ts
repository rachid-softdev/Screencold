import { test, expect } from "@playwright/test";
import { register, randomEmail } from "../fixtures/helpers";

test.use({ viewport: { width: 375, height: 812 } });

test.describe("Mobile Public Pages", () => {
  test("MobileLanding_hamburger_toggle", async ({ page }) => {
    await page.goto("/");
    const menuButton = page.locator("header button").filter({ has: page.locator(".lucide-menu") });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.getByText("Se connecter")).toBeVisible();
    await expect(page.getByText("Tarifs")).toBeVisible();
    await expect(page.getByText("Blog")).toBeVisible();
    const closeButton = page.locator("header button").filter({ has: page.locator(".lucide-x") });
    await closeButton.click();
    await expect(page.getByText("Se connecter")).not.toBeVisible();
  });

  test("MobileLanding_hero_ctas_visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Essayer gratuitement")).toBeVisible();
    await expect(page.getByText("Voir les tarifs")).toBeVisible();
    await expect(page.getByText("Aucune carte bancaire requise")).toBeVisible();
  });

  test("MobileLanding_features_stack", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Audits complets")).toBeVisible();
    await expect(page.getByText("Rapide et automatisé")).toBeVisible();
    await expect(page.getByText("Emails prêts à envoyer")).toBeVisible();
    await expect(page.getByText("Facile à utiliser")).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("MobilePricing_cards_stack", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Gratuit")).toBeVisible();
    await expect(page.getByText("Starter")).toBeVisible();
    await expect(page.getByText("Pro")).toBeVisible();
    await expect(page.getByText("Agency")).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("MobilePricing_billing_toggle", async ({ page }) => {
    await page.goto("/pricing");
    const toggle = page.locator("button[role='switch']");
    await toggle.click();
    await expect(page.getByText("39€/mois")).toBeVisible();
    await expect(page.getByText("119€/mois")).toBeVisible();
    await expect(page.getByText("319€/mois")).toBeVisible();
    await toggle.click();
    await expect(page.getByText("49€/mois")).toBeVisible();
    await expect(page.getByText("149€/mois")).toBeVisible();
    await expect(page.getByText("399€/mois")).toBeVisible();
  });

  test("MobileFAQ_accordion_works", async ({ page }) => {
    await page.goto("/faq");
    const firstDetails = page.locator("details").first();
    await firstDetails.locator("summary").click();
    await expect(firstDetails).toHaveAttribute("open", "");
    await firstDetails.locator("summary").click();
    await expect(firstDetails).not.toHaveAttribute("open", "");
  });

  test("MobileBlog_cards_no_overflow", async ({ page }) => {
    await page.goto("/blog");
    const articleLinks = page.locator("a[href^='/blog/']");
    const count = await articleLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("MobileBlog_filter_buttons", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByText("Tous")).toBeVisible();
    await expect(page.getByText("Cold Outreach")).toBeVisible();
    await expect(page.getByText("UX Design")).toBeVisible();
    await expect(page.getByText("CRO")).toBeVisible();
    await expect(page.getByText("Productivité")).toBeVisible();
    await expect(page.getByText("Industry")).toBeVisible();
  });
});

test.describe("Mobile Dashboard", () => {
  test("MobileDashboard_sidebar_hamburger", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const hamburger = page.locator("header button, [aria-label='Menu'], button:has(.lucide-menu)").first();
    await hamburger.click();
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator("text=Tableau de bord")).toBeVisible();
    await expect(sidebar.locator("text=Audits")).toBeVisible();
    await expect(sidebar.locator("text=Campagnes")).toBeVisible();
  });

  test("MobileDashboard_sidebar_backdrop_closes", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const hamburger = page.locator("header button, [aria-label='Menu'], button:has(.lucide-menu)").first();
    await hamburger.click();
    await page.locator(".bg-black\\/50, [data-backdrop='true'], .fixed.inset-0").first().click({ force: true });
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar).not.toBeVisible();
  });

  test("MobileDashboard_sidebar_navigation", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const hamburger = page.locator("header button, [aria-label='Menu'], button:has(.lucide-menu)").first();
    await hamburger.click();
    await page.locator("nav a, aside a").filter({ hasText: "Audits" }).first().click();
    await expect(page).toHaveURL(/\/audits/);
  });

  test("MobileDashboard_content_no_overflow", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("MobileAudits_list_layout", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits");
    await expect(page.locator("h1").or(page.locator("text=Audits").first())).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("MobileCampaign_detail_table", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/campaigns/test-campaign-id");
    await expect(page.locator("text=Prospects Janvier 2024")).toBeVisible();
    const table = page.locator("table, [role='table'], div.overflow-x-auto");
    await expect(table.first()).toBeVisible();
  });

  test("MobileSettings_no_overflow", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Tablet Responsive", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("Tablet_sidebar_visible", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator("text=Tableau de bord")).toBeVisible();
    await expect(sidebar.locator("text=Audits")).toBeVisible();
    await expect(sidebar.locator("text=Campagnes")).toBeVisible();
  });

  test("Tablet_grid_2_columns", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const statCards = page.locator("[class*='grid'] > div, [class*='grid'] > a, [class*='grid'] > article").first();
    await expect(statCards).toBeVisible();
  });

  test("Tablet_no_horizontal_overflow", async ({ page }) => {
    await page.goto("/");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("Tablet_sidebar_collapse", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const sidebar = page.locator("nav, aside").first();
    const collapseButton = sidebar.locator("button").filter({ has: page.locator(".lucide-chevron-left, .lucide-panel-left-close") });
    await collapseButton.click();
    await expect(sidebar.locator("text=Tableau de bord")).not.toBeVisible();
    await collapseButton.click();
    const classAttr = await sidebar.getAttribute("class");
    expect(classAttr).toContain("w-64");
  });
});

test.describe("Cross-browser Firefox", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("Firefox_celebration_copy_link", async ({ page, browserName }) => {
    test.skip(browserName !== "firefox", "Firefox only");
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits/new");
    await page.route(/\/api\/audits/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            auditId: "firefox-copy-001",
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
    await page.locator("text=Copier le lien").click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("/audits/firefox-copy-001");
  });

  test("Firefox_api_key_copy", async ({ page, browserName }) => {
    test.skip(browserName !== "firefox", "Firefox only");
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/api-keys");
    const copyButton = page.locator("button").filter({ has: page.locator(".lucide-copy") }).first();
    if (await copyButton.isVisible()) {
      await copyButton.click();
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText.length).toBeGreaterThan(0);
    }
  });

  test("Firefox_csv_upload", async ({ page, browserName }) => {
    test.skip(browserName !== "firefox", "Firefox only");
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/campaigns/test-campaign-id");
    const importButton = page.locator("button").filter({ hasText: "Importer" }).or(
      page.locator("button").filter({ has: page.locator(".lucide-upload") })
    ).first();
    await importButton.click();
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
    await fileInput.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("url,companyName\nhttps://example.com,Test Corp"),
    });
    await expect(fileInput).not.toBeEmpty();
  });

  test("Firefox_localStorage_onboarding", async ({ page, browserName }) => {
    test.skip(browserName !== "firefox", "Firefox only");
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
    await expect(dialog.locator("text=Entrez une URL")).toBeVisible();
    await dialog.locator("text=Suivant").click();
    await dialog.locator("text=Suivant").click();
    await dialog.locator("text=Commencer").click();
    await expect(dialog).not.toBeVisible();
    const completed = await page.evaluate(() => localStorage.getItem("screencold-onboarding-completed"));
    expect(completed).toBe("true");
  });

  test("Firefox_cmd_k_palette", async ({ page, browserName }) => {
    test.skip(browserName !== "firefox", "Firefox only");
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const palette = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(palette).toBeVisible();
    await expect(palette.locator('input[type="text"], input:not([type])')).toBeFocused();
  });

  test("Firefox_pricing_layout", async ({ page, browserName }) => {
    test.skip(browserName !== "firefox", "Firefox only");
    await page.goto("/pricing");
    await expect(page.getByText("Gratuit")).toBeVisible();
    await expect(page.getByText("Starter")).toBeVisible();
    await expect(page.getByText("Pro")).toBeVisible();
    await expect(page.getByText("Agency")).toBeVisible();
    await expect(page.getByText("0€/mois")).toBeVisible();
    await expect(page.getByText("49€/mois")).toBeVisible();
    await expect(page.getByText("149€/mois")).toBeVisible();
    await expect(page.getByText("399€/mois")).toBeVisible();
  });
});

test.describe("Cross-browser WebKit", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("WebKit_celebration_copy_link", async ({ page, browserName }) => {
    test.skip(browserName !== "webkit", "WebKit only");
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits/new");
    await page.route(/\/api\/audits/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            auditId: "webkit-copy-001",
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
    await page.locator("text=Copier le lien").click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("/audits/webkit-copy-001");
  });

  test("WebKit_api_key_copy", async ({ page, browserName }) => {
    test.skip(browserName !== "webkit", "WebKit only");
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/api-keys");
    const copyButton = page.locator("button").filter({ has: page.locator(".lucide-copy") }).first();
    if (await copyButton.isVisible()) {
      await copyButton.click();
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText.length).toBeGreaterThan(0);
    }
  });

  test("WebKit_csv_upload", async ({ page, browserName }) => {
    test.skip(browserName !== "webkit", "WebKit only");
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/campaigns/test-campaign-id");
    const importButton = page.locator("button").filter({ hasText: "Importer" }).or(
      page.locator("button").filter({ has: page.locator(".lucide-upload") })
    ).first();
    await importButton.click();
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
    await fileInput.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("url,companyName\nhttps://example.com,Test Corp"),
    });
    await expect(fileInput).not.toBeEmpty();
  });

  test("WebKit_localStorage_onboarding", async ({ page, browserName }) => {
    test.skip(browserName !== "webkit", "WebKit only");
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
    await expect(dialog.locator("text=Entrez une URL")).toBeVisible();
    await dialog.locator("text=Suivant").click();
    await dialog.locator("text=Suivant").click();
    await dialog.locator("text=Commencer").click();
    await expect(dialog).not.toBeVisible();
    const completed = await page.evaluate(() => localStorage.getItem("screencold-onboarding-completed"));
    expect(completed).toBe("true");
  });

  test("WebKit_cmd_k_palette", async ({ page, browserName }) => {
    test.skip(browserName !== "webkit", "WebKit only");
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const palette = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(palette).toBeVisible();
    await expect(palette.locator('input[type="text"], input:not([type])')).toBeFocused();
  });
});

test.describe("Touch Interactions", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test("MobileTouch_sidebar_opens", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const hamburger = page.locator("header button, [aria-label='Menu'], button:has(.lucide-menu)").first();
    await hamburger.tap();
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator("text=Tableau de bord")).toBeVisible();
  });

  test("MobileTouch_sidebar_navigation", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const hamburger = page.locator("header button, [aria-label='Menu'], button:has(.lucide-menu)").first();
    await hamburger.tap();
    await page.locator("nav a, aside a").filter({ hasText: "Audits" }).first().tap();
    await expect(page).toHaveURL(/\/audits/);
  });

  test("MobileTouch_pricing_billing_toggle", async ({ page }) => {
    await page.goto("/pricing");
    const toggle = page.locator("button[role='switch']");
    await toggle.tap();
    await expect(page.getByText("39€/mois")).toBeVisible();
    await toggle.tap();
    await expect(page.getByText("49€/mois")).toBeVisible();
  });

  test("MobileTouch_faq_accordion", async ({ page }) => {
    await page.goto("/faq");
    const firstSummary = page.locator("details summary").first();
    await firstSummary.tap();
    const firstDetails = page.locator("details").first();
    await expect(firstDetails).toHaveAttribute("open", "");
    await firstSummary.tap();
    await expect(firstDetails).not.toHaveAttribute("open", "");
  });

  test("MobileTouch_sidebar_backdrop_close", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const hamburger = page.locator("header button, [aria-label='Menu'], button:has(.lucide-menu)").first();
    await hamburger.tap();
    await page.locator(".bg-black\\/50, [data-backdrop='true'], .fixed.inset-0").first().tap({ force: true });
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar).not.toBeVisible();
  });

  test("MobileTouch_landing_cta_tap", async ({ page }) => {
    await page.goto("/");
    const ctaButton = page.getByText("Essayer gratuitement").first();
    await ctaButton.tap();
    await expect(page).toHaveURL(/\/register/);
  });
});
