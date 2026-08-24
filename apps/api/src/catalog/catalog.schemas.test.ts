import { describe, expect, it } from 'vitest';

import {
  createProductSchema,
  productListQuerySchema,
} from './catalog.schemas.js';

describe('digital catalog schemas', () => {
  it('accepts digital product create payloads', () => {
    const parsed = createProductSchema.parse({
      name: 'Sample digital offer',
      productKind: 'DIGITAL',
      digitalType: 'DIGITAL_SUBSCRIPTION',
      inventoryMode: 'UNLIMITED',
      deliveryMethod: 'ACCESS_INSTRUCTIONS',
      listPriceMinor: 250000,
      currency: 'KES',
      status: 'DRAFT',
    });
    expect(parsed.digitalType).toBe('DIGITAL_SUBSCRIPTION');
    expect(parsed.inventoryMode).toBe('UNLIMITED');
  });

  it('supports categorySlug and digital filters on public list query', () => {
    const parsed = productListQuerySchema.parse({
      categorySlug: 'ai-platforms',
      productKind: 'DIGITAL',
      digitalType: 'DIGITAL_ACCOUNT',
      page: '1',
    });
    expect(parsed.categorySlug).toBe('ai-platforms');
    expect(parsed.productKind).toBe('DIGITAL');
  });
});
