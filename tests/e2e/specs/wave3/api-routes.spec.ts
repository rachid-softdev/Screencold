import { test, expect } from "@playwright/test";
import {
  register,
  randomEmail,
} from "../fixtures/helpers";

test.describe("API: Contact", () => {
  test("P0 Contact_valid_submission_returns_201", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/contact", {
      data: {
        name: "Test User",
        email: "contact@test.com",
        subject: "Hello",
        message: "This is a test message",
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Message envoy\u00e9 avec succ\u00e8s");
    expect(body).toHaveProperty("id");
  });

  test("P1 Contact_missing_fields_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/contact", {
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("P1 Contact_invalid_email_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/contact", {
      data: {
        name: "Test User",
        email: "not-an-email",
        subject: "Hello",
        message: "Test message",
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("P2 Contact_xss_payload_accepted_safely", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const xssPayload = "<script>alert('xss')</script>";
    const response = await page.request.post("/api/contact", {
      data: {
        name: xssPayload,
        email: "safe@test.com",
        subject: xssPayload,
        message: xssPayload,
      },
    });
    expect(response.status()).toBe(201);
  });

  test("P2 Contact_GET_returns_501", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/contact");
    expect(response.status()).toBe(501);
  });
});

test.describe("API: Analytics", () => {
  test("P1 Analytics_valid_event_returns_200", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/analytics", {
      data: {
        event: "page_view",
        properties: { page: "/home" },
        url: "/home",
        timestamp: "2024-01-01T00:00:00Z",
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test("P1 Analytics_missing_event_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/analytics", {
      data: { properties: {} },
    });
    expect(response.status()).toBe(400);
  });

  test("P1 Analytics_empty_body_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/analytics", {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test("P1 Analytics_invalid_json_never_crashes", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/analytics", {
      data: "not json at all",
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(200);
  });
});

test.describe("API: Dashboard", () => {
  test("P0 Dashboard_unauthenticated_returns_401", async ({ request }) => {
    const response = await request.get("/api/dashboard");
    expect(response.status()).toBe(401);
  });

  test("P0 Dashboard_returns_user_stats", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/dashboard");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("user");
    expect(body).toHaveProperty("stats");
    expect(body).toHaveProperty("recentAudits");
    expect(body.user).toHaveProperty("id");
    expect(body.user).toHaveProperty("name");
    expect(body.user).toHaveProperty("email");
    expect(body.user).toHaveProperty("plan");
    expect(body.user).toHaveProperty("credits");
    expect(body.stats).toHaveProperty("thisMonthAudits");
    expect(body.stats).toHaveProperty("lastMonthAudits");
    expect(body.stats).toHaveProperty("totalAudits");
    expect(body.stats).toHaveProperty("auditsChange");
    expect(body.stats).toHaveProperty("creditsUsed");
  });

  test("P1 Dashboard_pagination_with_cursor", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get(
      "/api/dashboard?recentCursor=nonexistent&recentLimit=5"
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.recentAudits)).toBe(true);
  });

  test("P1 Dashboard_credits_are_numeric", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/dashboard");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.user.credits).toBe("number");
    expect(typeof body.stats.creditsUsed).toBe("number");
  });

  test("P2 Dashboard_cache_control_headers", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/dashboard");
    expect(response.status()).toBe(200);
    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toContain("private");
    expect(cacheControl).toContain("max-age=30");
  });
});

test.describe("API: Entitlements", () => {
  test("P0 Entitlements_unauthenticated_returns_401", async ({ request }) => {
    const response = await request.get("/api/me/entitlements");
    expect(response.status()).toBe(401);
  });

  test("P0 Entitlements_returns_features_and_limits", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/me/entitlements");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("plan");
    expect(body).toHaveProperty("features");
    expect(body).toHaveProperty("limits");
    expect(body).toHaveProperty("usage");
    expect(body).toHaveProperty("resetAt");
  });

  test("P1 Entitlements_FREE_plan_defaults", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/me/entitlements");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.plan).toBeDefined();
    expect(typeof body.features).toBe("object");
    expect(typeof body.limits).toBe("object");
  });
});

