import { expect, test } from '@playwright/test';

const apiBase = (process.env.API_BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:3001';

/**
 * Admin-managed catalog journey (API-level).
 * Requires a reachable API. Skips if admin credentials are not configured.
 */
test.describe('Admin-managed catalog journey', () => {
  test('create DRAFT with price → publish → public search finds product', async ({
    request,
  }) => {
    test.skip(!apiBase, 'API_BASE_URL not set');
    const adminEmail = process.env.E2E_ADMIN_EMAIL;
    const adminPassword = process.env.E2E_ADMIN_PASSWORD;
    test.skip(!adminEmail || !adminPassword, 'E2E_ADMIN_EMAIL/PASSWORD not set');

    const csrfRes = await request.get(`${apiBase}/v1/auth/csrf`, {
      headers: { origin },
    });
    expect(csrfRes.ok()).toBeTruthy();
    const csrf = ((await csrfRes.json()) as { csrfToken?: string }).csrfToken ?? '';

    const login = await request.post(`${apiBase}/v1/auth/login`, {
      headers: {
        origin,
        'content-type': 'application/json',
        'x-csrf-token': csrf,
      },
      data: { email: adminEmail, password: adminPassword },
    });
    test.skip(!login.ok(), 'Admin login failed (MFA may be required)');

    const loginCsrf = await request.get(`${apiBase}/v1/auth/csrf`, {
      headers: { origin },
    });
    const token =
      ((await loginCsrf.json()) as { csrfToken?: string }).csrfToken ?? '';

    const suffix = String(Date.now());
    const create = await request.post(`${apiBase}/v1/admin/catalog/products`, {
      headers: {
        origin,
        'content-type': 'application/json',
        'x-csrf-token': token,
      },
      data: {
        name: `E2E Digital Product ${suffix}`,
        slug: `e2e-digital-product-${suffix}`,
        shortDescription: 'E2E DIGITAL SAMPLE — not commercial inventory',
        status: 'DRAFT',
        productKind: 'DIGITAL',
        digitalType: 'DIGITAL_ACCESS',
        inventoryMode: 'UNLIMITED',
        deliveryMethod: 'ACCESS_INSTRUCTIONS',
        listPriceMinor: 10000,
        currency: 'KES',
        contentOrigin: 'DEMO',
      },
    });
    expect([200, 201].includes(create.status())).toBeTruthy();
    const created = (await create.json()) as { id: string; slug: string };

    const pubCsrf = await request.get(`${apiBase}/v1/auth/csrf`, {
      headers: { origin },
    });
    const pubToken =
      ((await pubCsrf.json()) as { csrfToken?: string }).csrfToken ?? '';

    const publish = await request.post(
      `${apiBase}/v1/admin/catalog/products/${created.id}/publish`,
      {
        headers: {
          origin,
          'content-type': 'application/json',
          'x-csrf-token': pubToken,
        },
        data: {},
      },
    );
    expect(publish.ok()).toBeTruthy();

    const search = await request.get(
      `${apiBase}/v1/search/products?q=E2E%20Digital%20Product&pageSize=10`,
      { headers: { origin } },
    );
    expect(search.ok()).toBeTruthy();
    const body = (await search.json()) as {
      items?: Array<{ id: string; provenance?: unknown }>;
    };
    expect(body.items?.some((p) => p.id === created.id)).toBeTruthy();
    const matched = body.items?.find((p) => p.id === created.id);
    expect(matched?.provenance ?? null).toBeNull();
  });
});
