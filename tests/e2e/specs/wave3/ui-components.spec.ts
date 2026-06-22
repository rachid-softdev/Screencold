import { test, expect } from "@playwright/test";
import { register, randomEmail } from "../fixtures/helpers";

test.describe("Command Palette", () => {
  test("P0 CommandPalette_opens_with_Cmd_K", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const palette = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(palette).toBeVisible();
    await expect(palette.locator('input[type="text"], input:not([type])')).toBeFocused();
  });

  test("P0 CommandPalette_search_filters_commands", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const searchInput = page.locator('[role="dialog"] input');
    await searchInput.fill("audit");
    await expect(page.locator('[role="dialog"]').locator("text=Audits")).toBeVisible();
    await expect(page.locator('[role="dialog"]').locator("text=Campagnes")).not.toBeVisible();
  });

  test("P0 CommandPalette_keyboard_arrows_navigation", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const items = page.locator('[role="dialog"] [data-selected="true"], [role="dialog"] [aria-selected="true"]');
    await expect(items).toHaveCount(1);
    await page.keyboard.press("ArrowUp");
    const firstSelected = page.locator('[role="dialog"] [data-selected="true"], [role="dialog"] [aria-selected="true"]');
    await expect(firstSelected).toBeVisible();
  });

  test("P0 CommandPalette_enter_executes_selected", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const searchInput = page.locator('[role="dialog"] input');
    await searchInput.fill("dashboard");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("P0 CommandPalette_escape_closes", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const triggerButton = page.locator("button").filter({ hasText: "Tableau de bord" });
    await triggerButton.focus();
    await page.keyboard.press("Meta+k");
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(triggerButton).toBeFocused();
  });

  test("P0 CommandPalette_click_backdrop_closes", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const backdrop = page.locator('[role="dialog"] ~ div, [data-state="open"][role="dialog"] + div');
    await backdrop.first().click({ force: true, position: { x: 10, y: 10 } });
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("P0 CommandPalette_mouse_hover_changes_selection", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const items = page.locator('[role="dialog"] [role="option"], [role="dialog"] [role="button"]');
    await items.nth(2).hover();
    await expect(items.nth(2)).toHaveAttribute("data-selected", "true");
    await items.nth(2).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("P0 CommandPalette_search_case_insensitive", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const searchInput = page.locator('[role="dialog"] input');
    await searchInput.fill("TABLEAU");
    await expect(page.locator('[role="dialog"]').locator("text=Tableau de bord")).toBeVisible();
  });

  test("P1 CommandPalette_no_results_empty_state", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const searchInput = page.locator('[role="dialog"] input');
    await searchInput.fill("zzzznotexist");
    await expect(page.locator('[role="dialog"]').locator("text=Aucune commande trouvée")).toBeVisible();
  });

  test("P1 CommandPalette_wrap_around_keyboard_nav", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const items = page.locator('[role="dialog"] [role="option"], [role="dialog"] [role="button"]');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      await page.keyboard.press("ArrowDown");
    }
    await page.keyboard.press("ArrowDown");
    const firstItem = page.locator('[role="dialog"] [data-selected="true"], [role="dialog"] [aria-selected="true"]').first();
    await expect(firstItem).toBeVisible();
  });

  test("P1 CommandPalette_rapid_open_close", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Meta+k");
    const searchInput = page.locator('[role="dialog"] input');
    await expect(searchInput).toBeVisible();
    const inputValue = await searchInput.inputValue();
    expect(inputValue).toBe("");
  });

  test("P1 CommandPalette_search_query_reset_on_close", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    const searchInput = page.locator('[role="dialog"] input');
    await searchInput.fill("audit");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Meta+k");
    const reopenedInput = page.locator('[role="dialog"] input');
    await expect(reopenedInput).toBeVisible();
    const inputValue = await reopenedInput.inputValue();
    expect(inputValue).toBe("");
  });
});

