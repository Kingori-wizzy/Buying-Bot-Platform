import { expect, test } from '@playwright/test';

/**
 * DEFERRED: marketplace/sandbox ingestion is not on the production shop path.
 * Enable only when MARKETPLACE_INGESTION_ENABLED=true and sandbox products exist.
 */
const apiBase = (process.env.API_BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:3001';
const marketplaceEnabled = process.env.MARKETPLACE_INGESTION_ENABLED === 'true';

test.describe('Sandbox marketplace journey (DEFERRED)', () => {
  test('search → provenance → compare → cart (sandbox)', async ({ request }) => {
    test.skip(
      !marketplaceEnabled,
      'Marketplace ingestion deferred — digital catalog is admin-managed',
    );
    test.skip(!apiBase, 'API_BASE_URL not set');

    const search = await request.get(
      `${apiBase}/v1/search/products?q=Samsung&priceMaxMinor=7000000&pageSize=10`,
      { headers: { origin } },
    );
    expect(search.ok()).toBeTruthy();
    const searchBody = (await search.json()) as {
      items?: Array<{
        id: string;
        name: string;
        primaryImageUrl?: string | null;
        provenance?: {
          contentOrigin: string;
          priceFreshness: string;
          sellerName: string;
        } | null;
        variants?: Array<{
          sku?: { offers?: Array<{ id: string; listPriceMinor: number }> };
        }>;
      }>;
    };
    expect((searchBody.items?.length ?? 0) > 0).toBeTruthy();

    const product = searchBody.items?.[0];
    expect(product?.provenance?.contentOrigin).toBe('SANDBOX');
    expect(product?.provenance?.sellerName).toBeTruthy();

    const detail = await request.get(
      `${apiBase}/v1/products/${encodeURIComponent(product!.id)}`,
      { headers: { origin } },
    );
    expect(detail.ok()).toBeTruthy();
    const detailBody = (await detail.json()) as {
      provenance?: { sourceUrl: string; priceObservedAt: string | null };
    };
    expect(detailBody.provenance?.sourceUrl).toMatch(/^https?:\/\//);

    const history = await request.get(
      `${apiBase}/v1/products/${encodeURIComponent(product!.id)}/price-history`,
      { headers: { origin } },
    );
    expect(history.ok()).toBeTruthy();

    const availability = await request.get(
      `${apiBase}/v1/products/${encodeURIComponent(product!.id)}/availability`,
      { headers: { origin } },
    );
    expect(availability.ok()).toBeTruthy();

    const ids = (searchBody.items ?? [])
      .slice(0, 2)
      .map((p) => p.id)
      .filter(Boolean);
    if (ids.length >= 2) {
      const compare = await request.post(`${apiBase}/v1/products/compare`, {
        headers: { origin, 'content-type': 'application/json' },
        data: { productIds: ids },
      });
      expect(compare.ok()).toBeTruthy();
    }

    const offerId = product?.variants?.[0]?.sku?.offers?.[0]?.id;
    test.skip(!offerId, 'No offer on sandbox product');

    const csrfRes = await request.get(`${apiBase}/v1/auth/csrf`, {
      headers: { origin },
    });
    const csrfBody = (await csrfRes.json()) as { csrfToken?: string };
    const csrf = csrfBody.csrfToken ?? '';

    const email = `sandbox_mkt_${Date.now()}@example.com`;
    await request.post(`${apiBase}/v1/auth/register`, {
      headers: {
        origin,
        'content-type': 'application/json',
        'x-csrf-token': csrf,
      },
      data: { email, password: 'SandboxMkt1!' },
    });

    const loginCsrf = await request.get(`${apiBase}/v1/auth/csrf`, {
      headers: { origin },
    });
    const loginCsrfBody = (await loginCsrf.json()) as { csrfToken?: string };

    const login = await request.post(`${apiBase}/v1/auth/login`, {
      headers: {
        origin,
        'content-type': 'application/json',
        'x-csrf-token': loginCsrfBody.csrfToken ?? '',
      },
      data: { email, password: 'SandboxMkt1!' },
    });
    expect(login.ok()).toBeTruthy();

    const cartCsrf = await request.get(`${apiBase}/v1/auth/csrf`, {
      headers: { origin },
    });
    const cartCsrfBody = (await cartCsrf.json()) as { csrfToken?: string };

    const addLine = await request.post(`${apiBase}/v1/cart/lines`, {
      headers: {
        origin,
        'content-type': 'application/json',
        'x-csrf-token': cartCsrfBody.csrfToken ?? '',
      },
      data: { offerId, quantity: 1 },
    });
    expect([200, 201].includes(addLine.status())).toBeTruthy();

    const cart = await request.get(`${apiBase}/v1/cart`, {
      headers: { origin },
    });
    expect(cart.ok()).toBeTruthy();
    const cartBody = (await cart.json()) as { lines?: unknown[] };
    expect((cartBody.lines?.length ?? 0) > 0).toBeTruthy();
  });
});
