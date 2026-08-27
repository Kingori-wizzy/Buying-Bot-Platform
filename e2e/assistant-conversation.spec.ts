/**
 * Multi-turn assistant conversation with catalog-backed recommendations.
 */
import { expect, test, type Page } from '@playwright/test';

const webBase = (
  process.env.WEB_BASE_URL || 'http://localhost:3001'
).replace(/\/$/, '');
const apiBase = (
  process.env.API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

async function assertWebReachable(page: Page) {
  const res = await page.goto(`${webBase}/assistant`, {
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

async function registerAndLogin(page: Page): Promise<void> {
  const email = `e2e_asst_${Date.now()}@example.com`;
  const password = 'E2eAssistantConv1!';

  await page.goto(`${webBase}/register`, { waitUntil: 'networkidle' });
  await page.locator('form.panel #email').fill(email);
  await page.locator('form.panel #password').fill(password);
  await page.locator('form.panel button[type="submit"]').click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible({
    timeout: 30_000,
  });
}

test.describe('Assistant multi-turn conversation', () => {
  test.describe.configure({ timeout: 120_000 });

  test('retains conversationId and responds across three turns', async ({
    page,
  }) => {
    await assertWebReachable(page);
    await assertBrowserApiReachable(page);
    await registerAndLogin(page);

    await page.goto(`${webBase}/assistant`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /AI shopping assistant/i })).toBeVisible();

    const streamHeaders: string[] = [];

    page.on('response', (response) => {
      if (
        response.url().includes('/v1/ai/chat/stream') &&
        response.request().method() === 'POST'
      ) {
        streamHeaders.push(response.headers()['x-conversation-id'] ?? '');
      }
    });

    async function sendMessage(text: string): Promise<void> {
      const streamWait = page.waitForResponse(
        (r) =>
          r.url().includes('/v1/ai/chat/stream') &&
          r.request().method() === 'POST',
        { timeout: 60_000 },
      );
      await page.locator('#assistant-message').fill(text);
      await page.getByRole('button', { name: 'Send' }).click();
      const streamRes = await streamWait;
      expect(streamRes.status()).toBe(200);
      await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled({
        timeout: 60_000,
      });
    }

    await sendMessage('I need an AI writing platform.');
    await sendMessage('My budget is KES 10,000.');
    await sendMessage('Which one would you recommend?');

    expect(streamHeaders.length).toBeGreaterThanOrEqual(3);
    const firstId = streamHeaders[0];
    expect(firstId).toBeTruthy();
    expect(streamHeaders.every((id) => id === firstId)).toBe(true);

    await expect(page.locator('.bubble.assistant').last()).not.toContainText(
      /Based on tool results/i,
    );

    const storedId = await page.evaluate((key) => sessionStorage.getItem(key), 'bb_assistant_conversation_id');
    expect(storedId).toBe(firstId);

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.bubble.user')).toHaveCount(3);
  });
});
