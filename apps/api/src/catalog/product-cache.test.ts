import { describe, expect, it } from 'vitest';

import { createProductCache, productCacheKey } from './product-cache.js';

describe('product cache', () => {
  it('returns cache hits from memory backend', async () => {
    const cache = createProductCache();
    const key = productCacheKey('slug-a');
    await cache.set(key, JSON.stringify({ id: '1' }), 60);
    const hit = await cache.get(key);
    expect(hit).toBe(JSON.stringify({ id: '1' }));
  });

  it('falls back when redis throws', async () => {
    const broken = {
      get: () => Promise.reject(new Error('down')),
      set: () => Promise.reject(new Error('down')),
      del: () => Promise.reject(new Error('down')),
    };
    const cache = createProductCache(broken);
    const key = productCacheKey('x');
    await cache.set(key, 'v', 30);
    expect(await cache.get(key)).toBe('v');
  });
});
