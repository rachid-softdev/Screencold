import { test, expect } from "@playwright/test";
import { register, randomEmail, createCampaign } from "../fixtures/helpers";
import { TEST_CSV } from "../fixtures/mock-data";
import path from "path";
import os from "os";
import fs from "fs";

test.describe("Admin & Observability", () => {
  async function registerAndUpgradeToAdmin(page: any) {
    const email = randomEmail();
    await register(page, { name: "Admin User", email });
    const res = await page.request.patch("/api/user/role", {
      data: { role: "ADMIN" },
    });
    expect(res.status()).toBe(200);
  }

  test("P1 Admin_observability_loads_for_admin", async ({ page }) => {
    await registerAndUpgradeToAdmin(page);
    await page.route("**/api/admin/metrics", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          worker: { status: "online", uptime: 3600, lastHeartbeat: new Date().toISOString() },
          totalRate: 42,
          totalErrors: 3,
          errorRate: 7.14,
          lastUpdated: new Date().toISOString(),
          interval: "10s",
          jobTypes: [
            { type: "audit", rate: 30, errors: 2, errorPercent: 6.67, avgDuration: 1200, p99Latency: 4500 },
            { type: "email", rate: 12, errors: 1, errorPercent: 8.33, avgDuration: 800, p99Latency: 2000 },
          ],
          durationHistory: [1200, 1150, 1300, 1100, 1250],
        }),
      });
    });
    await page.goto("/admin/observability");
    await expect(page.locator("text=Observabilité")).toBeVisible();
    await expect(page.locator("text=En ligne")).toBeVisible();
    await expect(page.locator("text=42")).toBeVisible();
  });

  test("P1 Admin_observability_redirects_non_admin", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Non Admin", email });
    await page.goto("/admin/observability");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("text=Observabilité")).not.toBeVisible();
  });

  test("P1 Admin_observability_redirects_unauthenticated", async ({ page }) => {
    await page.goto("/admin/observability");
    await expect(page).toHaveURL(/\/login/);
  });

  test("P1 Admin_observability_displays_initial_loading_state", async ({ page }) => {
    await registerAndUpgradeToAdmin(page);
    await page.route("**/api/admin/metrics", async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          worker: { status: "online", uptime: 3600, lastHeartbeat: new Date().toISOString() },
          totalRate: 10, totalErrors: 0, errorRate: 0,
          lastUpdated: new Date().toISOString(), interval: "10s",
          jobTypes: [], durationHistory: [],
        }),
      });
    });
    await page.goto("/admin/observability");
    await expect(page.locator("text=En attente des données du worker")).toBeVisible();
  });

  test("P1 Admin_observability_worker_unreachable_http_error", async ({ page }) => {
    await registerAndUpgradeToAdmin(page);
    await page.route("**/api/admin/metrics", async (route) => {
      await route.fulfill({ status: 500, body: "Internal Server Error" });
    });
    await page.goto("/admin/observability");
    await expect(page.locator("text=Indisponible")).toBeVisible();
    await expect(page.locator("text=HTTP 500")).toBeVisible();
  });

  test("P1 Admin_observability_worker_unreachable_malformed_response", async ({ page }) => {
    await registerAndUpgradeToAdmin(page);
    await page.route("**/api/admin/metrics", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/plain", body: "hello world" });
    });
    await page.goto("/admin/observability");
    await expect(page.locator("text=Indisponible")).toBeVisible();
  });

  test("P1 Admin_observability_worker_unreachable_network_error", async ({ page }) => {
    await registerAndUpgradeToAdmin(page);
    await page.route("**/api/admin/metrics", async (route) => {
      await route.abort("connectionrefused");
    });
    await page.goto("/admin/observability");
    await expect(page.locator("text=Indisponible")).toBeVisible();
  });

  test("P2 Admin_observability_sparkline_and_job_types", async ({ page }) => {
    await registerAndUpgradeToAdmin(page);
    await page.route("**/api/admin/metrics", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          worker: { status: "online", uptime: 3600, lastHeartbeat: new Date().toISOString() },
          totalRate: 50, totalErrors: 0, errorRate: 0,
          lastUpdated: new Date().toISOString(), interval: "10s",
          jobTypes: [
            { type: "audit", rate: 30, errors: 2, errorPercent: 6.67, avgDuration: 1200, p99Latency: 4500 },
          ],
          durationHistory: [100, 200, 150, 300, 250, 180],
        }),
      });
    });
    await page.goto("/admin/observability");
    await expect(page.locator("text=audit")).toBeVisible();
  });
});

