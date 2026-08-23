import { describe, expect, it } from 'vitest';

import { computePriceFreshness } from './freshness.js';
import { assessQuarantine } from './quarantine.js';

describe('price freshness', () => {
  it('marks recent observations as FRESH', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const observed = new Date('2026-08-20T11:50:00Z');
    expect(computePriceFreshness(observed, now)).toBe('FRESH');
  });

  it('marks old observations as EXPIRED', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const observed = new Date('2026-08-18T12:00:00Z');
    expect(computePriceFreshness(observed, now)).toBe('EXPIRED');
  });
});

describe('quarantine', () => {
  it('rejects invalid localhost image urls', () => {
    const result = assessQuarantine({
      sourceProductId: 'p1',
      title: 'TV',
      sourceUrl: 'https://shop.example.com/p/1',
      sellerName: 'Shop',
      amountMinor: 10000,
      currency: 'KES',
      availability: 'VERIFIED',
      imageUrl: 'http://localhost/x.jpg',
      contentOrigin: 'SANDBOX',
      variantName: 'Default',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('INVALID_IMAGE_URL');
    }
  });
});
