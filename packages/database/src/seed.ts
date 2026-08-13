import type { PrismaClient } from '@prisma/client';

export const DEFAULT_ORG_SLUG = 'platform';
export const DEFAULT_LOCATION_CODE = 'DEFAULT';

/** Permission catalog from ADR-0008 (resource:action). */
export const PERMISSION_CATALOG = [
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
] as const;

export const ROLE_CATALOG = {
  CUSTOMER: [] as readonly { resource: string; action: string }[],
  ADMIN: [
    { resource: 'catalog', action: 'read' },
    { resource: 'catalog', action: 'create' },
    { resource: 'catalog', action: 'update' },
    { resource: 'catalog', action: 'delete' },
    { resource: 'inventory', action: 'read' },
    { resource: 'inventory', action: 'update' },
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'update' },
    { resource: 'customers', action: 'read' },
    { resource: 'customers', action: 'update' },
    { resource: 'payments', action: 'read' },
    { resource: 'audit', action: 'read' },
    { resource: 'system', action: 'manage' },
  ],
  SUPER_ADMIN: PERMISSION_CATALOG,
} as const;

/**
 * Idempotent seed of default organization, permissions, and roles.
 */
export async function seedIdentityCatalog(
  prisma: PrismaClient,
): Promise<{ organizationId: string }> {
  const org = await prisma.organization.upsert({
    where: { slug: DEFAULT_ORG_SLUG },
    create: { name: 'Platform', slug: DEFAULT_ORG_SLUG },
    update: { name: 'Platform' },
  });

  const permissionIds = new Map<string, string>();
  for (const permission of PERMISSION_CATALOG) {
    const row = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: permission.resource,
          action: permission.action,
        },
      },
      create: {
        resource: permission.resource,
        action: permission.action,
      },
      update: {},
    });
    permissionIds.set(`${permission.resource}:${permission.action}`, row.id);
  }

  for (const [roleName, permissions] of Object.entries(ROLE_CATALOG)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName, description: `${roleName} role` },
      update: {},
    });

    for (const permission of permissions) {
      const permissionId = permissionIds.get(
        `${permission.resource}:${permission.action}`,
      );
      if (!permissionId) {
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        create: {
          roleId: role.id,
          permissionId,
        },
        update: {},
      });
    }
  }

  return { organizationId: org.id };
}

/**
 * Idempotent commerce defaults: DEFAULT location, optional tax/shipping stubs.
 */
export async function seedCommerceDefaults(
  prisma: PrismaClient,
  options?: {
    readonly defaultCurrency?: string | undefined;
    readonly taxDefaultRateBps?: number | undefined;
  },
): Promise<{ locationId: string }> {
  const currency = (options?.defaultCurrency ?? 'KES').toUpperCase();
  const location = await prisma.location.upsert({
    where: { code: DEFAULT_LOCATION_CODE },
    create: {
      code: DEFAULT_LOCATION_CODE,
      name: 'Default warehouse',
      active: true,
    },
    update: { name: 'Default warehouse', active: true },
  });

  await prisma.taxPolicy.upsert({
    where: { code: 'DEFAULT' },
    create: {
      code: 'DEFAULT',
      name: 'Default tax policy',
      defaultRateBps: options?.taxDefaultRateBps ?? 0,
      currency,
      active: true,
    },
    update: {
      currency,
      ...(options?.taxDefaultRateBps !== undefined
        ? { defaultRateBps: options.taxDefaultRateBps }
        : {}),
    },
  });

  await prisma.shippingMethodConfig.upsert({
    where: { code: 'FLAT' },
    create: {
      code: 'FLAT',
      name: 'Flat rate',
      currency,
      flatRateMinor: 0,
      active: true,
    },
    update: { currency, active: true },
  });

  return { locationId: location.id };
}