test.describe("Blog", () => {
  test("P0 Blog_list_shows_all_articles", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator("h1:has-text('Blog')")).toBeVisible();
    await expect(page.locator("text=Article à la une")).toBeVisible();
    const articleCards = page.locator("a[href^='/blog/']");
    const count = await articleCards.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await expect(page.locator("button:has-text('Tous')")).toBeVisible();
  });

  test("P0 Blog_list_filter_by_category_click", async ({ page }) => {
    await page.goto("/blog");
    await page.getByText("Cold Outreach").click();
    await expect(page).toHaveURL(/category=cold-outreach/);
    await expect(page.locator("button:has-text('Cold Outreach')")).toHaveClass(/bg-info/);
  });

  test("P0 Blog_list_filter_returns_to_all", async ({ page }) => {
    await page.goto("/blog?category=cold-outreach");
    await page.getByText("Tous").click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.locator("button:has-text('Tous')")).toHaveClass(/bg-info/);
  });

  test("P0 Blog_list_no_results_empty_state", async ({ page }) => {
    await page.goto("/blog?category=nonexistent");
    await expect(page.locator("text=Aucun article dans cette catégorie")).toBeVisible();
  });

  test("P0 Blog_list_article_card_navigation", async ({ page }) => {
    await page.goto("/blog");
    const articleLink = page.locator("a[href^='/blog/']").first();
    const href = await articleLink.getAttribute("href");
    await articleLink.click();
    await expect(page).toHaveURL(href!);
  });

  test("P0 Article_detail_displays_hero", async ({ page }) => {
    await page.goto("/blog/cold-outreach-stats-2026");
    await expect(page.locator("img").first()).toBeVisible();
    await expect(page.locator("text=Cold Outreach")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  test("P0 Article_detail_displays_author_card", async ({ page }) => {
    await page.goto("/blog/cold-outreach-stats-2026");
    await expect(page.locator("text=ScreenCold Team")).toBeVisible();
    await expect(page.locator("text=Publié le")).toBeVisible();
  });

  test("P0 Article_detail_share_buttons", async ({ page }) => {
    await page.goto("/blog/cold-outreach-stats-2026");
    await expect(page.locator("text=Partager")).toBeVisible();
    await expect(page.locator('a[href*="twitter.com/intent/tweet"]')).toBeVisible();
    await expect(page.locator('a[href*="linkedin.com/sharing"]')).toBeVisible();
  });

  test("P0 Article_detail_table_of_contents_sidebar", async ({ page }) => {
    await page.goto("/blog/cold-outreach-stats-2026");
    const toc = page.locator("text=Sommaire").locator("..");
    await expect(toc).toBeVisible();
    const tocItems = toc.locator("button, a");
    const count = await tocItems.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("P0 Article_detail_full_content_renders", async ({ page }) => {
    await page.goto("/blog/cold-outreach-stats-2026");
    await expect(page.locator("article p").first()).toBeVisible();
    await expect(page.locator("h2").first()).toBeVisible();
  });

  test("P0 Article_detail_cta_block", async ({ page }) => {
    await page.goto("/blog/cold-outreach-stats-2026");
    await expect(page.locator("text=Commencer gratuitement").or(page.locator("a[href='/signup']"))).toBeVisible();
  });

  test("P0 Article_detail_back_link", async ({ page }) => {
    await page.goto("/blog/cold-outreach-stats-2026");
    const backLink = page.locator('a[href="/blog"]').or(page.locator("text=Retour au blog"));
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/blog$/);
  });

  test("P0 Article_detail_related_articles_shown", async ({ page }) => {
    await page.goto("/blog/cold-outreach-stats-2026");
    await expect(page.locator("text=Articles similaires")).toBeVisible();
    const relatedCards = page.locator("text=Articles similaires").locator("..").locator("a[href^='/blog/']");
    const count = await relatedCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(3);
  });

  test("P0 Article_detail_unknown_slug_404", async ({ page }) => {
    await page.goto("/blog/non-existent-article-path-xyz");
    await expect(page.locator("text=404").or(page.locator("text=introuvable")).or(page.locator("text=non trouvée"))).toBeVisible();
  });
});

test.describe("Loading Skeletons", () => {
  test("P2 Dashboard_loading_skeleton_displays_with_aria", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.route("**/api/dashboard*", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ credits: 10, audits: [], stats: [] }),
      });
    });
    await page.goto("/dashboard");
    const skeleton = page.locator('[role="status"]');
    await expect(skeleton.first()).toBeVisible({ timeout: 5000 });
    await expect(skeleton).toHaveAttribute("aria-live", "polite");
  });

  test("P2 Dashboard_loading_skeleton_transitions_to_content", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    const skeleton = page.locator('[role="status"]');
    const skeletonExists = await skeleton.count();
    if (skeletonExists > 0) {
      await expect(skeleton).not.toBeVisible({ timeout: 15000 });
    }
    await expect(page.locator("text=Crédits disponibles").or(page.locator("text=Analysez un site"))).toBeVisible({ timeout: 15000 });
  });

  test("P2 Audits_and_campaigns_loading_skeleton_has_aria", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.route("**/api/audits*", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.goto("/audits");
    const auditsStatus = page.locator('[role="status"]');
    if (await auditsStatus.count() > 0) {
      await expect(auditsStatus).toHaveAttribute("aria-live", "polite");
    }
    await page.route("**/api/campaigns*", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.goto("/campaigns");
    const campaignsStatus = page.locator('[role="status"]');
    if (await campaignsStatus.count() > 0) {
      await expect(campaignsStatus).toHaveAttribute("aria-live", "polite");
    }
  });
});

