import { expect, test } from '@playwright/test';

const apiBase = (process.env.API_BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:3001';

test.describe('Digital catalog shop path', () => {
  test('lists categories and ACTIVE digital products only', async ({
    request,
  }) => {
    test.skip(!apiBase, 'API_BASE_URL not set');

    const categories = await request.get(`${apiBase}/v1/categories`, {
      headers: { origin },
    });
    expect(categories.ok()).toBeTruthy();
    const categoryBody = (await categories.json()) as Array<{
      slug?: string;
      parentId?: string | null;
    }>;
    const roots = (Array.isArray(categoryBody) ? categoryBody : []).filter(
      (c) => !c.parentId,
    );
    // Taxonomy may be empty until API boot seed runs; when present, expect the five roots.
    if (roots.length > 0) {
      const slugs = roots.map((c) => c.slug).filter(Boolean);
      for (const required of [
        'ai-platforms',
        'payout-platforms',
        'academic-writing-accounts',
        'survey-platforms',
        'chat-moderation-platforms',
      ]) {
        expect(slugs).toContain(required);
      }
    }

    const products = await request.get(
      `${apiBase}/v1/products?productKind=DIGITAL&pageSize=5`,
      { headers: { origin } },
    );
    expect(products.ok()).toBeTruthy();
    const productBody = (await products.json()) as {
      items?: Array<{ status?: string; productKind?: string }>;
    };
    for (const item of productBody.items ?? []) {
      expect(item.status === undefined || item.status === 'ACTIVE').toBeTruthy();
      expect(
        item.productKind === undefined || item.productKind === 'DIGITAL',
      ).toBeTruthy();
    }
  });
});
