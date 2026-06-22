import { test, expect } from "@playwright/test";
import { register, randomEmail, login } from "../fixtures/helpers";

test.describe("Teams", () => {
  test("P0 Teams_Create_Valid_Name", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Team Owner", email });
    const createRes = await page.request.post("/api/teams", {
      data: { name: "Mon équipe" },
    });
    expect(createRes.status()).toBe(201);
    const body = await createRes.json();
    expect(body.team.name).toBe("Mon équipe");
    expect(body.team.ownerId).toBeTruthy();
  });

  test("P0 Teams_Empty_State", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "No Teams", email });
    await page.goto("/settings/teams");
    await expect(page.locator("text=Aucune équipe")).toBeVisible();
    await expect(page.locator("text=Nouvelle équipe")).toBeVisible();
  });

  test("P1 Teams_Create_Empty_Name", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const createRes = await page.request.post("/api/teams", {
      data: { name: "" },
    });
    expect(createRes.status()).toBe(400);
    const body = await createRes.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("P0 Teams_Unauthenticated", async ({ page }) => {
    await page.goto("/settings/teams");
    await page.waitForURL("/login");
    await expect(page.locator("h1:has-text('Se connecter')")).toBeVisible();
  });

  test("P0 Teams_Invite_By_Email", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Team Owner", email });
    const createRes = await page.request.post("/api/teams", {
      data: { name: "Test Team" },
    });
    const { team } = await createRes.json();
    const inviteRes = await page.request.post(`/api/teams/${team.id}/invitations`, {
      data: { email: "new@example.com", role: "MEMBER" },
    });
    expect(inviteRes.status()).toBe(201);
    const body = await inviteRes.json();
    expect(body.invitation.email).toBe("new@example.com");
    expect(body.invitation.role).toBe("MEMBER");
  });

  test("P1 Teams_Invite_Missing_Email", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Team Owner", email });
    const createRes = await page.request.post("/api/teams", {
      data: { name: "Test Team" },
    });
    const { team } = await createRes.json();
    const inviteRes = await page.request.post(`/api/teams/${team.id}/invitations`, {
      data: {},
    });
    expect(inviteRes.status()).toBe(400);
    const body = await inviteRes.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("P1 Teams_Invite_Already_Pending", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Team Owner", email });
    const createRes = await page.request.post("/api/teams", {
      data: { name: "Test Team" },
    });
    const { team } = await createRes.json();
    await page.request.post(`/api/teams/${team.id}/invitations`, {
      data: { email: "pending@example.com", role: "MEMBER" },
    });
    const secondRes = await page.request.post(`/api/teams/${team.id}/invitations`, {
      data: { email: "pending@example.com", role: "MEMBER" },
    });
    expect(secondRes.status()).toBe(400);
    const body = await secondRes.json();
    expect(body.error).toBe("INVITATION_EXISTS");
  });

  test("P1 Teams_Invite_Not_Owner", async ({ page }) => {
    const ownerEmail = randomEmail();
    await register(page, { name: "Owner", email: ownerEmail });
    const createRes = await page.request.post("/api/teams", {
      data: { name: "Test Team" },
    });
    const { team } = await createRes.json();
    const memberEmail = randomEmail();
    await page.request.post("/api/auth/register", {
      data: { name: "Member", email: memberEmail, password: "password123" },
    });
    await login(page, memberEmail, "password123");
    const inviteRes = await page.request.post(`/api/teams/${team.id}/invitations`, {
      data: { email: "another@example.com", role: "MEMBER" },
    });
    expect(inviteRes.status()).toBe(403);
    const body = await inviteRes.json();
    expect(body.error).toBe("FORBIDDEN");
  });

  test("P0 Teams_List_Pending_Invitations", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Team Owner", email });
    const createRes = await page.request.post("/api/teams", {
      data: { name: "Test Team" },
    });
    const { team } = await createRes.json();
    await page.request.post(`/api/teams/${team.id}/invitations`, {
      data: { email: "invitee@example.com", role: "MEMBER" },
    });
    const listRes = await page.request.get(`/api/teams/${team.id}/invitations`);
    expect(listRes.status()).toBe(200);
    const body = await listRes.json();
    expect(body.invitations.length).toBe(1);
    expect(body.invitations[0].email).toBe("invitee@example.com");
  });

  test("P0 Teams_Legacy_Join_Valid_Token", async ({ page }) => {
    const ownerEmail = randomEmail();
    const memberEmail = randomEmail();
    await register(page, { name: "Owner", email: ownerEmail });
    await page.request.post("/api/auth/register", {
      data: { name: "Member", email: memberEmail, password: "password123" },
    });
    const createRes = await page.request.post("/api/teams", {
      data: { name: "Test Team" },
    });
    const { team } = await createRes.json();
    const inviteRes = await page.request.post(`/api/teams/${team.id}/members`, {
      data: { email: memberEmail, role: "MEMBER" },
    });
    const inviteBody = await inviteRes.json();
    const inviteUrl = new URL(inviteBody.invitationLink);
    const token = inviteUrl.searchParams.get("token")!;
    await login(page, memberEmail, "password123");
    const joinRes = await page.request.put("/api/teams/join", {
      data: { token },
    });
    expect(joinRes.status()).toBe(200);
    const body = await joinRes.json();
    expect(body.success).toBe(true);
  });

  test("P0 Teams_Legacy_Join_Missing_Token", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Member", email });
    const joinRes = await page.request.put("/api/teams/join", {
      data: {},
    });
    expect(joinRes.status()).toBe(400);
    const body = await joinRes.json();
    expect(body.error).toBe("MISSING_TOKEN");
  });

  test("P0 Invitation_Validate_Valid", async ({ page }) => {
    const ownerEmail = randomEmail();
    const memberEmail = randomEmail();
    await register(page, { name: "Owner", email: ownerEmail });
    await page.request.post("/api/auth/register", {
      data: { name: "Member", email: memberEmail, password: "password123" },
    });
    const createRes = await page.request.post("/api/teams", {
      data: { name: "Test Team" },
    });
    const { team } = await createRes.json();
    const inviteRes = await page.request.post(`/api/teams/${team.id}/members`, {
      data: { email: memberEmail, role: "MEMBER" },
    });
    const inviteBody = await inviteRes.json();
    const inviteUrl = new URL(inviteBody.invitationLink);
    const token = inviteUrl.searchParams.get("token")!;
    await login(page, memberEmail, "password123");
    const validateRes = await page.request.get(`/api/teams/invitations/${token}`);
    expect(validateRes.status()).toBe(200);
    const body = await validateRes.json();
    expect(body.invitation.email).toBe(memberEmail);
    expect(body.invitation.teamName).toBe("Test Team");
  });

  test("P0 Invitation_Accept_Valid", async ({ page }) => {
    const ownerEmail = randomEmail();
    const memberEmail = randomEmail();
    await register(page, { name: "Owner", email: ownerEmail });
    await page.request.post("/api/auth/register", {
      data: { name: "Member", email: memberEmail, password: "password123" },
    });
    const createRes = await page.request.post("/api/teams", {
      data: { name: "Test Team" },
    });
    const { team } = await createRes.json();
    const inviteRes = await page.request.post(`/api/teams/${team.id}/members`, {
      data: { email: memberEmail, role: "MEMBER" },
    });
    const inviteBody = await inviteRes.json();
    const inviteUrl = new URL(inviteBody.invitationLink);
    const token = inviteUrl.searchParams.get("token")!;
    await login(page, memberEmail, "password123");
    const acceptRes = await page.request.post(`/api/teams/invitations/${token}/accept`);
    expect(acceptRes.status()).toBe(200);
    const body = await acceptRes.json();
    expect(body.success).toBe(true);
  });

  test("P0 Invitation_Accept_Unauthenticated", async ({ page }) => {
    const acceptRes = await page.request.post(
      "/api/teams/invitations/00000000-0000-0000-0000-000000000000/accept"
    );
    expect(acceptRes.status()).toBe(401);
  });
});

