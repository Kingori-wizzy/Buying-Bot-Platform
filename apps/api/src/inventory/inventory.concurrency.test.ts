import { randomUUID } from 'node:crypto';

import {
  createPrismaClient,
  type PrismaDatabaseClient,
  seedCommerceDefaults,
  seedIdentityCatalog,
} from '@buying-bot/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { InventoryService } from './inventory.service.js';

const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('inventory concurrency', () => {
  const prisma = createPrismaClient(databaseUrl);
  const dbClient = { prisma } as PrismaDatabaseClient;
  const service = new InventoryService(dbClient);

  let skuId = '';
  let locationId = '';

  beforeAll(async () => {
    await seedIdentityCatalog(prisma);
    const commerce = await seedCommerceDefaults(prisma, {
      defaultCurrency: 'KES',
    });
    locationId = commerce.locationId;

    const product = await prisma.product.create({
      data: {
        name: `Inv Product ${randomUUID()}`,
        slug: `inv-${randomUUID()}`,
        status: 'ACTIVE',
        variants: {
          create: {
            name: 'Default',
            sku: {
              create: { internalSku: `INV-${randomUUID().slice(0, 8)}` },
            },
          },
        },
      },
      include: { variants: { include: { sku: true } } },
    });
    skuId = product.variants[0]?.sku?.id ?? '';
    expect(skuId).toBeTruthy();

    await service.adjust({
      skuId,
      locationId,
      quantityDelta: 5,
      reason: 'seed',
      idempotencyKey: `seed-${skuId}`,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects concurrent oversell via optimistic locking / available check', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const results = await Promise.allSettled([
      service.reserve({
        skuId,
        locationId,
        quantity: 4,
        expiresAt,
        idempotencyKey: `r1-${randomUUID()}`,
      }),
      service.reserve({
        skuId,
        locationId,
        quantity: 4,
        expiresAt,
        idempotencyKey: `r2-${randomUUID()}`,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const balance = await prisma.inventoryBalance.findUnique({
      where: { skuId_locationId: { skuId, locationId } },
    });
    expect(balance).toBeTruthy();
    if (!balance) {
      return;
    }
    expect(balance.onHand).toBeGreaterThanOrEqual(balance.reserved);
    expect(balance.onHand - balance.reserved).toBeLessThanOrEqual(1);
  });

  it('adjust is idempotent on same key', async () => {
    const key = `adj-${randomUUID()}`;
    const first = await service.adjust({
      skuId,
      locationId,
      quantityDelta: 1,
      reason: 'idem',
      idempotencyKey: key,
    });
    const second = await service.adjust({
      skuId,
      locationId,
      quantityDelta: 1,
      reason: 'idem',
      idempotencyKey: key,
    });
    expect(first).toMatchObject({ idempotent: false });
    expect(second).toMatchObject({ idempotent: true });
  });
});