test.describe("API: Billing Transactions", () => {
  test("P0 Billing_transactions_unauthenticated_returns_401", async ({
    request,
  }) => {
    const response = await request.get("/api/billing/transactions");
    expect(response.status()).toBe(401);
  });

  test("P0 Billing_transactions_empty_history", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/billing/transactions");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("transactions");
    expect(body).toHaveProperty("pagination");
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(typeof body.pagination.total).toBe("number");
  });

  test("P1 Billing_transactions_pagination_structure", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get(
      "/api/billing/transactions?page=1&limit=5"
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(5);
  });
});

test.describe("API: Email Templates", () => {
  test("P0 Templates_list_unauthenticated_returns_401", async ({
    request,
  }) => {
    const response = await request.get("/api/email-templates");
    expect(response.status()).toBe(401);
  });

  test("P0 Templates_list_returns_templates", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/email-templates");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("templates");
    expect(Array.isArray(body.templates)).toBe(true);
  });

  test("P0 Templates_create_valid_returns_201", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/email-templates", {
      data: {
        name: "My Template",
        subject: "Hello {{contactName}}",
        body: "Dear {{contactName}},\n\nThis is a test.",
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.template.name).toBe("My Template");
    expect(body.template.isDefault).toBe(false);
  });

  test("P1 Templates_create_as_default_unsets_others", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const first = await page.request.post("/api/email-templates", {
      data: {
        name: "First Template",
        subject: "First",
        body: "First body",
        isDefault: true,
      },
    });
    expect(first.status()).toBe(201);

    const second = await page.request.post("/api/email-templates", {
      data: {
        name: "Second Template",
        subject: "Second",
        body: "Second body",
        isDefault: true,
      },
    });
    expect(second.status()).toBe(201);

    const list = await page.request.get("/api/email-templates");
    const templates = (await list.json()).templates;
    const defaults = templates.filter((t: { isDefault: boolean }) => t.isDefault);
    expect(defaults.length).toBe(1);
  });

  test("P0 Templates_create_missing_name_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/email-templates", {
      data: { subject: "Hello", body: "World" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("P1 Templates_create_empty_body_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/email-templates", {
      data: { name: "Test", subject: "Hello", body: "" },
    });
    expect(response.status()).toBe(400);
  });

  test("P0 Templates_create_unauthenticated_returns_401", async ({
    request,
  }) => {
    const response = await request.post("/api/email-templates", {
      data: { name: "Test", subject: "Hi", body: "Body" },
    });
    expect(response.status()).toBe(401);
  });

  test("P0 Templates_update_nonexistent_returns_404", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.patch(
      "/api/email-templates/nonexistent-id",
      {
        data: { name: "Updated Name" },
      }
    );
    expect(response.status()).toBe(404);
  });

  test("P0 Templates_delete_nonexistent_returns_404", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.delete(
      "/api/email-templates/nonexistent-id"
    );
    expect(response.status()).toBe(404);
  });
});

test.describe("API: Stripe Checkout", () => {
  test("P0 Stripe_checkout_invalid_plan_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/stripe/checkout", {
      data: { plan: "INVALID" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid plan");
  });

  test("P0 Stripe_checkout_empty_plan_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/stripe/checkout", {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test("P0 Credits_checkout_unauthenticated_returns_401", async ({
    request,
  }) => {
    const response = await request.post("/api/stripe/credits/checkout", {
      data: { credits: 50 },
    });
    expect(response.status()).toBe(401);
  });

  test("P1 Credits_checkout_invalid_package_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post(
      "/api/stripe/credits/checkout",
      {
        data: { credits: 7 },
      }
    );
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("INVALID_PACKAGE");
  });

  test("P1 Credits_checkout_missing_credits_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post(
      "/api/stripe/credits/checkout",
      {
        data: {},
      }
    );
    expect(response.status()).toBe(400);
  });

  test("P1 Credits_checkout_negative_credits_returns_400", async ({
    page,
  }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post(
      "/api/stripe/credits/checkout",
      {
        data: { credits: -10 },
      }
    );
    expect(response.status()).toBe(400);
  });
});