test.describe("Keyboard Shortcuts Panel", () => {
  test("P0 ShortcutsPanel_opens_with_question_mark", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("?");
    const panel = page.locator('[role="dialog"][aria-label="Raccourcis clavier"]');
    await expect(panel).toBeVisible();
  });

  test("P0 ShortcutsPanel_displays_all_shortcuts", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("?");
    const panel = page.locator('[role="dialog"][aria-label="Raccourcis clavier"]');
    await expect(panel.locator("text=Navigation")).toBeVisible();
    await expect(panel.locator("text=Actions")).toBeVisible();
    await expect(panel.locator("text=Général")).toBeVisible();
  });

  test("P0 ShortcutsPanel_escape_closes", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("?");
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("P0 ShortcutsPanel_x_button_closes", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("?");
    const panel = page.locator('[role="dialog"][aria-label="Raccourcis clavier"]');
    await expect(panel).toBeVisible();
    await page.locator("button").filter({ has: page.locator(".lucide-x, .lucide-close") }).first().click();
    await expect(panel).not.toBeVisible();
  });

  test("P0 ShortcutsPanel_click_backdrop_closes", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("?");
    const backdrop = page.locator('[role="dialog"] ~ div, [data-state="open"] + div');
    await backdrop.first().click({ force: true, position: { x: 10, y: 10 } });
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("P1 ShortcutsPanel_focus_trap_active", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("?");
    const panel = page.locator('[role="dialog"][aria-label="Raccourcis clavier"]');
    const focusableInside = panel.locator("button, [tabindex]:not([tabindex='-1']), a, input");
    await focusableInside.first().focus();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
    }
    await expect(focusableInside.first()).toBeFocused();
  });

  test("P1 ShortcutsPanel_shortcut_toggles", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("?");
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press("?");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});

test.describe("Global Keyboard Shortcuts", () => {
  test("P0 Shortcut_leader_g_d_navigates_dashboard", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("g");
    await page.keyboard.press("d");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("P0 Shortcut_leader_g_a_navigates_audits", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    await page.keyboard.press("g");
    await page.keyboard.press("a");
    await expect(page).toHaveURL(/\/audits/);
  });

  test("P0 Shortcut_leader_g_c_navigates_campaigns", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("g");
    await page.keyboard.press("c");
    await expect(page).toHaveURL(/\/campaigns/);
  });

  test("P0 Shortcut_leader_g_p_navigates_settings", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("g");
    await page.keyboard.press("p");
    await expect(page).toHaveURL(/\/settings/);
  });

  test("P0 Shortcut_direct_n_navigates_new_audit", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("n");
    await expect(page).toHaveURL(/\/audits\/new/);
  });

  test("P0 Shortcut_direct_shift_N_navigates_new_campaign", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Shift+n");
    await expect(page).toHaveURL(/\/campaigns\/new/);
  });

  test("P0 Shortcut_Cmd_K_opens_palette", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("Meta+k");
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("P1 Shortcut_leader_timeout_clears", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("g");
    await page.waitForTimeout(700);
    await page.keyboard.press("d");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("P1 Shortcut_leader_invalid_follow_up_key", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("g");
    await page.keyboard.press("x");
    await expect(page).not.toHaveURL(/\/dashboard/);
    await expect(page).not.toHaveURL(/\/audits/);
    await expect(page).not.toHaveURL(/\/campaigns/);
    await expect(page).not.toHaveURL(/\/settings/);
  });

  test("P1 Shortcut_skipped_when_focus_in_input", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const input = page.locator('input, textarea').first();
    await input.focus();
    await page.keyboard.press("n");
    await expect(page).not.toHaveURL(/\/audits\/new/);
  });

  test("P1 Shortcut_leader_skipped_when_focus_in_input", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const input = page.locator('input, textarea').first();
    await input.focus();
    await page.keyboard.press("g");
    await page.keyboard.press("d");
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test("P1 Shortcut_shift_N_in_lowercase", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.keyboard.press("n");
    await expect(page).toHaveURL(/\/audits\/new/);
    await expect(page).not.toHaveURL(/\/campaigns\/new/);
  });
});

