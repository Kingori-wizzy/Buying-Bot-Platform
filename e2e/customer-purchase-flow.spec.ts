import { createHmac } from 'node:crypto';

import { expect, test } from '@playwright/test';

const apiBase = (process.env.API_BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const webBase = (process.env.WEB_BASE_URL || '').replace(/\/$/, '');
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:3001';
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

function findOfferId(
  products: Array<{
    variants?: Array<{ sku?: { offers?: Array<{ id: string }> } }>;
  }>,
): string | null {
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      const offer = variant.sku?.offers?.[0];
      if (offer?.id) return offer.id;
    }
  }
  return null;
}

async function resolvePurchasableOfferId(
  request: import('@playwright/test').APIRequestContext,
): Promise<string | null> {
  const staging = await request.get(
    `${apiBase}/v1/products/staging-smoke-sample`,
    { headers: { origin } },
  );
  if (staging.ok()) {
    const body = (await staging.json()) as {
      variants?: Array<{ sku?: { offers?: Array<{ id: string }> } }>;
    };
    const fromStaging = findOfferId([body]);
    if (fromStaging) return fromStaging;
  }
  const catalog = await request.get(`${apiBase}/v1/products?pageSize=50`, {
    headers: { origin },
  });
  if (!catalog.ok()) return null;
  const catalogBody = (await catalog.json()) as {
    items?: Array<{
      variants?: Array<{ sku?: { offers?: Array<{ id: string }> } }>;
    }>;
  };
  return findOfferId(catalogBody.items ?? []);
}

test.describe('Customer purchase flow (API)', () => {
  test('register → catalog → cart → checkout → order', async ({ request }) => {
    test.skip(!apiBase, 'API_BASE_URL not set');

    const csrfRes = await request.get(`${apiBase}/v1/auth/csrf`, {
      headers: { origin },
    });
    expect(csrfRes.ok()).toBeTruthy();
    const csrfBody = (await csrfRes.json()) as { csrfToken?: string };
    const csrf = csrfBody.csrfToken ?? '';

    const email = `e2e_${Date.now()}@example.com`;
    const password = 'E2ePurchase1!';

    const register = await request.post(`${apiBase}/v1/auth/register`, {
      headers: {
        origin,
        'content-type': 'application/json',
        'x-csrf-token': csrf,
      },
      data: { email, password },
    });
    expect([200, 201].includes(register.status())).toBeTruthy();

    const loginCsrfRes = await request.get(`${apiBase}/v1/auth/csrf`, {
      headers: { origin },
    });
    const loginCsrfBody = (await loginCsrfRes.json()) as {
      csrfToken?: string;
    };

    const login = await request.post(`${apiBase}/v1/auth/login`, {
      headers: {
        origin,
        'content-type': 'application/json',
        'x-csrf-token': loginCsrfBody.csrfToken ?? csrf,
      },
      data: { email, password, realm: 'customer' },
    });
    expect([200, 201].includes(login.status())).toBeTruthy();

    const me = await request.get(`${apiBase}/v1/auth/me`, {
      headers: { origin },
    });
    expect(me.ok()).toBeTruthy();

    const offerId = await resolvePurchasableOfferId(request);
    test.skip(
      !offerId,
      'No ACTIVE purchasable product yet — READY FOR ADMIN CATALOG DATA',
    );

    const addCart = await request.post(`${apiBase}/v1/cart/items`, {
      headers: {
        origin,
        'content-type': 'application/json',
        'x-csrf-token': loginCsrfBody.csrfToken ?? csrf,
      },
      data: { offerId, quantity: 1 },
    });
    expect([200, 201].includes(addCart.status())).toBeTruthy();

    const cart = await request.get(`${apiBase}/v1/cart`, {
      headers: { origin },
    });
    expect(cart.ok()).toBeTruthy();
    const cartBody = (await cart.json()) as {
      lines?: Array<{ id: string; lineTotalMinor?: number }>;
    };
    expect((cartBody.lines ?? []).length).toBeGreaterThan(0);
    const lineId = cartBody.lines?.[0]?.id;
    expect(lineId).toBeTruthy();

    const updateCart = await request.patch(
      `${apiBase}/v1/cart/items/${encodeURIComponent(String(lineId))}`,
      {
        headers: {
          origin,
          'content-type': 'application/json',
          'x-csrf-token': loginCsrfBody.csrfToken ?? csrf,
        },
        data: { quantity: 1 },
      },
    );
    expect(updateCart.ok()).toBeTruthy();

    const idempotencyKey = `e2e-${String(Date.now())}`;
    const checkout = await request.post(`${apiBase}/v1/checkout`, {
      headers: {
        origin,
        'content-type': 'application/json',
        'x-csrf-token': loginCsrfBody.csrfToken ?? csrf,
        'idempotency-key': idempotencyKey,
      },
      data: {
        shippingMethodCode: 'FLAT',
      },
    });
    expect([200, 201].includes(checkout.status())).toBeTruthy();
    const checkoutBody = (await checkout.json()) as {
      id?: string;
      orderId?: string;
      status?: string;
      payableMinor?: number;
      currency?: string;
    };
    const orderId = checkoutBody.id ?? checkoutBody.orderId;
    expect(orderId).toBeTruthy();
    expect(checkoutBody.status).toBe('PENDING_PAYMENT');
    expect(typeof checkoutBody.payableMinor).toBe('number');

    const webhookPayload = {
      eventId: `e2e-${String(Date.now())}`,
      orderId,
      providerTxnId: `escrow_e2e_${String(Date.now())}`,
      amountMinor: checkoutBody.payableMinor,
      currency: checkoutBody.currency ?? 'KES',
      status: 'paid',
    };
    const rawBody = JSON.stringify(webhookPayload);
    const { signature, timestamp } = signEscrowBody(rawBody);
    const webhook = await request.post(
      `${apiBase}/v1/webhooks/payments/escrow`,
      {
        headers: {
          origin,
          'content-type': 'application/json',
          'x-escrow-signature': signature,
          'x-escrow-timestamp': timestamp,
        },
        data: webhookPayload,
      },
    );
    expect([200, 201, 202].includes(webhook.status())).toBeTruthy();

    let paidStatus = '';
    for (let i = 0; i < 10; i += 1) {
      await new Promise((r) => setTimeout(r, 250));
      const order = await request.get(
        `${apiBase}/v1/orders/${encodeURIComponent(String(orderId))}`,
        { headers: { origin } },
      );
      expect(order.ok()).toBeTruthy();
      const orderBody = (await order.json()) as { status?: string };
      paidStatus = orderBody.status ?? '';
      if (paidStatus === 'PAID' || paidStatus === 'PROCESSING') break;
    }
    expect(['PAID', 'PROCESSING']).toContain(paidStatus);
  });
});

test.describe('Customer purchase flow (Web UI)', () => {
  test('homepage → products → assistant pages load', async ({ page }) => {
    test.skip(
      !webBase,
      'WEB_BASE_URL not set — skipping web e2e (EXTERNAL servers)',
    );

    const home = await page.goto(`${webBase}/`);
    expect(home?.ok() || home?.status() === 304).toBeTruthy();

    const products = await page.goto(`${webBase}/products`);
    expect(products?.ok() || products?.status() === 304).toBeTruthy();

    const assistant = await page.goto(`${webBase}/assistant`);
    expect(assistant?.ok() || assistant?.status() === 304).toBeTruthy();

    await expect(page.locator('h1')).toBeVisible();

    const cart = await page.goto(`${webBase}/cart`);
    expect(cart?.ok() || cart?.status() === 304).toBeTruthy();
  });
});
