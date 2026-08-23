import { describe, expect, it } from 'vitest';

import { MockMarketplaceAdapter } from './adapters/mock-marketplace.adapter.js';
import { buildDedupeKey } from './dedupe.js';
import { isSafePublicHttpUrl } from './validate.js';

describe('MockMarketplaceAdapter', () => {
  it('finds Samsung 55 inch TV under 70k', async () => {
    const adapter = new MockMarketplaceAdapter();
    const result = await adapter.search({
      query: 'Samsung 55 inch 4K TV',
      maxPriceMinor: 7_000_000,
      currency: 'KES',
      limit: 5,
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]?.brandName).toBe('Samsung');
    expect(result.items[0]?.amountMinor).toBeLessThanOrEqual(7_000_000);
  });

  it('health reports sandbox ok', async () => {
    const adapter = new MockMarketplaceAdapter();
    const health = await adapter.health();
    expect(health.ok).toBe(true);
  });
});

describe('dedupe', () => {
  it('prefers GTIN for dedupe key', () => {
    expect(
      buildDedupeKey({
        gtin: '8806094567890',
        sourceProductId: 'x',
      }),
    ).toBe('gtin:8806094567890');
  });
});

describe('validate urls', () => {
  it('rejects localhost image urls', () => {
    expect(isSafePublicHttpUrl('http://localhost/img.jpg')).toBe(false);
  });

  it('allows example.com fixture urls', () => {
    expect(isSafePublicHttpUrl('https://images.example.com/mock/tv.jpg')).toBe(
      true,
    );
  });
});