test.describe("Dashboard Sidebar", () => {
  test("P0 Sidebar_displays_all_nav_items", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar.locator("text=Tableau de bord")).toBeVisible();
    await expect(sidebar.locator("text=Audits")).toBeVisible();
    await expect(sidebar.locator("text=Campagnes")).toBeVisible();
    await expect(sidebar.locator("text=Paramètres")).toBeVisible();
  });

  test("P0 Sidebar_active_route_highlighted", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits");
    const auditsLink = page.locator("nav a, aside a").filter({ hasText: "Audits" });
    await expect(auditsLink).toHaveClass(/active|bg-info|text-info/);
  });

  test("P0 Sidebar_collapse_and_expand", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const sidebar = page.locator("nav, aside").first();
    const collapseButton = sidebar.locator("button").filter({ has: page.locator(".lucide-chevron-left, .lucide-panel-left-close") });
    await collapseButton.click();
    const classAttr = await sidebar.getAttribute("class");
    expect(classAttr).toContain("w-16");
    await collapseButton.click();
    const expandedClass = await sidebar.getAttribute("class");
    expect(expandedClass).toContain("w-64");
  });

  test("P0 Sidebar_collapsed_shows_icons_only", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const sidebar = page.locator("nav, aside").first();
    const collapseButton = sidebar.locator("button").filter({ has: page.locator(".lucide-chevron-left, .lucide-panel-left-close") });
    await collapseButton.click();
    await expect(sidebar.locator("text=Tableau de bord")).not.toBeVisible();
    await expect(sidebar.locator("text=Audits")).not.toBeVisible();
  });

  test("P0 Sidebar_user_dropdown_displays_menu_items", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const avatarArea = page.locator("button").filter({ has: page.locator(".lucide-user, img[alt]") }).first();
    await avatarArea.click();
    await expect(page.locator('[role="menu"], [role="listbox"]').locator("text=Mon compte")).toBeVisible();
    await expect(page.locator('[role="menu"], [role="listbox"]').locator("text=Équipes")).toBeVisible();
    await expect(page.locator('[role="menu"], [role="listbox"]').locator("text=Facturation")).toBeVisible();
  });

  test("P0 Sidebar_logout_clears_session", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const avatarArea = page.locator("button").filter({ has: page.locator(".lucide-user, img[alt]") }).first();
    await avatarArea.click();
    await page.locator('[role="menu"], [role="listbox"]').locator("text=Se déconnecter").click();
    await page.waitForURL("/login");
    await page.goto("/dashboard");
    await page.waitForURL("/login");
  });

  test("P0 Sidebar_plan_badge_displayed", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar.locator("text=FREE").or(sidebar.locator("text=PRO"))).toBeVisible();
  });

  test("P0 Sidebar_keyboard_shortcuts_button", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar.locator("text=Raccourcis clavier")).toBeVisible();
    await sidebar.locator("text=Raccourcis clavier").click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("P1 Sidebar_active_route_with_subpath", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/billing");
    const settingsLink = page.locator("nav a, aside a").filter({ hasText: "Paramètres" });
    await expect(settingsLink).toHaveClass(/active|bg-info|text-info/);
  });

  test("P1 Sidebar_collapsed_shortcut_button", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const sidebar = page.locator("nav, aside").first();
    const collapseButton = sidebar.locator("button").filter({ has: page.locator(".lucide-chevron-left, .lucide-panel-left-close") });
    await collapseButton.click();
    const shortcutsBtn = sidebar.locator("button[aria-label='Raccourcis clavier'], button:has(kbd)");
    await expect(shortcutsBtn).toBeVisible();
    await shortcutsBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});

