import { describe, expect, it } from 'vitest';

import { flattenRolePermissions, hasPermission } from './index.js';

describe('@buying-bot/auth', () => {
  it('checks permissions', () => {
    const principal = {
      subjectId: 'user-1',
      roles: ['admin'],
      permissions: [{ resource: 'orders', action: 'read' as const }],
    };
    expect(
      hasPermission(principal, { resource: 'orders', action: 'read' }),
    ).toBe(true);
    expect(
      hasPermission(principal, { resource: 'orders', action: 'delete' }),
    ).toBe(false);
  });

  it('flattens role permissions', () => {
    const permissions = flattenRolePermissions([
      {
        id: 'r1',
        name: 'ops',
        permissions: [
          { resource: 'orders', action: 'read' },
          { resource: 'orders', action: 'read' },
        ],
      },
    ]);
    expect(permissions).toHaveLength(1);
  });
});