test.describe("API: Stripe Webhook", () => {
  test("P0 Stripe_webhook_missing_signature_returns_400", async ({
    request,
  }) => {
    const response = await request.post("/api/webhooks/stripe", {
      data: { type: "checkout.session.completed" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Missing signature");
  });

  test("P0 Stripe_webhook_invalid_signature_returns_400", async ({
    request,
  }) => {
    const response = await request.post("/api/webhooks/stripe", {
      data: { type: "checkout.session.completed" },
      headers: { "stripe-signature": "bad-signature" },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("API: Cron Reset Credits", () => {
  test("P0 Cron_reset_credits_missing_auth_returns_401", async ({
    request,
  }) => {
    const response = await request.post("/api/cron/reset-credits");
    expect(response.status()).toBe(401);
  });

  test("P0 Cron_reset_credits_wrong_secret_returns_401", async ({
    request,
  }) => {
    const response = await request.post("/api/cron/reset-credits", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(response.status()).toBe(401);
  });

  test("P0 Cron_reset_credits_wrong_x_cron_secret_returns_401", async ({
    request,
  }) => {
    const response = await request.post("/api/cron/reset-credits", {
      headers: { "x-cron-secret": "wrong-secret" },
    });
    expect(response.status()).toBe(401);
  });

  test("P1 Cron_reset_credits_invalid_auth_header_format", async ({
    request,
  }) => {
    const response = await request.post("/api/cron/reset-credits", {
      headers: { Authorization: "Basic invalid" },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("API: Admin Users", () => {
  test("P0 Admin_users_non_admin_returns_403", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/admin/users");
    expect(response.status()).toBe(403);
  });

  test("P0 Admin_users_unauthenticated_returns_401", async ({ request }) => {
    const response = await request.get("/api/admin/users");
    const status = response.status();
    expect(status === 401 || status === 403).toBe(true);
  });

  test("P0 Admin_create_user_non_admin_returns_403", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/admin/users", {
      data: {
        email: randomEmail(),
        name: "New User",
        role: "USER",
      },
    });
    expect(response.status()).toBe(403);
  });

  test("P1 Admin_create_user_missing_email_returns_403_before_validation", async ({
    page,
  }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post("/api/admin/users", {
      data: { name: "No Email", role: "USER" },
    });
    expect(response.status()).toBe(403);
  });
});

test.describe("API: Admin Metrics", () => {
  test("P0 Admin_metrics_non_admin_returns_403", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/admin/metrics");
    expect(response.status()).toBe(403);
  });

  test("P0 Admin_metrics_unauthenticated_returns_401", async ({ request }) => {
    const response = await request.get("/api/admin/metrics");
    const status = response.status();
    expect(status === 401 || status === 403).toBe(true);
  });
});

test.describe("API: Admin Entitlements", () => {
  test("P0 Admin_entitlements_plans_non_admin_returns_403", async ({
    page,
  }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get(
      "/api/admin/entitlements/plans"
    );
    expect(response.status()).toBe(403);
  });

  test("P0 Admin_entitlements_features_non_admin_returns_403", async ({
    page,
  }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get(
      "/api/admin/entitlements/features"
    );
    expect(response.status()).toBe(403);
  });

  test("P0 Admin_entitlements_unknown_path_non_admin_returns_403", async ({
    page,
  }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get(
      "/api/admin/entitlements/unknown-path"
    );
    expect(response.status()).toBe(403);
  });

  test("P0 Admin_entitlements_overrides_post_non_admin_returns_403", async ({
    page,
  }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post(
      "/api/admin/entitlements/overrides",
      {
        data: {
          scope: "ORG",
          scopeId: "some-org-id",
          featureKey: "api_access",
          enabled: true,
          reason: "test",
        },
      }
    );
    expect(response.status()).toBe(403);
  });
});

test.describe("API: Gmail OAuth Authorize", () => {
  test("P0 Gmail_authorize_unauthenticated_returns_401", async ({
    request,
  }) => {
    const response = await request.get("/api/auth/gmail/authorize");
    expect(response.status()).toBe(401);
  });

  test("P0 Gmail_authorize_authenticated_returns_redirect_url", async ({
    page,
  }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/auth/gmail/authorize");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("redirectUrl");
    expect(body.redirectUrl).toContain("accounts.google.com");
  });

  test("P1 Gmail_authorize_sets_state_cookie", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/auth/gmail/authorize");
    expect(response.status()).toBe(200);
    const setCookie = response.headers()["set-cookie"] || "";
    expect(setCookie).toContain("gmail_oauth_state");
  });
});

test.describe("API: Gmail OAuth Callback", () => {
  test("P0 Gmail_callback_with_error_param_redirects", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get(
      "/api/auth/gmail/callback?error=access_denied"
    );
    expect(response.status()).toBe(302);
    const location = response.headers()["location"] || "";
    expect(location).toContain("error=gmail_auth_failed");
  });

  test("P1 Gmail_callback_missing_code_or_state_redirects", async ({
    page,
  }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.get("/api/auth/gmail/callback");
    expect(response.status()).toBe(302);
    const location = response.headers()["location"] || "";
    expect(location).toContain("error=invalid_params");
  });
});

test.describe("API: Send Email", () => {
  test("P0 Send_email_unauthenticated_returns_401", async ({ request }) => {
    const response = await request.post("/api/audits/fake-id/send-email", {
      data: {
        to: "test@example.com",
        subject: "Hello",
        body: "Message body",
      },
    });
    expect(response.status()).toBe(401);
  });

  test("P0 Send_email_nonexistent_audit_returns_404", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post(
      "/api/audits/nonexistent-id-12345/send-email",
      {
        data: {
          to: "test@example.com",
          subject: "Hello",
          body: "Message body",
        },
      }
    );
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("NOT_FOUND");
  });

  test("P1 Send_email_invalid_recipient_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post(
      "/api/audits/nonexistent-id/send-email",
      {
        data: {
          to: "not-an-email",
          subject: "Hello",
          body: "Message body",
        },
      }
    );
    expect(response.status()).toBe(400);
  });

  test("P1 Send_email_empty_subject_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post(
      "/api/audits/nonexistent-id/send-email",
      {
        data: {
          to: "test@example.com",
          subject: "",
          body: "Message body",
        },
      }
    );
    expect(response.status()).toBe(400);
  });

  test("P1 Send_email_empty_body_returns_400", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const response = await page.request.post(
      "/api/audits/nonexistent-id/send-email",
      {
        data: {
          to: "test@example.com",
          subject: "Hello",
          body: "",
        },
      }
    );
    expect(response.status()).toBe(400);
  });
});

test.describe("API: v1 Endpoints", () => {
  test("P0 V1_audits_without_api_key_returns_401", async ({ request }) => {
    const response = await request.post("/api/v1/audits", {
      data: { url: "https://example.com" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  test("P0 V1_audits_with_empty_bearer_returns_401", async ({ request }) => {
    const response = await request.post("/api/v1/audits", {
      data: { url: "https://example.com" },
      headers: { Authorization: "Bearer " },
    });
    expect(response.status()).toBe(401);
  });

  test("P0 V1_credits_without_api_key_returns_401", async ({ request }) => {
    const response = await request.get("/api/v1/credits");
    expect(response.status()).toBe(401);
  });

  test("P0 V1_audits_get_without_api_key_returns_401", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/audits");
    expect(response.status()).toBe(401);
  });
});
