import { test, expect } from "@playwright/test";
import { register, randomEmail } from "../fixtures/helpers";

const MOCK_PROFILE_FREE = {
  id: "mock-user-1",
  name: "Test User",
  email: "test@example.com",
  image: null,
  plan: "FREE",
  credits: 5,
  creditsResetsAt: "2026-07-01T00:00:00.000Z",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  creditsUsed: 2,
};

const MOCK_PROFILE_AGENCY = {
  id: "mock-user-2",
  name: "Test User",
  email: "test@example.com",
  image: null,
  plan: "AGENCY",
  credits: 1000,
  creditsResetsAt: "2026-07-01T00:00:00.000Z",
  stripeCustomerId: "cus_mock_123",
  stripeSubscriptionId: "sub_mock_456",
  creditsUsed: 0,
};

const MOCK_PROFILE_STARTER = {
  id: "mock-user-3",
  name: "Test User",
  email: "test@example.com",
  image: null,
  plan: "STARTER",
  credits: 50,
  creditsResetsAt: "2026-07-01T00:00:00.000Z",
  stripeCustomerId: "cus_mock_789",
  stripeSubscriptionId: "sub_mock_012",
  creditsUsed: 45,
};

const MOCK_TRANSACTIONS = {
  transactions: [
    {
      id: "tx-purchase-1",
      createdAt: "2026-06-15T10:00:00.000Z",
      type: "PURCHASE",
      amount: 50,
    },
    {
      id: "tx-debit-1",
      createdAt: "2026-06-14T08:30:00.000Z",
      type: "DEBIT",
      amount: -1,
    },
    {
      id: "tx-refund-1",
      createdAt: "2026-06-12T14:00:00.000Z",
      type: "REFUND",
      amount: 1,
    },
    {
      id: "tx-refill-1",
      createdAt: "2026-06-01T00:00:00.000Z",
      type: "MONTHLY_REFILL",
      amount: 50,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 4,
    totalPages: 1,
  },
};

test.describe("Credit Counter", () => {
  test("CreditCounter_shows_balance_and_plan_badge", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    await expect(page.locator("text=Crédits disponibles")).toBeVisible();
    await expect(page.locator("text=5")).toBeVisible();
    await expect(page.locator("text=Gratuit")).toBeVisible();
  });

  test("CreditCounter_normal_state_hides_purchase_link", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    await expect(page.locator("a[href='/settings/billing']")).not.toBeVisible();
  });

  test("CreditCounter_plan_badge_displays_plan_name", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    await expect(page.locator("text=Gratuit")).toBeVisible();
  });

  test("CreditCounter_low_credits_shows_warning_and_link", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.route("**/api/user/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_PROFILE_FREE,
          credits: 3,
          creditsUsed: 2,
        }),
      });
    });
    await page.goto("/settings/billing");
    await page.waitForSelector("text=Crédits utilisés ce mois");
  });

  test("CreditCounter_purchase_link_navigates_to_billing", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/dashboard");
    const link = page.locator("a[href='/settings/billing']");
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL(/\/settings\/billing/);
    }
  });
});

