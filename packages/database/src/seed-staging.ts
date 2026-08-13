/**
 * Staging-only catalog sample for smoke tests.
 * NEVER run against production. Call via seed-staging-cli / scripts/staging/seed.sh.
 */
import type { PrismaClient } from '@prisma/client';

import {
  DEFAULT_LOCATION_CODE,
  seedCommerceDefaults,
  seedIdentityCatalog,
} from './seed.js';

export const STAGING_PRODUCT_SLUG = 'staging-smoke-sample';

export async function seedStagingCatalog(
  prisma: PrismaClient,
): Promise<{ productId: string; skuId: string; offerId: string }> {
  const { organizationId } = await seedIdentityCatalog(prisma);
  await seedCommerceDefaults(prisma, { defaultCurrency: 'KES' });

  const location = await prisma.location.findUniqueOrThrow({
    where: { code: DEFAULT_LOCATION_CODE },
  });

  const product = await prisma.product.upsert({
    where: { slug: STAGING_PRODUCT_SLUG },
    create: {
      name: 'Staging Smoke Sample',
      slug: STAGING_PRODUCT_SLUG,
      shortDescription: 'ACTIVE sample product for staging smoke only',
      description: 'Do not use in production catalogs.',
      status: 'ACTIVE',
    },
    update: {
      name: 'Staging Smoke Sample',
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  let variant = await prisma.variant.findFirst({
    where: { productId: product.id, deletedAt: null },
  });
  variant ??= await prisma.variant.create({
    data: {
      productId: product.id,
      name: 'Default',
      optionJson: { size: 'one' },
    },
  });

  let sku = await prisma.sku.findUnique({ where: { variantId: variant.id } });
  sku ??= await prisma.sku.create({
    data: {
      variantId: variant.id,
      internalSku: 'STAGING-SMOKE-001',
      sellerSku: 'STAGING-SMOKE-001',
    },
  });

  let offer = await prisma.offer.findFirst({
    where: {
      skuId: sku.id,
      organizationId,
      deletedAt: null,
    },
  });
  if (!offer) {
    offer = await prisma.offer.create({
      data: {
        organizationId,
        skuId: sku.id,
        listPriceMinor: 19900,
        currency: 'KES',
        taxInclusive: true,
        active: true,
      },
    });
  } else {
    offer = await prisma.offer.update({
      where: { id: offer.id },
      data: { active: true, listPriceMinor: 19900, currency: 'KES' },
    });
  }

  await prisma.inventoryBalance.upsert({
    where: {
      skuId_locationId: { skuId: sku.id, locationId: location.id },
    },
    create: {
      skuId: sku.id,
      locationId: location.id,
      onHand: 100,
      reserved: 0,
    },
    update: { onHand: 100 },
  });

  return { productId: product.id, skuId: sku.id, offerId: offer.id };
}
