import { describe, expect, it } from 'vitest';

import { MockMarketplaceAdapter } from './adapters/mock-marketplace.adapter.js';
import { fetchAllSourceProducts } from './paginated-port.js';

describe('paginated sync', () => {
  it('fetches all fixture products across pages', async () => {
    const adapter = new MockMarketplaceAdapter();
    const all = await fetchAllSourceProducts(adapter, { pageSize: 2 });
    expect(all.length).toBeGreaterThanOrEqual(4);
    const ids = new Set(all.map((p) => p.sourceProductId));
    expect(ids.size).toBe(all.length);
  });

  it('mock searchPage paginates without duplication', async () => {
    const adapter = new MockMarketplaceAdapter();
    const page1 = await adapter.searchPage({ query: '', limit: 2, page: 0 });
    const page2 = await adapter.searchPage({
      query: '',
      limit: 2,
      ...(page1.nextCursor ? { cursor: page1.nextCursor } : {}),
    });
    const ids1 = page1.items.map((p) => p.sourceProductId);
    const ids2 = page2.items.map((p) => p.sourceProductId);
    for (const id of ids2) {
      expect(ids1).not.toContain(id);
    }
  });
});
