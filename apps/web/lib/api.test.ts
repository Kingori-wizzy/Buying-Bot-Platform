import { afterEach, describe, expect, it } from 'vitest';

import {
  cartSubtotalMinor,
  getAdminPortalLoginUrl,
  getApiBaseUrl,
} from './api.js';

describe('@buying-bot/web helpers', () => {
  const originalInternal = process.env.INTERNAL_API_BASE_URL;
  const originalPublic = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalAdmin = process.env.NEXT_PUBLIC_ADMIN_URL;

  afterEach(() => {
    if (originalInternal === undefined) delete process.env.INTERNAL_API_BASE_URL;
    else process.env.INTERNAL_API_BASE_URL = originalInternal;
    if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = originalPublic;
    if (originalAdmin === undefined) delete process.env.NEXT_PUBLIC_ADMIN_URL;
    else process.env.NEXT_PUBLIC_ADMIN_URL = originalAdmin;
  });

  it('defaults API base URL', () => {
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    expect(getApiBaseUrl()).toMatch(/^http/);
  });

  it('prefers INTERNAL_API_BASE_URL on the server', () => {
    process.env.INTERNAL_API_BASE_URL = 'http://api:3000';
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://buybot.staging.earnhub.tech';
    expect(getApiBaseUrl()).toBe('http://api:3000');
  });

  it('points admin entry at the admin portal login', () => {
    delete process.env.NEXT_PUBLIC_ADMIN_URL;
    expect(getAdminPortalLoginUrl()).toMatch(/\/login$/);
  });

  it('uses NEXT_PUBLIC_ADMIN_URL for the admin entry', () => {
    process.env.NEXT_PUBLIC_ADMIN_URL =
      'https://buybot.staging.earnhub.tech/admin';
    expect(getAdminPortalLoginUrl()).toBe(
      'https://buybot.staging.earnhub.tech/admin/login',
    );
  });

  it('sums cart line totals from API values', () => {
    expect(
      cartSubtotalMinor([{ lineTotalMinor: 100 }, { lineTotalMinor: 250 }]),
    ).toBe(350);
  });
});