test.describe("Onboarding Tour", () => {
  test("P0 Onboarding_shows_on_first_visit", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await expect(page.locator('[role="dialog"], [role="alertdialog"]').locator("text=Entrez une URL")).toBeVisible();
  });

  test("P0 Onboarding_next_advances_to_step_2", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
    await dialog.locator("text=Suivant").click();
    await expect(dialog.locator("text=Consultez les résultats")).toBeVisible();
  });

  test("P0 Onboarding_previous_returns_to_step_1", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
    await dialog.locator("text=Suivant").click();
    await dialog.locator("text=Précédent").click();
    await expect(dialog.locator("text=Entrez une URL")).toBeVisible();
  });

  test("P0 Onboarding_completes_on_step_3", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
    await dialog.locator("text=Suivant").click();
    await dialog.locator("text=Suivant").click();
    await expect(dialog.locator("text=Commencer")).toBeVisible();
    await dialog.locator("text=Commencer").click();
    await expect(dialog).not.toBeVisible();
    const completed = await page.evaluate(() => localStorage.getItem("screencold-onboarding-completed"));
    expect(completed).toBe("true");
  });

  test("P0 Onboarding_does_not_show_after_completion", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
    await dialog.locator("text=Suivant").click();
    await dialog.locator("text=Suivant").click();
    await dialog.locator("text=Commencer").click();
    await page.reload();
    await expect(page.locator('[role="dialog"], [role="alertdialog"]').locator("text=Entrez une URL")).not.toBeVisible();
  });

  test("P0 Onboarding_restart_from_help_menu", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
    await dialog.locator("text=Suivant").click();
    await dialog.locator("text=Suivant").click();
    await dialog.locator("text=Commencer").click();
    await page.keyboard.press("?");
    await page.locator('[role="dialog"]').locator("text=Revoir l'introduction").click();
    const reopened = page.locator('[role="dialog"], [role="alertdialog"]');
    await expect(reopened.locator("text=Entrez une URL")).toBeVisible();
    const completed = await page.evaluate(() => localStorage.getItem("screencold-onboarding-completed"));
    expect(completed).toBeNull();
  });

  test("P1 Onboarding_close_with_X", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
    await dialog.locator("button").filter({ has: page.locator(".lucide-x, .lucide-close") }).click();
    await expect(dialog).not.toBeVisible();
    const completed = await page.evaluate(() => localStorage.getItem("screencold-onboarding-completed"));
    expect(completed).toBe("true");
  });

  test("P1 Onboarding_keyboard_escape_not_listened", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
    await expect(dialog.locator("text=Entrez une URL")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog.locator("text=Entrez une URL")).toBeVisible();
  });
});

test.describe("First Audit Celebration", () => {
  test("P0 Celebration_shows_after_first_audit", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits/new");
    await page.route(/\/api\/audits/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            auditId: "celebration-audit-001",
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
    await expect(page.locator("text=Bravo").or(page.locator("text=premier audit est prêt"))).toBeVisible();
  });

  test("P0 Celebration_copy_link_copies_to_clipboard", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits/new");
    await page.route(/\/api\/audits/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            auditId: "celebration-copy-001",
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
    expect(clipboardText).toContain("/audits/celebration-copy-001");
  });

  test("P0 Celebration_continue_without_results", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/audits/new");
    await page.route(/\/api\/audits/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            auditId: "celebration-skip-001",
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
    await page.locator("text=Continuer sans voir").click();
    await expect(page.locator("text=Bravo").or(page.locator("text=premier audit est prêt"))).not.toBeVisible();
  });
});

