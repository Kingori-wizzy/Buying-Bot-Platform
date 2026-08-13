import { describe, expect, it } from 'vitest';

import { cartSubtotalMinor, getApiBaseUrl } from './api.js';

describe('@buying-bot/web helpers', () => {
  it('defaults API base URL', () => {
    expect(getApiBaseUrl()).toMatch(/^http/);
  });

  it('sums cart line totals from API values', () => {
    expect(
      cartSubtotalMinor([{ lineTotalMinor: 100 }, { lineTotalMinor: 250 }]),
    ).toBe(350);
  });
});
