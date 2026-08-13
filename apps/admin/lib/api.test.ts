import { describe, expect, it } from 'vitest';

import { getApiBaseUrl, hasPermission } from './api.js';

describe('@buying-bot/admin helpers', () => {
  it('defaults API base URL', () => {
    expect(getApiBaseUrl()).toMatch(/^http/);
  });

  it('checks permissions for nav gating UX only', () => {
    expect(
      hasPermission(
        [{ resource: 'catalog', action: 'read' }],
        'catalog',
        'read',
      ),
    ).toBe(true);
    expect(
      hasPermission(
        [{ resource: 'catalog', action: 'read' }],
        'inventory',
        'update',
      ),
    ).toBe(false);
  });
});
