import { describe, expect, it } from 'vitest';

import { deriveCatalogSearchQuery } from './search-query.js';

describe('deriveCatalogSearchQuery', () => {
  it('maps business product requests to platform keywords', () => {
    expect(
      deriveCatalogSearchQuery(['I need a product for my business.']),
    ).toBe('platform');
  });

  it('preserves category hints from multi-turn context', () => {
    expect(
      deriveCatalogSearchQuery([
        'I need an academic writing platform.',
        'My budget is KES 30,000.',
      ]),
    ).toBe('academic writing');
  });
});