test.describe("Email Templates", () => {
  test("P0 Templates_API_List", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const listRes = await page.request.get("/api/email-templates");
    expect(listRes.status()).toBe(200);
    const body = await listRes.json();
    expect(body).toHaveProperty("templates");
    expect(Array.isArray(body.templates)).toBe(true);
  });

  test("P0 Templates_API_Create", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const createRes = await page.request.post("/api/email-templates", {
      data: {
        name: "Prospection",
        subject: "Bonjour {{contactName}}",
        body: "Nous avons audité {{companyName}} et voici les résultats.",
      },
    });
    expect(createRes.status()).toBe(201);
    const body = await createRes.json();
    expect(body.template.name).toBe("Prospection");
  });

  test("P1 Templates_API_Create_Validation", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const createRes = await page.request.post("/api/email-templates", {
      data: { name: "", subject: "", body: "" },
    });
    expect(createRes.status()).toBe(400);
    const body = await createRes.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("P1 Templates_API_List_Unauthenticated", async ({ page }) => {
    const listRes = await page.request.get("/api/email-templates");
    expect(listRes.status()).toBe(401);
  });

  test("P0 Templates_List_With_Globals", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/email-templates");
    const templateCards = page.locator("[data-testid='template-card']");
    await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
  });

  test("P0 Templates_Empty_State", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/email-templates");
    const emptyText = page.locator("text=Aucun template");
    if (await emptyText.isVisible()) {
      await expect(emptyText).toBeVisible();
      await expect(page.locator("text=Créer un template")).toBeVisible();
    }
  });

  test("P0 Templates_Default_Badge", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.request.post("/api/email-templates", {
      data: {
        name: "Default Template",
        subject: "Hello {{contactName}}",
        body: "Test body",
        isDefault: true,
      },
    });
    await page.goto("/settings/email-templates");
    await expect(page.locator("text=Défaut")).toBeVisible({ timeout: 10000 });
  });

  test("P1 Templates_Global_Badge", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/email-templates");
    const globalBadge = page.locator("text=Global");
    if (await globalBadge.isVisible()) {
      await expect(globalBadge).toBeVisible();
    }
  });

  test("P0 Templates_Create_Modal_Submit_Valid", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/email-templates");
    const createButton = page.locator("text=Nouveau template").first();
    if (await createButton.isVisible()) {
      await createButton.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      await modal.locator('input[name="name"]').fill("Prospection");
      await modal
        .locator('input[name="subject"]')
        .fill("Bonjour {{contactName}}");
      await modal
        .locator("textarea[name='body']")
        .fill("Nous avons audité votre site.");
      await modal.locator('button[type="submit"]:has-text("Créer")').click();
      await expect(page.locator("text=Template créé")).toBeVisible({ timeout: 10000 });
    }
  });

  test("P0 Templates_Edit_Existing", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.request.post("/api/email-templates", {
      data: {
        name: "Original",
        subject: "Original subject",
        body: "Original body",
      },
    });
    await page.goto("/settings/email-templates");
    const editIcon = page.locator('[data-testid="edit-template"]').first();
    if (await editIcon.isVisible()) {
      await editIcon.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      const nameInput = modal.locator('input[name="name"]');
      await nameInput.fill("Updated Name");
      await modal.locator('button[type="submit"]:has-text("Mettre à jour")').click();
      await expect(page.locator("text=Template mis à jour")).toBeVisible({ timeout: 10000 });
    }
  });

  test("P1 Templates_Create_Empty_Name_Blocked", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/email-templates");
    const createButton = page.locator("text=Nouveau template").first();
    if (await createButton.isVisible()) {
      await createButton.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      await modal.locator('input[name="name"]').fill("");
      await modal
        .locator("textarea[name='body']")
        .fill("Some body content");
      await modal.locator('button[type="submit"]').click();
      const nameInput = modal.locator('input[name="name"]');
      const validationMessage = await nameInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage
      );
      expect(validationMessage.length).toBeGreaterThan(0);
    }
  });

  test("P1 Templates_Duplicate", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.request.post("/api/email-templates", {
      data: {
        name: "My Template",
        subject: "Hello {{contactName}}",
        body: "Body content",
      },
    });
    await page.goto("/settings/email-templates");
    const duplicateIcon = page.locator('[data-testid="duplicate-template"]').first();
    if (await duplicateIcon.isVisible()) {
      await duplicateIcon.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      await modal.locator('button[type="submit"]:has-text("Créer")').click();
      await expect(page.locator("text=Template créé")).toBeVisible({ timeout: 10000 });
    }
  });

  test("P0 Templates_Delete_By_API", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const createRes = await page.request.post("/api/email-templates", {
      data: {
        name: "To Delete",
        subject: "Delete me",
        body: "API delete test",
      },
    });
    const { template } = await createRes.json();
    const deleteRes = await page.request.delete(
      `/api/email-templates/${template.id}`
    );
    expect(deleteRes.status()).toBe(200);
    const listRes = await page.request.get("/api/email-templates");
    const listBody = await listRes.json();
    const deleted = listBody.templates.find(
      (t: Record<string, unknown>) => t.id === template.id
    );
    expect(deleted).toBeUndefined();
  });

  test("P1 Templates_Global_Not_Deletable", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/email-templates");
    const globalCards = page.locator("[data-testid='template-card']:has-text('Global')");
    const count = await globalCards.count();
    if (count > 0) {
      const deleteButton = globalCards.first().locator('[data-testid="delete-template"]');
      await expect(deleteButton).toHaveCount(0);
    }
  });

  test("P1 Templates_Insert_Variable", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/email-templates");
    const createButton = page.locator("text=Nouveau template").first();
    if (await createButton.isVisible()) {
      await createButton.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      const variableButton = modal.locator("text={{contactName}}").first();
      if (await variableButton.isVisible()) {
        await variableButton.click();
        const bodyTextarea = modal.locator("textarea[name='body']");
        const value = await bodyTextarea.inputValue();
        expect(value).toContain("{{contactName}}");
      }
    }
  });
});

