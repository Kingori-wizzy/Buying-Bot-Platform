import { describe, expect, it } from 'vitest';

import {
  createJumiaSellerApiAdapterFromEnv,
  JumiaSellerApiAdapter,
} from './adapters/jumia-seller-api.adapter.js';

describe('JumiaSellerApiAdapter', () => {
  it('reports BLOCKED_EXTERNAL when credentials missing', async () => {
    const adapter = new JumiaSellerApiAdapter({
      baseUrl: 'https://vendor-api.jumia.com',
      configured: false,
    });
    const health = await adapter.health();
    expect(health.ok).toBe(false);
    expect(health.message).toContain('BLOCKED_EXTERNAL');
  });

  it('refuses search without credentials', async () => {
    const adapter = createJumiaSellerApiAdapterFromEnv();
    await expect(adapter.search({ query: '' })).rejects.toThrow(/BLOCKED_EXTERNAL/);
  });
});