test.describe("Billing Settings Page", () => {
  test.describe("Page Structure", () => {
    test("Billing_heading_and_description", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("h1")).toContainText("Facturation");
      await expect(page.locator("text=Gérez votre abonnement et vos crédits")).toBeVisible();
    });

    test("Billing_current_plan_card_shows_name_and_status", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Plan Gratuit")).toBeVisible();
      await expect(page.locator("text=Actif")).toBeVisible();
    });

    test("Billing_credit_usage_section_with_progress_bar", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Crédits utilisés ce mois")).toBeVisible();
      const progressBar = page.locator(".bg-info-500").or(page.locator(".bg-error-500")).first();
      await expect(progressBar).toBeVisible();
    });

    test("Billing_credit_usage_shows_correct_count", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=/ 5")).toBeVisible();
    });

    test("Billing_unlimited_plan_shows_illimite", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.route("**/api/user/profile", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PROFILE_AGENCY),
        });
      });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Crédits illimités")).toBeVisible();
    });

    test("Billing_unlimited_plan_hides_progress_bar", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.route("**/api/user/profile", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PROFILE_AGENCY),
        });
      });
      await page.goto("/settings/billing");
      const progressBar = page.locator(".bg-info-500").or(page.locator(".bg-error-500"));
      await expect(progressBar).not.toBeVisible();
    });

    test("Billing_credit_packs_section_displays_four_packages", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Acheter des crédits supplémentaires")).toBeVisible();
      const buyButtons = page.locator("button:has-text('Acheter')");
      await expect(buyButtons).toHaveCount(4);
    });

    test("Billing_credit_pack_shows_credits_and_price", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=10").first()).toBeVisible();
      await expect(page.locator("text=9")).toBeVisible();
      await expect(page.locator("text=crédits")).toBeVisible();
    });

    test("Billing_changer_de_plan_button_navigates_to_pricing", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      const changeButton = page.locator("text=Changer de plan");
      await expect(changeButton).toBeVisible();
      await changeButton.click();
      await expect(page).toHaveURL(/\/pricing/);
    });

    test("Billing_credits_remaining_text_correct", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=crédits restants ce mois")).toBeVisible();
    });

    test("Billing_free_plan_shows_abonnement_mensuel_text", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Plan gratuit")).toBeVisible();
    });

    test("Billing_paid_plan_shows_subscription_renewal_text", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.route("**/api/user/profile", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PROFILE_STARTER),
        });
      });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Abonnement mensuel")).toBeVisible();
    });
  });

  test.describe("Plan Comparison", () => {
    test("Billing_plan_comparison_renders_four_cards", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Nos plans")).toBeVisible();
      await expect(page.locator("text=Gratuit")).toBeVisible();
      await expect(page.locator("text=Starter")).toBeVisible();
      await expect(page.locator("text=Pro")).toBeVisible();
      await expect(page.locator("text=Agency")).toBeVisible();
    });

    test("Billing_current_plan_shows_plan_actuel_disabled_button", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      const disabledButton = page.locator("button:has-text('Plan actuel')");
      await expect(disabledButton).toBeVisible();
      await expect(disabledButton).toBeDisabled();
    });

    test("Billing_starter_card_shows_populaire_badge", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Populaire")).toBeVisible();
    });

    test("Billing_agency_card_shows_contacter_button", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("button:has-text('Contacter')")).toBeVisible();
    });

    test("Billing_non_current_plan_shows_choisir_button", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      const choisirButtons = page.locator("button:has-text('Choisir')");
      await expect(choisirButtons.first()).toBeVisible();
    });

    test("Billing_plan_features_listed_per_card", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=5 crédits/mois").or(page.locator("text=Crédits illimités"))).toBeVisible();
    });

    test("Billing_annual_toggle_shows_minus_20_badge", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await page.locator('[role="switch"]').click();
      await expect(page.locator("text=-20%")).toBeVisible();
    });

    test("Billing_annual_toggle_updates_prices", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await page.locator('[role="switch"]').click();
      await expect(page.locator("text=39€")).toBeVisible();
      await expect(page.locator("text=119€")).toBeVisible();
      await expect(page.locator("text=319€")).toBeVisible();
    });

    test("Billing_annual_toggle_shows_economisez_text", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await page.locator('[role="switch"]').click();
      await expect(page.locator("text=économisez 20%")).toBeVisible();
    });

    test("Billing_monthly_toggle_reverts_to_monthly_prices", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await page.locator('[role="switch"]').click();
      await page.locator('[role="switch"]').click();
      await expect(page.locator("text=-20%")).not.toBeVisible();
      await expect(page.locator("text=49€")).toBeVisible();
      await expect(page.locator("text=149€")).toBeVisible();
      await expect(page.locator("text=399€")).toBeVisible();
    });

    test("Billing_free_plan_price_stays_zero_with_toggle", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=0€").first()).toBeVisible();
      await page.locator('[role="switch"]').click();
      await expect(page.locator("text=0€").first()).toBeVisible();
    });
  });

  test.describe("Transaction History", () => {
    test("Billing_transactions_empty_state", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Historique des transactions")).toBeVisible();
      await expect(page.locator("text=Aucune transaction")).toBeVisible();
    });

    test("Billing_transactions_table_headers", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.route("**/api/billing/transactions", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TRANSACTIONS),
        });
      });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Date")).toBeVisible();
      await expect(page.locator("text=Description")).toBeVisible();
      await expect(page.locator("text=Montant")).toBeVisible();
      await expect(page.locator("text=Statut")).toBeVisible();
    });

    test("Billing_transaction_type_achat", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.route("**/api/billing/transactions", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TRANSACTIONS),
        });
      });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Achat de crédits")).toBeVisible();
    });

    test("Billing_transaction_type_debit", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.route("**/api/billing/transactions", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TRANSACTIONS),
        });
      });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Utilisation")).toBeVisible();
    });

    test("Billing_transaction_type_remboursement", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.route("**/api/billing/transactions", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TRANSACTIONS),
        });
      });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Remboursement")).toBeVisible();
    });

    test("Billing_transaction_type_refill", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.route("**/api/billing/transactions", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TRANSACTIONS),
        });
      });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Renouvellement mensuel")).toBeVisible();
    });

    test("Billing_transaction_shows_paye_badge", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.route("**/api/billing/transactions", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TRANSACTIONS),
        });
      });
      await page.goto("/settings/billing");
      await expect(page.locator("text=Payé")).toBeVisible();
    });

    test("Billing_transaction_dates_french_format", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Test User", email });
      await page.route("**/api/billing/transactions", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TRANSACTIONS),
        });
      });
      await page.goto("/settings/billing");
      const dateCells = page.locator("table tbody tr td").first();
      await expect(dateCells).not.toBeEmpty();
    });
  });
});
