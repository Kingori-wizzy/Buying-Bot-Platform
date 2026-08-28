/**
 * Staging-only digital shop catalog aligned with DIGITAL_SHOP_ROOT_CATEGORIES.
 * NEVER run against production.
 */
import type { PrismaClient } from '@prisma/client';

import {
  DEFAULT_LOCATION_CODE,
  seedCommerceDefaults,
  seedIdentityCatalog,
} from './seed.js';
import { seedDigitalShopTaxonomy } from './seed-digital-taxonomy.js';

export const STAGING_DIGITAL_CATALOG_NOTICE =
  'DEMO / STAGING DATA — synthetic digital platform listings for staging tests only.';

const STAGING_DIGITAL_PRODUCTS = [
  {
    slug: 'staging-ai-writer-platform',
    name: 'Staging AI Writer Platform',
    categorySlug: 'ai-platforms',
    shortDescription:
      'AI writing and content platform for business teams (staging sample).',
    listPriceMinor: 2_200_000,
    stock: 25,
    sku: 'STAGING-AI-WRITER-001',
    searchTerms: 'AI platform writing business content',
  },
  {
    slug: 'staging-payout-hub',
    name: 'Staging Payout Hub',
    categorySlug: 'payout-platforms',
    shortDescription:
      'Payout and disbursement platform for Kenyan businesses (staging sample).',
    listPriceMinor: 1_850_000,
    stock: 30,
    sku: 'STAGING-PAYOUT-001',
    searchTerms: 'payout platform business disbursement',
  },
  {
    slug: 'staging-academic-writer-pro',
    name: 'Staging Academic Writer Pro',
    categorySlug: 'academic-writing-accounts',
    shortDescription:
      'Academic writing platform account for research teams (staging sample).',
    listPriceMinor: 2_800_000,
    stock: 15,
    sku: 'STAGING-ACAD-001',
    searchTerms: 'academic writing platform account business',
  },
  {
    slug: 'staging-survey-panel',
    name: 'Staging Survey Panel',
    categorySlug: 'survey-platforms',
    shortDescription:
      'Survey and feedback platform for customer research (staging sample).',
    listPriceMinor: 1_200_000,
    stock: 40,
    sku: 'STAGING-SURVEY-001',
    searchTerms: 'survey platform feedback business research',
  },
  {
    slug: 'staging-modsuite',
    name: 'Staging ModSuite',
    categorySlug: 'chat-moderation-platforms',
    shortDescription:
      'Chat moderation platform for community teams (staging sample).',
    listPriceMinor: 3_500_000,
    stock: 10,
    sku: 'STAGING-MOD-001',
    searchTerms: 'chat moderation platform community business',
  },
] as const;

export async function seedStagingDigitalCatalog(
  prisma: PrismaClient,
): Promise<{ productIds: string[]; offerIds: string[] }> {
  const { organizationId } = await seedIdentityCatalog(prisma);
  await seedCommerceDefaults(prisma, { defaultCurrency: 'KES' });
  await seedDigitalShopTaxonomy(prisma);

  const location = await prisma.location.findUniqueOrThrow({
    where: { code: DEFAULT_LOCATION_CODE },
  });

  const categories = await prisma.category.findMany({
    where: { deletedAt: null, active: true },
    select: { id: true, slug: true },
  });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const productIds: string[] = [];
  const offerIds: string[] = [];

  for (const item of STAGING_DIGITAL_PRODUCTS) {
    const categoryId = categoryBySlug.get(item.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category slug: ${item.categorySlug}`);
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      create: {
        name: `${item.name} (${STAGING_DIGITAL_CATALOG_NOTICE})`,
        slug: item.slug,
        shortDescription: item.shortDescription,
        description: `${item.shortDescription} ${STAGING_DIGITAL_CATALOG_NOTICE}`,
        status: 'ACTIVE',
        primaryCategoryId: categoryId,
        ...({ contentOrigin: 'DEMO' } as Record<string, unknown>),
      } as never,
      update: {
        name: `${item.name} (${STAGING_DIGITAL_CATALOG_NOTICE})`,
        shortDescription: item.shortDescription,
        description: `${item.shortDescription} ${STAGING_DIGITAL_CATALOG_NOTICE}`,
        status: 'ACTIVE',
        deletedAt: null,
        primaryCategoryId: categoryId,
        ...({ contentOrigin: 'DEMO' } as Record<string, unknown>),
      } as never,
    });
    productIds.push(product.id);

    let variant = await prisma.variant.findFirst({
      where: { productId: product.id, deletedAt: null },
    });
    variant ??= await prisma.variant.create({
      data: { productId: product.id, name: 'Default' },
    });

    let sku = await prisma.sku.findUnique({ where: { variantId: variant.id } });
    sku ??= await prisma.sku.create({
      data: {
        variantId: variant.id,
        internalSku: item.sku,
        sellerSku: item.sku,
      },
    });

    let offer = await prisma.offer.findFirst({
      where: { skuId: sku.id, organizationId, deletedAt: null },
    });
    if (!offer) {
      offer = await prisma.offer.create({
        data: {
          organizationId,
          skuId: sku.id,
          listPriceMinor: item.listPriceMinor,
          currency: 'KES',
          taxInclusive: true,
          active: true,
        },
      });
    } else {
      offer = await prisma.offer.update({
        where: { id: offer.id },
        data: {
          listPriceMinor: item.listPriceMinor,
          currency: 'KES',
          active: true,
        },
      });
    }
    offerIds.push(offer.id);

    await prisma.inventoryBalance.upsert({
      where: {
        skuId_locationId: { skuId: sku.id, locationId: location.id },
      },
      create: {
        skuId: sku.id,
        locationId: location.id,
        onHand: item.stock,
        reserved: 0,
      },
      update: { onHand: item.stock },
    });

    const searchDocument = [
      item.name,
      item.shortDescription,
      item.searchTerms,
      item.categorySlug.replace(/-/g, ' '),
      item.sku,
      STAGING_DIGITAL_CATALOG_NOTICE,
    ].join(' ');

    await prisma.productSearchDocument.upsert({
      where: { productId: product.id },
      create: { productId: product.id, document: searchDocument },
      update: { document: searchDocument },
    });
  }

  return { productIds, offerIds };
}
