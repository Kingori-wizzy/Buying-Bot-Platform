/**
 * Regression: header Search must not steal Enter/submit from customer auth forms.
 * Structural tests run without API. Full auth flow requires live WEB + API.
 */
import { expect, test, type Page } from '@playwright/test';

const webBase = (
  process.env.WEB_BASE_URL || 'http://localhost:3001'
).replace(/\/$/, '');
const apiBase = (
  process.env.API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

async function assertWebReachable(page: Page) {
  const res = await page.goto(`${webBase}/login`, {
    waitUntil: 'domcontentloaded',
  });
  test.skip(
    !res || res.status() >= 500,
    `WEB_BASE_URL unreachable (${webBase})`,
  );
}

async function assertBrowserApiReachable(page: Page) {
  const probe = await page.evaluate(async (origin) => {
    try {
      const res = await fetch(`${origin}/v1/auth/csrf`, {
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
      return { ok: res.ok, status: res.status };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, apiBase);
  test.skip(
    !probe.ok,
    `Browser cannot reach API at ${apiBase} (status ${String(probe.status)}${probe.error ? `: ${probe.error}` : ''})`,
  );
}

test.describe('Customer auth vs header Search', () => {
  test.describe.configure({ timeout: 90_000 });

  test('header Search is type=button (not a competing submit control)', async ({
    page,
  }) => {
    await assertWebReachable(page);
    await page.goto(`${webBase}/login`, { waitUntil: 'domcontentloaded' });

    const searchBtn = page.locator('#header-search button');
    await expect(searchBtn).toHaveAttribute('type', 'button');

    const firstSubmit = page.locator('button[type="submit"]').first();
    await expect(firstSubmit).toHaveText(/Sign in/i);
  });

  test('Enter on register does not submit header Search', async ({ page }) => {
    await assertWebReachable(page);
    await page.goto(`${webBase}/register`, { waitUntil: 'domcontentloaded' });

    await page.locator('form.panel #email').fill('enter-test@example.com');
    await page.locator('form.panel #password').fill('E2eHeaderSearch1!');
    await page.locator('form.panel #password').press('Enter');

    await expect(page).not.toHaveURL(/\/search(\?|$)/);
    await expect(page).toHaveURL(/\/register/);
  });

  test('Enter on login does not submit header Search', async ({ page }) => {
    await assertWebReachable(page);
    await page.goto(`${webBase}/login`, { waitUntil: 'domcontentloaded' });

    await page.locator('form.panel #email').fill('enter-test@example.com');
    await page.locator('form.panel #password').fill('E2eHeaderSearch1!');
    await page.locator('form.panel #password').press('Enter');

    await expect(page).not.toHaveURL(/\/search(\?|$)/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('register submits /v1/auth/register then login; header shows Log out', async ({
    page,
  }) => {
    await assertWebReachable(page);
    await assertBrowserApiReachable(page);

    const email = `e2e_hdr_${Date.now()}@example.com`;
    const password = 'E2eHeaderSearch1!';

    await page.goto(`${webBase}/register`, { waitUntil: 'networkidle' });

    const registerWait = page.waitForResponse(
      (r) =>
        r.url().includes('/v1/auth/register') &&
        r.request().method() === 'POST',
      { timeout: 45_000 },
    );
    const loginWait = page.waitForResponse(
      (r) =>
        r.url().includes('/v1/auth/login') && r.request().method() === 'POST',
      { timeout: 45_000 },
    );
    const meWait = page.waitForResponse(
      (r) =>
        r.url().includes('/v1/auth/me') &&
        r.request().method() === 'GET' &&
        r.status() === 200,
      { timeout: 45_000 },
    );

    await page.locator('form.panel #email').fill(email);
    await page.locator('form.panel #password').fill(password);
    await page.locator('form.panel button[type="submit"]').click();

    await expect(page).not.toHaveURL(/\/search(\?|$)/);

    const registerRes = await registerWait;
    expect(registerRes.status()).toBe(201);

    const loginRes = await loginWait;
    expect(loginRes.status()).toBe(201);

    const meRes = await meWait;
    expect(meRes.status()).toBe(200);

    await expect(
      page.getByRole('button', { name: 'Log out' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('login submits /v1/auth/login; /me 200; header shows Log out', async ({
    page,
    request,
  }) => {
    await assertWebReachable(page);
    await assertBrowserApiReachable(page);

    const email = `e2e_login_${Date.now()}@example.com`;
    const password = 'E2eHeaderSearch1!';
    const origin = webBase;

    const csrfRes = await request.get(`${apiBase}/v1/auth/csrf`, {
      headers: { origin },
    });
    expect(csrfRes.ok()).toBeTruthy();
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    const register = await request.post(`${apiBase}/v1/auth/register`, {
      headers: {
        origin,
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      data: { email, password },
    });
    expect([200, 201].includes(register.status())).toBeTruthy();

    await page.goto(`${webBase}/login`, { waitUntil: 'networkidle' });

    const loginWait = page.waitForResponse(
      (r) =>
        r.url().includes('/v1/auth/login') && r.request().method() === 'POST',
      { timeout: 45_000 },
    );
    const meWait = page.waitForResponse(
      (r) =>
        r.url().includes('/v1/auth/me') &&
        r.request().method() === 'GET' &&
        r.status() === 200,
      { timeout: 45_000 },
    );

    await page.locator('form.panel #email').fill(email);
    await page.locator('form.panel #password').fill(password);
    await page.locator('form.panel button[type="submit"]').click();

    await expect(page).not.toHaveURL(/\/search(\?|$)/);

    const loginRes = await loginWait;
    expect(loginRes.status()).toBe(201);

    const meRes = await meWait;
    expect(meRes.status()).toBe(200);

    await expect(
      page.getByRole('button', { name: 'Log out' }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