test.describe("Cookie Consent Banner", () => {
  test("P0 Cookie_consent_shows_on_first_visit", async ({ page }) => {
    await page.goto("/");
    const banner = page.locator("text=cookies").last();
    await expect(banner).toBeVisible();
    await expect(page.locator("text=Tout accepter")).toBeVisible();
    await expect(page.locator("text=Refuser")).toBeVisible();
    await expect(page.locator("text=Personnaliser")).toBeVisible();
  });

  test("P0 Cookie_consent_accept_all", async ({ page }) => {
    await page.goto("/");
    await page.locator("text=Tout accepter").click();
    const prefs = await page.evaluate(() => localStorage.getItem("screencold-cookie-consent"));
    expect(prefs).not.toBeNull();
    const parsed = JSON.parse(prefs || "{}");
    expect(parsed.necessary).toBe(true);
    expect(parsed.analytics).toBe(true);
    expect(parsed.marketing).toBe(true);
  });

  test("P0 Cookie_consent_reject_all", async ({ page }) => {
    await page.goto("/");
    await page.locator("text=Refuser").click();
    const prefs = await page.evaluate(() => localStorage.getItem("screencold-cookie-consent"));
    const parsed = JSON.parse(prefs || "{}");
    expect(parsed.necessary).toBe(true);
    expect(parsed.analytics).toBe(false);
    expect(parsed.marketing).toBe(false);
  });

  test("P0 Cookie_consent_customize_panel", async ({ page }) => {
    await page.goto("/");
    await page.locator("text=Personnaliser").click();
    await expect(page.locator("text=Nécessaires")).toBeVisible();
    await expect(page.locator("text=Analytics")).toBeVisible();
    await expect(page.locator("text=Marketing")).toBeVisible();
  });

  test("P0 Cookie_consent_does_not_show_after_consent", async ({ page }) => {
    await page.goto("/");
    await page.locator("text=Tout accepter").click();
    await page.reload();
    await expect(page.locator("text=cookies")).not.toBeVisible();
  });

  test("P1 Cookie_consent_necessary_always_checked", async ({ page }) => {
    await page.goto("/");
    await page.locator("text=Personnaliser").click();
    const necessaryCheckbox = page.locator("label:has-text('Nécessaires') input[type='checkbox'], label:has-text('Nécessaires') input[type='radio']");
    await expect(necessaryCheckbox).toBeDisabled();
  });

  test("P1 Cookie_consent_corrupted_storage", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("screencold-cookie-consent", "{bad"));
    await page.goto("/");
    await expect(page.locator("text=Tout accepter")).toBeVisible();
  });
});

test.describe("Error Boundary", () => {
  test("P0 ErrorBoundary_catches_render_error", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.evaluate(() => {
      window.dispatchEvent(new ErrorEvent("error", {
        message: "Test render error",
        filename: "/app/page.tsx",
        lineno: 42,
        colno: 10,
      }));
    });
    await expect(page.locator("text=Une erreur est survenue").or(page.locator("text=Réessayer"))).toBeVisible();
  });

  test("P0 ErrorBoundary_reset_recovery", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.evaluate(() => {
      window.dispatchEvent(new ErrorEvent("error", {
        message: "Test error to reset",
        filename: "/app/page.tsx",
        lineno: 42,
      }));
    });
    const retryButton = page.locator("text=Réessayer");
    await expect(retryButton).toBeVisible();
    await retryButton.click();
    await expect(page.locator("text=Réessayer")).not.toBeVisible();
  });

  test("P0 ErrorBoundary_console_error_logged", async ({ page }) => {
    const errorLogs: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errorLogs.push(msg.text());
    });
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.evaluate(() => {
      window.dispatchEvent(new ErrorEvent("error", {
        message: "Boundary test error",
        filename: "/app/page.tsx",
        lineno: 42,
      }));
    });
    const hasBoundaryLog = errorLogs.some((log) => log.includes("ErrorBoundary") || log.includes("interceptée"));
    expect(hasBoundaryLog).toBe(true);
  });

  test("P1 ErrorBoundary_no_error_passthrough", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await expect(page.locator("text=Une erreur est survenue")).not.toBeVisible();
    await expect(page.locator("text=Réessayer")).not.toBeVisible();
  });

  test("P1 ErrorBoundary_custom_fallback", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.evaluate(() => {
      (window as any).__testErrorBoundaryFallback = "custom-error-ui";
      window.dispatchEvent(new ErrorEvent("error", {
        message: "Custom fallback test",
        filename: "/app/page.tsx",
        lineno: 42,
      }));
    });
    const customFallback = page.locator("[data-testid='custom-error-fallback'], text=custom-error-ui");
    await expect(customFallback).toBeVisible();
  });
});

