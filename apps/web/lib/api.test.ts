import { describe, expect, it } from 'vitest';

import { cartSubtotalMinor, getAdminPortalLoginUrl, getApiBaseUrl } from './api.js';

describe('@buying-bot/web helpers', () => {
  it('defaults API base URL', () => {
    expect(getApiBaseUrl()).toMatch(/^http/);
  });

  it('points admin entry at the admin portal login', () => {
    expect(getAdminPortalLoginUrl()).toMatch(/\/login$/);
  });

  it('sums cart line totals from API values', () => {
    expect(
      cartSubtotalMinor([{ lineTotalMinor: 100 }, { lineTotalMinor: 250 }]),
    ).toBe(350);
  });
});
