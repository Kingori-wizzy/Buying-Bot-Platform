import type { Permission, Role } from '@buying-bot/types';

/**
 * Principal authenticated to the platform.
 */
export interface AuthPrincipal {
  readonly subjectId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly Permission[];
  readonly realm?: 'customer' | 'admin' | 'service';
  readonly sessionId?: string;
  readonly mfaSatisfied?: boolean;
  readonly steppedUp?: boolean;
}

/**
 * Port for verifying credentials / tokens. Adapters live at infrastructure edges.
 */
export interface Authenticator {
  authenticate(token: string): Promise<AuthPrincipal | null>;
}

/**
 * Port for authorization decisions. UI hiding is never sufficient alone.
 */
export interface Authorizer {
  isAllowed(principal: AuthPrincipal, permission: Permission): boolean;
}

export function hasPermission(
  principal: AuthPrincipal,
  permission: Permission,
): boolean {
  return principal.permissions.some(
    (candidate) =>
      candidate.resource === permission.resource &&
      candidate.action === permission.action,
  );
}

export function flattenRolePermissions(roles: readonly Role[]): Permission[] {
  const key = (permission: Permission): string =>
    `${permission.resource}:${permission.action}`;
  const map = new Map<string, Permission>();
  for (const role of roles) {
    for (const permission of role.permissions) {
      map.set(key(permission), permission);
    }
  }
  return [...map.values()];
}

export {
  assertSameSubject,
  DefaultAuthorizer,
  parsePermissionKey,
  permissionKey,
  PLATFORM_PERMISSIONS,
} from './permissions.js';