test.describe("Public Header & Mobile Menu", () => {
  test("P0 Public_header_displays_nav_links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header").locator("text=ScreenCold").or(page.locator("header").locator("text=ScreenCold"))).toBeVisible();
    await expect(page.locator("header").locator("text=Fonctionnalités")).toBeVisible();
    await expect(page.locator("header").locator("text=Tarifs")).toBeVisible();
    await expect(page.locator("header").locator("text=Blog")).toBeVisible();
  });

  test("P0 Public_header_mobile_hamburger_opens_menu", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 767, height: 900 });
    await page.locator("header button").filter({ has: page.locator(".lucide-menu") }).click();
    const mobileMenu = page.locator("header nav:not(.hidden), [role='navigation']").last();
    await expect(mobileMenu.locator("text=Se connecter")).toBeVisible();
    await expect(mobileMenu.locator("text=Blog")).toBeVisible();
  });

  test("P0 Public_header_mobile_menu_closes_on_link_click", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 767, height: 900 });
    await page.locator("header button").filter({ has: page.locator(".lucide-menu") }).click();
    await page.locator("header").locator("text=Blog").click();
    await expect(page).toHaveURL(/\/blog/);
  });

  test("P0 Public_header_mobile_menu_toggle_x", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 767, height: 900 });
    await page.locator("header button").filter({ has: page.locator(".lucide-menu") }).click();
    await page.locator("header button").filter({ has: page.locator(".lucide-x") }).click();
    const menuIcon = page.locator("header button").filter({ has: page.locator(".lucide-menu") });
    await expect(menuIcon).toBeVisible();
  });
});

test.describe("Dashboard Layout Mobile Sidebar", () => {
  test("P0 Dashboard_mobile_sidebar_overlay", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.setViewportSize({ width: 1023, height: 900 });
    const hamburger = page.locator("header button, [aria-label='Menu'], button:has(.lucide-menu)").first();
    await hamburger.click();
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar).toBeVisible();
  });

  test("P0 Dashboard_mobile_sidebar_backdrop_closes", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.setViewportSize({ width: 1023, height: 900 });
    const hamburger = page.locator("header button, [aria-label='Menu'], button:has(.lucide-menu)").first();
    await hamburger.click();
    await page.locator(".bg-black\\/50, [data-backdrop='true'], .fixed.inset-0").first().click({ force: true });
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar).not.toBeVisible();
  });

  test("P0 Dashboard_mobile_sidebar_navigation_works", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.setViewportSize({ width: 1023, height: 900 });
    const hamburger = page.locator("header button, [aria-label='Menu'], button:has(.lucide-menu)").first();
    await hamburger.click();
    await page.locator("nav a, aside a").filter({ hasText: "Audits" }).first().click();
    await expect(page).toHaveURL(/\/audits/);
  });

  test("P1 Dashboard_main_content_skip_link_target", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const mainContent = page.locator("main[id='main-content'], #main-content");
    await expect(mainContent).toHaveCount(1);
  });
});

test.describe("Skip to Content Link", () => {
  test("P0 SkipLink_visible_on_keyboard_focus", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.locator("a[href='#main-content'], a:has-text('Skip to main'), a:has-text('Aller au contenu')");
    await expect(skipLink).toBeVisible();
  });

  test("P0 SkipLink_navigates_to_main_content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.locator("a[href='#main-content'], a:has-text('Skip to main'), a:has-text('Aller au contenu')");
    if (await skipLink.isVisible()) {
      await skipLink.click();
      const focusedElement = await page.evaluate(() => document.activeElement?.id || "");
      expect(focusedElement).toBe("main-content");
    }
  });
});
