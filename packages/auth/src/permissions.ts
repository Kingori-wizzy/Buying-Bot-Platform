import type { Permission, PermissionAction } from '@buying-bot/types';

import type { Authorizer, AuthPrincipal } from './index.js';
import { hasPermission } from './index.js';

export const PLATFORM_PERMISSIONS = [
  { resource: 'catalog', action: 'read' },
  { resource: 'catalog', action: 'create' },
  { resource: 'catalog', action: 'update' },
  { resource: 'catalog', action: 'delete' },
  { resource: 'inventory', action: 'read' },
  { resource: 'inventory', action: 'update' },
  { resource: 'orders', action: 'read' },
  { resource: 'orders', action: 'update' },
  { resource: 'orders', action: 'execute' },
  { resource: 'customers', action: 'read' },
  { resource: 'customers', action: 'update' },
  { resource: 'payments', action: 'read' },
  { resource: 'payments', action: 'execute' },
  { resource: 'ai', action: 'manage' },
  { resource: 'integrations', action: 'manage' },
  { resource: 'audit', action: 'read' },
  { resource: 'system', action: 'manage' },
] as const satisfies readonly Permission[];

export function permissionKey(permission: Permission): string {
  return `${permission.resource}:${permission.action}`;
}

export function parsePermissionKey(key: string): Permission | null {
  const [resource, action] = key.split(':');
  if (!resource || !action) {
    return null;
  }
  const allowed: readonly PermissionAction[] = [
    'create',
    'read',
    'update',
    'delete',
    'execute',
    'manage',
  ];
  if (!allowed.includes(action as PermissionAction)) {
    return null;
  }
  return { resource, action: action as PermissionAction };
}

export class DefaultAuthorizer implements Authorizer {
  isAllowed(principal: AuthPrincipal, permission: Permission): boolean {
    return hasPermission(principal, permission);
  }
}

/**
 * Ownership helper: subject may access a resource owned by the same subjectId.
 */
export function assertSameSubject(
  principal: AuthPrincipal,
  resourceSubjectId: string,
): boolean {
  return principal.subjectId === resourceSubjectId;
}
