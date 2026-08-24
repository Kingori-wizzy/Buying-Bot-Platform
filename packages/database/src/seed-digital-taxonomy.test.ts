import { describe, expect, it } from 'vitest';

import { DIGITAL_SHOP_ROOT_CATEGORIES } from './seed-digital-taxonomy.js';

describe('digital shop taxonomy seed constants', () => {
  it('defines exactly five root categories with stable slugs', () => {
    expect(DIGITAL_SHOP_ROOT_CATEGORIES).toHaveLength(5);
    expect(DIGITAL_SHOP_ROOT_CATEGORIES.map((c) => c.slug)).toEqual([
      'ai-platforms',
      'payout-platforms',
      'academic-writing-accounts',
      'survey-platforms',
      'chat-moderation-platforms',
    ]);
  });

  it('does not invent commercial product names', () => {
    for (const row of DIGITAL_SHOP_ROOT_CATEGORIES) {
      expect(row.name.length).toBeGreaterThan(0);
      expect(row.slug).not.toMatch(/demo-product/i);
    }
  });
});
