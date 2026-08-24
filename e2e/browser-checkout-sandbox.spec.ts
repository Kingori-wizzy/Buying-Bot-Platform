import { createHmac } from 'node:crypto';

import { expect, test } from '@playwright/test';

const webBase = (process.env.WEB_BASE_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const apiBase = (process.env.API_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
/** Must match API ESCROW_WEBHOOK_SECRET for signed settlement tests. */
const escrowWebhookSecret =
  process.env.ESCROW_WEBHOOK_SECRET ||
  'e2e-escrow-webhook-secret-min-32-chars!!';

function signEscrowBody(rawBody: string): {
  signature: string;
  timestamp: string;
} {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', escrowWebhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return { signature, timestamp };
}

test('Option B: browser checkout → escrow webhook → PAID', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const email = `browser_b_${Date.now()}@example.com`;
  const password = 'BrowserTest1!';

  const csrfRes = await request.get(`${apiBase}/v1/auth/csrf`, {
    headers: { origin: webBase },
  });
  expect(csrfRes.ok()).toBeTruthy();
  const csrfBody = (await csrfRes.json()) as { csrfToken?: string };

  const register = await request.post(`${apiBase}/v1/auth/register`, {
    headers: {
      origin: webBase,
      'content-type': 'application/json',
      'x-csrf-token': csrfBody.csrfToken ?? '',
    },
    data: { email, password },
  });
  expect([200, 201].includes(register.status())).toBeTruthy();

  const loginCsrfRes = await request.get(`${apiBase}/v1/auth/csrf`, {
    headers: { origin: webBase },
  });
  const loginCsrfBody = (await loginCsrfRes.json()) as { csrfToken?: string };

  const login = await request.post(`${apiBase}/v1/auth/login`, {
    headers: {
      origin: webBase,
      'content-type': 'application/json',
      'x-csrf-token': loginCsrfBody.csrfToken ?? '',
    },
    data: { email, password, realm: 'customer' },
  });
  expect([200, 201].includes(login.status())).toBeTruthy();

  const storage = await request.storageState();
  await page.context().addCookies(storage.cookies);
  await page.goto(`${webBase}/`);
  await page.evaluate(async (api) => {
    await fetch(`${api}/v1/auth/csrf`, { credentials: 'include' });
  }, apiBase);

  const productRes = await request.get(
    `${apiBase}/v1/products/staging-smoke-sample`,
    { headers: { origin: webBase } },
  );
  test.skip(
    !productRes.ok(),
    'No staging-smoke-sample product — READY FOR ADMIN CATALOG DATA',
  );
  const productBody = (await productRes.json()) as {
    variants?: Array<{ sku?: { offers?: Array<{ id: string }> } }>;
  };
  const offerId = productBody.variants?.[0]?.sku?.offers?.[0]?.id;
  test.skip(
    !offerId,
    'No ACTIVE offer on staging sample — READY FOR ADMIN CATALOG DATA',
  );

  const loginCsrfForCart = await request.get(`${apiBase}/v1/auth/csrf`, {
    headers: { origin: webBase },
  });
  const loginCsrfForCartBody = (await loginCsrfForCart.json()) as {
    csrfToken?: string;
  };

  const addCart = await request.post(`${apiBase}/v1/cart/items`, {
    headers: {
      origin: webBase,
      'content-type': 'application/json',
      'x-csrf-token': loginCsrfForCartBody.csrfToken ?? '',
    },
    data: { offerId, quantity: 1 },
  });
  expect([200, 201].includes(addCart.status())).toBeTruthy();

  await page.goto(`${webBase}/products/staging-smoke-sample`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
    timeout: 30_000,
  });

  await page.goto(`${webBase}/checkout`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page
    .getByRole('button', { name: /Review & pay with escrow/i })
    .click();
  await page
    .getByRole('button', { name: /Place order & start escrow/i })
    .click();

  await page.waitForURL(/\/orders\/[0-9a-f-]+/i, { timeout: 30_000 });
  const orderUrl = page.url();
  const orderId = orderUrl.split('/orders/')[1]?.split(/[?#]/)[0];
  expect(orderId).toBeTruthy();

  await expect(page.getByText(/Waiting for escrow confirmation/i)).toBeVisible({
    timeout: 15_000,
  });

  const orderRes = await request.get(
    `${apiBase}/v1/orders/${encodeURIComponent(String(orderId))}`,
    { headers: { origin: webBase } },
  );
  expect(orderRes.ok()).toBeTruthy();
  const orderBody = (await orderRes.json()) as {
    status?: string;
    payableMinor?: number;
    currency?: string;
  };
  expect(orderBody.status).toBe('PENDING_PAYMENT');
  expect(typeof orderBody.payableMinor).toBe('number');

  const ts = String(Date.now());
  const webhookPayload = {
    eventId: `browser-b-${ts}`,
    orderId,
    providerTxnId: `escrow_browser_${ts}`,
    amountMinor: orderBody.payableMinor,
    currency: orderBody.currency ?? 'KES',
    status: 'paid',
  };
  const rawBody = JSON.stringify(webhookPayload);
  const { signature, timestamp } = signEscrowBody(rawBody);

  const webhook = await request.post(
    `${apiBase}/v1/webhooks/payments/escrow`,
    {
      headers: {
        origin: webBase,
        'content-type': 'application/json',
        'x-escrow-signature': signature,
        'x-escrow-timestamp': timestamp,
      },
      data: webhookPayload,
    },
  );
  expect(
    [200, 201, 202].includes(webhook.status()),
    `escrow webhook status ${String(webhook.status())} — ensure ESCROW_WEBHOOK_SECRET matches e2e`,
  ).toBeTruthy();

  await expect(page.getByText(/Payment confirmed by the server/i)).toBeVisible({
    timeout: 25_000,
  });

  const paidOrder = await request.get(
    `${apiBase}/v1/orders/${encodeURIComponent(String(orderId))}`,
    { headers: { origin: webBase } },
  );
  const paidBody = (await paidOrder.json()) as { status?: string };
  expect(['PAID', 'PROCESSING']).toContain(paidBody.status);

  console.log(`\n✓ Escrow Option B complete — order ${orderId} is PAID`);
  console.log(`  View in browser: ${webBase}/orders/${orderId}\n`);
});