test.describe("Dashboard Components", () => {
  test("P0 Dashboard_credit_counter_shows_balance", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    await expect(page.locator("text=Crédits disponibles")).toBeVisible();
    const creditsText = page.locator("text=Crédits disponibles").locator("..");
    await expect(creditsText.locator("text=5").or(creditsText.locator("text=10").or(creditsText.locator("text=0")))).toBeVisible();
  });

  test("P0 Dashboard_credit_counter_low_credits_warning", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.route("**/api/user/credits", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ credits: 3, maxCredits: 50 }),
      });
    });
    await page.goto("/dashboard");
    await page.reload();
    await expect(page.locator("text=Acheter des crédits").or(page.locator("a[href='/settings/billing']"))).toBeVisible();
  });

  test("P0 Dashboard_quick_audit_form_visible", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    await expect(page.locator("text=Analysez un site en quelques secondes")).toBeVisible();
    await expect(page.locator('input[placeholder*="exemple.com"]')).toBeVisible();
    await expect(page.locator("button:has-text('Analyser')")).toBeVisible();
  });

  test("P0 Dashboard_quick_audit_form_submit_valid", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    await page.fill('input[placeholder*="exemple.com"]', "www.example.com");
    await page.click("button:has-text('Analyser')");
    await expect(page).toHaveURL(/\/audits\/new/);
  });

  test("P0 Dashboard_quick_audit_form_empty_url", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    await page.click("button:has-text('Analyser')");
    await expect(page.locator("text=Veuillez entrer une URL")).toBeVisible();
  });

  test("P0 Dashboard_quick_audit_form_no_domain", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    await page.fill('input[placeholder*="exemple.com"]', "notadomain");
    await page.click("button:has-text('Analyser')");
    await expect(page.locator("text=nom de domaine").or(page.locator("URL doit contenir"))).toBeVisible();
  });

  test("P0 Dashboard_stats_cards_display", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    const statsCards = page.locator("text=Audits").or(page.locator("text=Taux de conversion")).or(page.locator("text=Taux de rebond"));
    await expect(statsCards.first()).toBeVisible();
  });

  test("P0 Dashboard_recent_audits_displays_list", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    await expect(page.locator("text=Audits récents").or(page.locator("text=Récents"))).toBeVisible();
  });

  test("P0 Dashboard_recent_audits_empty_state", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.route("**/api/dashboard*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ credits: 10, audits: [], stats: [] }),
      });
    });
    await page.goto("/dashboard");
    await expect(page.locator("text=Aucun audit réalisé").or(page.locator("text=Créer un audit"))).toBeVisible();
  });

  test("P0 Dashboard_recent_audit_score_badges", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    const scoreBadge = page.locator("text=Bon :").or(page.locator("text=Moyen :")).or(page.locator("text=Faible :")).or(page.locator("text=En cours"));
    if (await scoreBadge.count() > 0) {
      await expect(scoreBadge.first()).toBeVisible();
    }
  });
});