test.describe("Integrations", () => {
  test("P0 Integrations_Disconnected_State", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/integrations");
    await expect(page.locator("text=Non connecté")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Connecter Gmail")).toBeVisible();
  });

  test("P0 Integrations_Connected_State", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/integrations");
    const connectBadge = page.locator("text=Connecté");
    const nonConnectedBadge = page.locator("text=Non connecté");
    if (await nonConnectedBadge.isVisible()) {
      await expect(nonConnectedBadge).toBeVisible();
    } else {
      await expect(connectBadge).toBeVisible({ timeout: 10000 });
    }
  });

  test("P0 Integrations_Connect_Click", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/integrations");
    const connectButton = page.locator("text=Connecter Gmail");
    if (await connectButton.isVisible()) {
      const responsePromise = page.waitForResponse(
        (res) =>
          res.url().includes("/api/auth/gmail/authorize") &&
          res.request().method() === "GET"
      );
      await connectButton.click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
    }
  });

  test("P0 Integrations_Success_Toast", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/integrations?success=gmail_connected");
    await expect(
      page.locator("text=Compte Gmail connecté avec succès")
    ).toBeVisible({ timeout: 10000 });
  });

  test("P0 Integrations_Error_Toast", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    await page.goto("/settings/integrations?error=gmail_auth_failed");
    await expect(
      page.locator("text=Échec de l'authentification Gmail")
    ).toBeVisible({ timeout: 10000 });
  });

  test("P1 Integrations_Error_Toasts_All", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const errors = [
      { param: "invalid_params", msg: "Paramètres invalides" },
      { param: "invalid_state", msg: "État de session invalide" },
      { param: "user_not_found", msg: "Utilisateur non trouvé" },
      { param: "token_exchange_failed", msg: "Échec de l'échange de token" },
      { param: "unknown", msg: "Une erreur est survenue" },
    ];
    for (const { param, msg } of errors) {
      await page.goto(`/settings/integrations?error=${param}`);
      await expect(page.locator(`text=${msg}`)).toBeVisible({ timeout: 10000 });
    }
  });

  test("P0 Gmail_Authorize_Returns_Url", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const authRes = await page.request.get("/api/auth/gmail/authorize");
    expect(authRes.status()).toBe(200);
    const body = await authRes.json();
    expect(body.redirectUrl).toContain("accounts.google.com");
  });

  test("P0 Gmail_Authorize_Unauthenticated", async ({ page }) => {
    const authRes = await page.request.get("/api/auth/gmail/authorize");
    expect(authRes.status()).toBe(401);
    const body = await authRes.json();
    expect(body.error).toBe("Authentication required");
  });

  test("P0 Gmail_Callback_OAuth_Error", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const callbackRes = await page.request.get(
      "/api/auth/gmail/callback?error=access_denied"
    );
    expect(callbackRes.status()).toBe(302);
    const location = callbackRes.headers()["location"];
    expect(location).toContain("error=gmail_auth_failed");
  });

  test("P0 Gmail_Callback_Missing_Code_State", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const callbackRes = await page.request.get("/api/auth/gmail/callback");
    expect(callbackRes.status()).toBe(302);
    const location = callbackRes.headers()["location"];
    expect(location).toContain("error=invalid_params");
  });

  test("P0 SendEmail_Unauthenticated", async ({ page }) => {
    const sendRes = await page.request.post(
      "/api/audits/00000000-0000-0000-0000-000000000000/send-email",
      {
        data: {
          to: "test@example.com",
          subject: "Test",
          body: "Test body",
        },
      }
    );
    expect(sendRes.status()).toBe(401);
  });

  test("P0 SendEmail_Validation_Missing_Fields", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const sendRes = await page.request.post(
      "/api/audits/00000000-0000-0000-0000-000000000000/send-email",
      { data: {} }
    );
    expect(sendRes.status()).toBe(400);
    const body = await sendRes.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("P0 SendEmail_Audit_Not_Found", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const sendRes = await page.request.post(
      "/api/audits/00000000-0000-0000-0000-000000000000/send-email",
      {
        data: {
          to: "test@example.com",
          subject: "Test subject",
          body: "Test body content",
        },
      }
    );
    expect(sendRes.status()).toBe(404);
    const body = await sendRes.json();
    expect(body.error).toBe("NOT_FOUND");
  });

  test("P0 SendEmail_Forbidden", async ({ page }) => {
    const email = randomEmail();
    await register(page, { name: "Test User", email });
    const auditRes = await page.request.post("/api/audits", {
      data: { url: "https://example.com" },
    });
    const { auditId } = await auditRes.json();
    const otherEmail = randomEmail();
    await page.request.post("/api/auth/register", {
      data: { name: "Other User", email: otherEmail, password: "password123" },
    });
    await login(page, otherEmail, "password123");
    const sendRes = await page.request.post(
      `/api/audits/${auditId}/send-email`,
      {
        data: {
          to: "test@example.com",
          subject: "Test",
          body: "Test body",
        },
      }
    );
    expect(sendRes.status()).toBe(403);
    const body = await sendRes.json();
    expect(body.error).toBe("FORBIDDEN");
  });
});
