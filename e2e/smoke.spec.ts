import { expect, test } from '@playwright/test';

const apiBase = (process.env.API_BASE_URL || '').replace(/\/$/, '');
const webBase = (process.env.WEB_BASE_URL || '').replace(/\/$/, '');

test.describe('API smoke', () => {
  test('API health live', async ({ request }) => {
    test.skip(!apiBase, 'API_BASE_URL not set — skipping API e2e');
    const res = await request.get(`${apiBase}/health/live`);
    expect(res.ok()).toBeTruthy();
  });

  test('API health ready', async ({ request }) => {
    test.skip(!apiBase, 'API_BASE_URL not set — skipping API e2e');
    const res = await request.get(`${apiBase}/health/ready`);
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('Web smoke', () => {
  test('home loads when WEB_BASE_URL set', async ({ page }) => {
    test.skip(
      !webBase,
      'WEB_BASE_URL not set — skipping web e2e (EXTERNAL servers)',
    );
    const res = await page.goto(webBase + '/');
    expect(res?.ok() || res?.status() === 304).toBeTruthy();
  });
});
