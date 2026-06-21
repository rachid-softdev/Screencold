import { expect, type Page, type APIResponse } from "@playwright/test";

export async function login(
  page: Page,
  email = "test@example.com",
  password = "password123"
) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}

export async function register(
  page: Page,
  options?: { name?: string; email?: string; password?: string }
) {
  await page.goto("/register");
  await page.fill('input[name="name"]', options?.name ?? "Test User");
  await page.fill(
    'input[name="email"]',
    options?.email ?? `test-${Date.now()}@example.com`
  );
  await page.fill(
    'input[name="password"]',
    options?.password ?? "password123"
  );
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}

export async function createAudit(page: Page, url: string) {
  await page.goto("/audits/new");
  await page.fill('input[name="url"]', url);
  await page.click('button[type="submit"]');
}

export async function createCampaign(page: Page, name: string) {
  await page.goto("/campaigns");
  await page.click('text=Nouvelle campagne');
  await page.fill('input[name="name"]', name);
  await page.click('button[type="submit"]');
}

export async function waitForToast(page: Page, text?: string) {
  const toast = page.locator("[role='status']").first();
  await expect(toast).toBeVisible({ timeout: 10000 });
  if (text) await expect(toast).toContainText(text);
}

export async function getCSRFToken(page: Page): Promise<string> {
  const meta = page.locator('meta[name="csrf-token"]');
  return (await meta.getAttribute("content")) ?? "";
}

export function randomEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
}

export async function assertResponseStatus(
  response: APIResponse,
  status: number
) {
  expect(response.status()).toBe(status);
}
