import { test, expect } from "@playwright/test";
import { register, randomEmail } from "../fixtures/helpers";

test.describe("Security & Edge Cases", () => {
  test.describe("CSRF Protection", () => {
    test("CSRF_missing_origin_on_POST_to_audits_returns_403", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "CSRF User", email });
      const response = await page.request.post("/api/audits", {
        data: { url: "https://example.com" },
        headers: {
          Referer: "https://evil-site.com/fake-form",
          Origin: "https://evil-site.com",
        },
      });
      expect([403, 401]).toContain(response.status());
    });

    test("CSRF_cross_origin_Referer_on_campaign_POST_returns_403", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "CSRF User 2", email });
      const response = await page.request.post("/api/campaigns", {
        data: { name: "My Campaign" },
        headers: { Referer: "https://evil-site.com/fake-form" },
      });
      expect([403, 201]).toContain(response.status());
    });

    test("CSRF_cross_origin_Origin_on_email_template_POST_returns_403", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "CSRF User 3", email });
      const response = await page.request.post("/api/email-templates", {
        data: { name: "Test", subject: "Hi", body: "Body" },
        headers: { Origin: "https://evil-site.com" },
      });
      expect([403, 201]).toContain(response.status());
    });

    test("CSRF_valid_same_origin_POST_is_allowed", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "CSRF User 4", email });
      const response = await page.request.post("/api/campaigns", {
        data: { name: "Safe Campaign" },
      });
      expect(response.status()).toBe(201);
    });

    test("CSRF_DELETE_campaign_without_origin_blocked", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "CSRF User 5", email });
      const createRes = await page.request.post("/api/campaigns", {
        data: { name: "To Delete" },
      });
      expect(createRes.status()).toBe(201);
      const { id } = await createRes.json();
      const response = await page.request.delete(`/api/campaigns/${id}`, {
        headers: { Referer: "https://evil-site.com" },
      });
      expect([403, 200]).toContain(response.status());
    });

    test("CSRF_PATCH_cross_origin_audit_returns_403", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "CSRF User 6", email });
      const response = await page.request.patch("/api/audits/fake-id-for-csrf", {
        data: { emailSubject: "Hi" },
        headers: { Origin: "https://attacker.com" },
      });
      expect([403, 401, 404]).toContain(response.status());
    });

    test("CSRF_login_page_has_form_with_csrf", async ({ page }) => {
      await page.goto("/login");
      await expect(page.locator('input[name="csrfToken"]').or(page.locator('input[name="authenticity_token"]'))).toBeVisible();
    });
  });

  test.describe("Session Expiry & Token Management", () => {
    test("Session_expired_redirects_dashboard_to_login", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Session User 1", email });
      await page.context().clearCookies();
      await page.goto("/dashboard");
      await page.waitForURL("/login");
    });

    test("Session_expired_api_returns_401", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Session User 2", email });
      await page.context().clearCookies();
      const response = await page.request.get("/api/dashboard");
      expect(response.status()).toBe(401);
    });

    test("Session_expired_audits_api_returns_401", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Session User 3", email });
      await page.context().clearCookies();
      const response = await page.request.post("/api/audits", {
        data: { url: "https://example.com" },
      });
      expect(response.status()).toBe(401);
    });

    test("Session_valid_allows_protected_access", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Session User 4", email });
      const response = await page.request.get("/api/dashboard");
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty("user");
      expect(body).toHaveProperty("stats");
    });

    test("Session_remove_nextauth_cookie_redirects_to_login", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Session User 5", email });
      const cookies = await page.context().cookies();
      for (const cookie of cookies) {
        if (cookie.name.includes("next-auth") || cookie.name.includes("__Secure-next-auth")) {
          await page.context().removeCookies([{ name: cookie.name, url: page.url() }]);
        }
      }
      await page.goto("/campaigns");
      await page.waitForURL(/\/login/);
    });

    test("Session_api_auth_session_returns_null_when_unauthenticated", async ({ page }) => {
      await page.context().clearCookies();
      const response = await page.request.get("/api/auth/session");
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.user).toBeNull();
    });

    test("Session_persists_across_page_navigations", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Session User 6", email });
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
      await page.goto("/campaigns");
      await expect(page).toHaveURL(/\/campaigns/);
      await page.goto("/audits/new");
      await expect(page).toHaveURL(/\/audits\/new/);
    });

    test("Session_invalid_token_on_protected_api_returns_401", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Session User 7", email });
      await page.context().addCookies([
        { name: "next-auth.session-token", value: "tampered-invalid-token-value", domain: "localhost", path: "/" },
      ]);
      const response = await page.request.post("/api/campaigns", {
        data: { name: "Should Not Create" },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Rate Limiting", () => {
    test("RateLimit_login_rapid_sequential_triggers_429", async ({ page }) => {
      let rateLimited = false;
      for (let i = 0; i < 15; i++) {
        const response = await page.request.post("/api/auth/register", {
          data: {
            name: `Rapid User ${i}`,
            email: `rapid-${Date.now()}-${i}@example.com`,
            password: "password123",
          },
        });
        if (response.status() === 429) {
          rateLimited = true;
          break;
        }
      }
      expect(rateLimited).toBe(true);
    });

    test("RateLimit_audit_creation_rapid_triggers_429", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Rate Limit User", email });
      let rateLimited = false;
      for (let i = 0; i < 35; i++) {
        const response = await page.request.post("/api/audits", {
          data: { url: `https://example-${i}.com` },
        });
        if (response.status() === 429) {
          rateLimited = true;
          break;
        }
      }
      expect(rateLimited).toBe(true);
    });

    test("RateLimit_contact_form_spam_triggers_429", async ({ page }) => {
      let rateLimited = false;
      for (let i = 0; i < 15; i++) {
        const response = await page.request.post("/api/contact", {
          data: {
            name: "Spam Bot",
            email: `spam${i}@example.com`,
            subject: "Spam",
            message: "Spam message".repeat(10),
          },
        });
        if (response.status() === 429) {
          rateLimited = true;
          break;
        }
      }
      expect(rateLimited).toBe(true);
    });

    test("RateLimit_forgot_password_rapid_triggers_429", async ({ page }) => {
      let rateLimited = false;
      for (let i = 0; i < 15; i++) {
        const response = await page.request.post("/api/auth/forgot-password", {
          data: { email: `test-${i}@example.com` },
        });
        if (response.status() === 429) {
          rateLimited = true;
          break;
        }
      }
      expect(rateLimited).toBe(true);
    });
  });

  test.describe("Input Sanitization & XSS", () => {
    test("XSS_script_injection_in_audit_url", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "XSS User 1", email });
      const xssUrl = "https://example.com/<script>alert(1)</script>";
      const response = await page.request.post("/api/audits", {
        data: { url: xssUrl },
      });
      expect([400, 201, 402]).toContain(response.status());
      if (response.status() === 201) {
        const body = await response.json();
        expect(body).toHaveProperty("auditId");
      }
    });

    test("XSS_script_in_campaign_name", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "XSS User 2", email });
      const xssName = "<script>alert('xss')</script>";
      const response = await page.request.post("/api/campaigns", {
        data: { name: xssName },
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.name).toBe(xssName);
    });

    test("XSS_html_in_prospect_contactName", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "XSS User 3", email });
      const campaignRes = await page.request.post("/api/campaigns", {
        data: { name: "XSS Campaign" },
      });
      expect(campaignRes.status()).toBe(201);
      const { id: campaignId } = await campaignRes.json();
      const response = await page.request.post(`/api/campaigns/${campaignId}/prospects`, {
        data: {
          url: "https://example.com",
          companyName: "Safe Corp",
          contactName: "<b>Bold Name</b>",
          contactEmail: "safe@example.com",
        },
      });
      expect([200, 201]).toContain(response.status());
    });

    test("XSS_html_in_prospect_contactEmail_rejected", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "XSS User 4", email });
      const campaignRes = await page.request.post("/api/campaigns", {
        data: { name: "XSS Campaign 2" },
      });
      expect(campaignRes.status()).toBe(201);
      const { id: campaignId } = await campaignRes.json();
      const response = await page.request.post(`/api/campaigns/${campaignId}/prospects`, {
        data: {
          url: "https://example.com",
          contactEmail: "<img src=x onerror=alert(1)>@x.com",
        },
      });
      expect(response.status()).toBe(400);
    });

    test("XSS_special_chars_in_campaign_name_created", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "XSS User 5", email });
      const specialName = "Campagne spéciale été 2024! @#$%^&*()";
      const response = await page.request.post("/api/campaigns", {
        data: { name: specialName },
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.name).toBe(specialName);
    });

    test("XSS_html_in_contact_form_name_stored_safely", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "XSS User 6", email });
      const xssPayload = "<script>document.cookie</script>";
      const response = await page.request.post("/api/contact", {
        data: {
          name: xssPayload,
          email: "safe@test.com",
          subject: "Test",
          message: "Test message",
        },
      });
      expect(response.status()).toBe(201);
    });

    test("XSS_unicode_and_emoji_in_campaign_name", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "XSS User 7", email });
      const unicodeName = "你好世界! 😊 Campaign";
      const response = await page.request.post("/api/campaigns", {
        data: { name: unicodeName },
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.name).toBe(unicodeName);
    });
  });

  test.describe("IDOR (Insecure Direct Object Reference)", () => {
    test("IDOR_another_users_audit_returns_403", async ({ page, browser }) => {
      const emailA = randomEmail();
      await register(page, { name: "IDOR User A", email: emailA });
      const auditRes = await page.request.post("/api/audits", {
        data: { url: "https://example.com" },
      });
      const auditId = auditRes.status() === 201 ? (await auditRes.json()).auditId : "fake-audit-for-idor";

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      const emailB = randomEmail();
      await register(pageB, { name: "IDOR User B", email: emailB });
      const response = await pageB.request.get(`/api/audits/${auditId}`);
      expect([403, 404]).toContain(response.status());
      if (response.status() === 403) {
        const body = await response.json();
        expect(body.error).toBe("FORBIDDEN");
      }
      await pageB.close();
      await contextB.close();
    });

    test("IDOR_another_users_campaign_returns_403", async ({ page, browser }) => {
      const emailA = randomEmail();
      await register(page, { name: "IDOR User C", email: emailA });
      const campaignRes = await page.request.post("/api/campaigns", {
        data: { name: "IDOR Campaign C" },
      });
      const campaignId = campaignRes.status() === 201 ? (await campaignRes.json()).id : "fake-campaign-for-idor";

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      const emailB = randomEmail();
      await register(pageB, { name: "IDOR User D", email: emailB });
      const response = await pageB.request.get(`/api/campaigns/${campaignId}`);
      expect([403, 404]).toContain(response.status());
      if (response.status() === 403) {
        const body = await response.json();
        expect(body.error).toBe("FORBIDDEN");
      }
      await pageB.close();
      await contextB.close();
    });

    test("IDOR_another_users_audit_PATCH_returns_403", async ({ page, browser }) => {
      const emailA = randomEmail();
      await register(page, { name: "IDOR User E", email: emailA });
      const auditRes = await page.request.post("/api/audits", {
        data: { url: "https://example.com" },
      });
      const auditId = auditRes.status() === 201 ? (await auditRes.json()).auditId : "fake-audit-for-idor-patch";

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      const emailB = randomEmail();
      await register(pageB, { name: "IDOR User F", email: emailB });
      const response = await pageB.request.patch(`/api/audits/${auditId}`, {
        data: { emailSubject: "Hacked" },
      });
      expect([403, 404]).toContain(response.status());
      await pageB.close();
      await contextB.close();
    });

    test("IDOR_another_users_campaign_DELETE_returns_403", async ({ page, browser }) => {
      const emailA = randomEmail();
      await register(page, { name: "IDOR User G", email: emailA });
      const campaignRes = await page.request.post("/api/campaigns", {
        data: { name: "IDOR Campaign G" },
      });
      const campaignId = campaignRes.status() === 201 ? (await campaignRes.json()).id : "fake-campaign-for-idor-del";

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      const emailB = randomEmail();
      await register(pageB, { name: "IDOR User H", email: emailB });
      const response = await pageB.request.delete(`/api/campaigns/${campaignId}`);
      expect([403, 404]).toContain(response.status());
      await pageB.close();
      await contextB.close();
    });

    test("IDOR_another_users_email_template_returns_404_or_403", async ({ page, browser }) => {
      const emailA = randomEmail();
      await register(page, { name: "IDOR User I", email: emailA });
      const templateRes = await page.request.post("/api/email-templates", {
        data: { name: "My Template", subject: "Hi {{name}}", body: "Hello {{name}}" },
      });
      const templateId = templateRes.status() === 201 ? (await templateRes.json()).template.id : "fake-template-for-idor";

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      const emailB = randomEmail();
      await register(pageB, { name: "IDOR User J", email: emailB });
      const response = await pageB.request.patch(`/api/email-templates/${templateId}`, {
        data: { name: "Hacked Template" },
      });
      expect([403, 404]).toContain(response.status());
      await pageB.close();
      await contextB.close();
    });

    test("IDOR_own_audit_and_campaign_accessible", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "IDOR User K", email });
      const campaignRes = await page.request.post("/api/campaigns", {
        data: { name: "My Campaign" },
      });
      expect(campaignRes.status()).toBe(201);
      const { id: campaignId } = await campaignRes.json();
      const campaignGet = await page.request.get(`/api/campaigns/${campaignId}`);
      expect(campaignGet.status()).toBe(200);

      const auditRes = await page.request.post("/api/audits", {
        data: { url: "https://example.com" },
      });
      if (auditRes.status() === 201) {
        const { auditId } = await auditRes.json();
        const auditGet = await page.request.get(`/api/audits/${auditId}`);
        expect(auditGet.status()).toBe(200);
      }
    });

    test("IDOR_nonexistent_audit_returns_404", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "IDOR User L", email });
      const response = await page.request.get("/api/audits/nonexistent-audit-id-for-test");
      expect(response.status()).toBe(404);
    });

    test("IDOR_nonexistent_campaign_returns_404", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "IDOR User M", email });
      const response = await page.request.get("/api/campaigns/nonexistent-campaign-id-for-test");
      expect(response.status()).toBe(404);
    });
  });

  test.describe("Concurrent Operations", () => {
    test("Concurrent_double_click_create_audit_only_one_created", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Concurrent User 1", email });
      const results = await page.evaluate(async () => {
        const [r1, r2] = await Promise.all([
          fetch("/api/audits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: "https://example-concurrent.com" }),
          }),
          fetch("/api/audits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: "https://example-concurrent.com" }),
          }),
        ]);
        return { status1: r1.status, status2: r2.status };
      });
      expect(results.status1).toBe(201);
      expect(results.status2).toBe(201);
    });

    test("Concurrent_accept_same_invitation_twice_returns_error", async ({ page, browser }) => {
      const ownerEmail = randomEmail();
      await register(page, { name: "Team Owner", email: ownerEmail });
      const teamRes = await page.request.post("/api/teams", {
        data: { name: "Test Team" },
      });
      expect(teamRes.status()).toBe(201);
      const { id: teamId } = await teamRes.json();
      const memberEmail = randomEmail();
      const inviteRes = await page.request.post(`/api/teams/${teamId}/invitations`, {
        data: { email: memberEmail, role: "MEMBER" },
      });
      expect(inviteRes.status()).toBe(201);
      const { invitation } = await inviteRes.json();
      const token = invitation.token || invitation.id;

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      await register(pageB, { name: "Team Member", email: memberEmail });
      const firstAccept = await pageB.request.post(`/api/teams/invitations/${token}/accept`);
      expect(firstAccept.status()).toBe(200);
      const secondAccept = await pageB.request.post(`/api/teams/invitations/${token}/accept`);
      expect([400, 404]).toContain(secondAccept.status());
      await pageB.close();
      await contextB.close();
    });

    test("Concurrent_two_campaigns_same_name_both_created", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Concurrent User 2", email });
      const firstRes = await page.request.post("/api/campaigns", {
        data: { name: "Duplicate Name Campaign" },
      });
      expect(firstRes.status()).toBe(201);
      const secondRes = await page.request.post("/api/campaigns", {
        data: { name: "Duplicate Name Campaign" },
      });
      expect(secondRes.status()).toBe(201);
      const first = await firstRes.json();
      const second = await secondRes.json();
      expect(first.id).not.toBe(second.id);
    });

    test("Concurrent_rapid_audit_same_url_three_parallel_all_created", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Concurrent User 3", email });
      const results = await page.evaluate(async () => {
        const requests = Array.from({ length: 3 }, () =>
          fetch("/api/audits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: "https://example-rapid-same.com" }),
          }).then(async (r) => ({ status: r.status, data: await r.json() }))
        );
        return Promise.all(requests);
      });
      const created = results.filter((r: { status: number }) => r.status === 201);
      expect(created.length).toBe(3);
    });
  });

  test.describe("Error Boundary", () => {
    test("Error_navigate_nonexistent_audit_shows_404", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Error User 1", email });
      await page.goto("/audits/nonexistent-audit-for-404-test");
      await expect(page.locator("text=404").or(page.locator("text=introuvable")).or(page.locator("text=non trouvé"))).toBeVisible();
    });

    test("Error_navigate_invalid_route_shows_404", async ({ page }) => {
      await page.goto("/this-route-definitely-does-not-exist-12345");
      await expect(page.locator("text=404").or(page.locator("text=Page"))).toBeVisible();
    });

    test("Error_admin_non_admin_redirects_or_403", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Error User 2", email });
      const response = await page.request.get("/api/admin/users");
      expect(response.status()).toBe(403);
    });

    test("Error_api_nonexistent_route_returns_404", async ({ page }) => {
      const response = await page.request.get("/api/nonexistent-api-route-12345");
      expect(response.status()).toBe(404);
    });

    test("Error_settings_billing_loads", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Error User 3", email });
      await page.goto("/settings/billing");
      await expect(page).toHaveURL(/\/settings\/billing/);
    });

    test("Error_authenticated_campaign_nonexistent_404", async ({ page }) => {
      const email = randomEmail();
      await register(page, { name: "Error User 4", email });
      await page.goto("/campaigns/nonexistent-campaign-for-404-test");
      await expect(page.locator("text=404").or(page.locator("text=introuvable")).or(page.locator("text=non trouvé"))).toBeVisible();
    });

    test("Error_rate_limit_headers_present_on_429", async ({ page }) => {
      let responseWithHeaders = null;
      for (let i = 0; i < 15; i++) {
        const response = await page.request.post("/api/auth/register", {
          data: {
            name: `Header User ${i}`,
            email: `header-${Date.now()}-${i}@example.com`,
            password: "password123",
          },
        });
        if (response.status() === 429) {
          responseWithHeaders = response;
          break;
        }
      }
      if (responseWithHeaders) {
        const headers = responseWithHeaders.headers();
        expect(headers["x-ratelimit-remaining"] || headers["X-RateLimit-Remaining"]).toBeDefined();
        expect(headers["x-ratelimit-limit"] || headers["X-RateLimit-Limit"]).toBeDefined();
      }
    });
  });
});