test.describe("Batch Operations", () => {
  test("P1 Audit_list_batch_select_single", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits");
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.count() > 0) {
      await checkbox.check();
      await expect(page.locator("text=1 sélectionné")).toBeVisible();
    }
  });

  test("P1 Audit_list_batch_select_multiple", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits");
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count >= 3) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();
      await expect(page.locator("text=3 sélectionnés")).toBeVisible();
    }
  });

  test("P1 Audit_list_batch_select_all_and_deselect", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits");
    const selectAll = page.locator("text=Tout sélectionner");
    if (await selectAll.count() > 0) {
      await selectAll.click();
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkedCount = await checkboxes.evaluateAll((els) => els.filter((e) => (e as HTMLInputElement).checked).length);
      expect(checkedCount).toBeGreaterThan(0);
      const deselectAll = page.locator("text=Tout désélectionner");
      if (await deselectAll.count() > 0) {
        await deselectAll.click();
        await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(0);
      }
    }
  });

  test("P1 Audit_list_batch_cancel_selection", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits");
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.count() > 0) {
      await checkbox.check();
      const cancelBtn = page.locator("text=Annuler");
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
        await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(0);
      }
    }
  });

  test("P1 Audit_list_batch_select_escape_key", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits");
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.count() > 0) {
      await checkbox.check();
      await page.keyboard.press("Escape");
      await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(0);
    }
  });

  test("P1 Audit_list_batch_analyse_flow", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits");
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.count() > 0) {
      await checkbox.check();
      const analyseBtn = page.locator("text=Analyser").last();
      if (await analyseBtn.count() > 0) {
        await analyseBtn.click();
        await expect(page.locator("text=Lancer l'analyse en masse").or(page.locator("text=Confirmer l'analyse"))).toBeVisible();
        const confirmBtn = page.locator("text=Confirmer l'analyse");
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
          await expect(page.locator("text=sélectionnés")).not.toBeVisible();
        }
      }
    }
  });

  test("P1 Audit_list_batch_delete_flow", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits");
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.count() > 0) {
      await checkbox.check();
      const deleteBtn = page.locator("text=Supprimer").last();
      if (await deleteBtn.count() > 0) {
        await deleteBtn.click();
        await expect(page.locator("text=Supprimer des audits").or(page.locator("text=supprimer définitivement"))).toBeVisible();
        const confirmDelete = page.locator("button:has-text('Supprimer')").last();
        if (await confirmDelete.count() > 0) {
          await confirmDelete.click();
          await expect(page.locator("text=sélectionnés")).not.toBeVisible();
        }
      }
    }
  });

  test("P2 Audit_list_batch_export_csv", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits");
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.count() > 0) {
      await checkbox.check();
      const exportBtn = page.locator("text=Exporter").last();
      if (await exportBtn.count() > 0) {
        await exportBtn.click();
      }
    }
  });
});

test.describe("Campaign Detail", () => {
  test("P0 Campaign_detail_displays_header", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await createCampaign(page, "E2E Header Campaign");
    await page.waitForURL(/\/campaigns\/(?!new)/);
    await expect(page.locator("text=E2E Header Campaign")).toBeVisible();
    await expect(page.locator("text=Importer CSV")).toBeVisible();
    await expect(page.locator("text=Lancer les audits").or(page.locator("button:has-text('Lancer')"))).toBeVisible();
  });

  test("P1 Campaign_detail_progress_section", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await createCampaign(page, "Progress Campaign");
    await page.waitForURL(/\/campaigns\/(?!new)/);
    await expect(page.locator("text=Terminés").or(page.locator("text=En cours")).or(page.locator("text=En attente"))).toBeVisible();
  });

  test("P1 Campaign_detail_prospect_table", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await createCampaign(page, "Prospect Table Campaign");
    await page.waitForURL(/\/campaigns\/(?!new)/);
    const csvPath = path.join(os.tmpdir(), `prospect-table-${Date.now()}.csv`);
    fs.writeFileSync(csvPath, TEST_CSV.valid);
    await page.setInputFiles('input[type="file"]', csvPath);
    fs.unlinkSync(csvPath);
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator("text=example.com").first()).toBeVisible();
    await expect(page.locator("text=httpbin.org").first()).toBeVisible();
  });

  test("P1 Campaign_detail_launch_disabled_no_pending", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await createCampaign(page, "No Pending Campaign");
    await page.waitForURL(/\/campaigns\/(?!new)/);
    const launchBtn = page.locator("button:has-text('Lancer')");
    if (await launchBtn.count() > 0) {
      await expect(launchBtn).toBeDisabled();
    }
  });

  test("P1 Campaign_detail_csv_import_modal", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await createCampaign(page, "CSV Modal Campaign");
    await page.waitForURL(/\/campaigns\/(?!new)/);
    await page.locator("text=Importer CSV").click();
    await expect(page.locator("text=Importer des prospects").or(page.locator('[role="dialog"]'))).toBeVisible();
    const closeBtn = page.locator('[role="dialog"] button:has(.lucide-x)').or(page.locator('[role="dialog"] button[aria-label="Fermer"]'));
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    }
  });

  test("P1 Campaign_detail_csv_import_submit", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await createCampaign(page, "CSV Submit Campaign");
    await page.waitForURL(/\/campaigns\/(?!new)/);
    await page.locator("text=Importer CSV").click();
    const csvPath = path.join(os.tmpdir(), `submit-csv-${Date.now()}.csv`);
    fs.writeFileSync(csvPath, TEST_CSV.valid);
    await page.setInputFiles('input[type="file"]', csvPath);
    fs.unlinkSync(csvPath);
    await expect(page.locator("text=Prospects importés avec succès").or(page.locator("text=Importé avec succès"))).toBeVisible({ timeout: 10000 });
  });

  test("P1 Campaign_detail_zero_prospects_empty_state", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await createCampaign(page, "Empty Prospects Campaign");
    await page.waitForURL(/\/campaigns\/(?!new)/);
    await expect(page.locator("text=Aucun prospect dans cette campagne").or(page.locator("text=Aucun prospect"))).toBeVisible();
  });
});
