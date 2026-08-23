/**
 * DEMO / STAGING synthetic catalog (explicitly not live market data).
 * NEVER run against production. Prices are synthetic placeholders.
 */
import type { PrismaClient } from '@prisma/client';

import {
  DEFAULT_LOCATION_CODE,
  seedCommerceDefaults,
  seedIdentityCatalog,
} from './seed.js';

export const DEMO_CATALOG_NOTICE =
  'DEMO / STAGING DATA — synthetic products and prices; not live marketplace data.';

const DEMO_PRODUCTS: readonly {
  slug: string;
  name: string;
  category: string;
  brand: string;
  listPriceMinor: number;
  stock: number;
  sku: string;
}[] = [
  {
    slug: 'demo-laptop-14',
    name: 'Demo 14" Business Laptop',
    category: 'Laptops',
    brand: 'DemoTech',
    listPriceMinor: 89_999_00,
    stock: 12,
    sku: 'DEMO-LAPTOP-14',
  },
  {
    slug: 'demo-smartphone-6',
    name: 'Demo Smartphone 6.5"',
    category: 'Smartphones',
    brand: 'DemoMobile',
    listPriceMinor: 45_000_00,
    stock: 25,
    sku: 'DEMO-PHONE-65',
  },
  {
    slug: 'demo-tv-55',
    name: 'Demo 55" LED Television',
    category: 'Televisions',
    brand: 'DemoVision',
    listPriceMinor: 62_500_00,
    stock: 8,
    sku: 'DEMO-TV-55',
  },
  {
    slug: 'demo-headphones-anc',
    name: 'Demo ANC Headphones',
    category: 'Headphones',
    brand: 'DemoAudio',
    listPriceMinor: 12_999_00,
    stock: 40,
    sku: 'DEMO-HP-ANC',
  },
  {
    slug: 'demo-usb-c-hub',
    name: 'Demo USB-C Hub 7-in-1',
    category: 'Accessories',
    brand: 'DemoTech',
    listPriceMinor: 4_500_00,
    stock: 100,
    sku: 'DEMO-HUB-7',
  },
  {
    slug: 'demo-blender-pro',
    name: 'Demo Kitchen Blender Pro',
    category: 'Home Appliances',
    brand: 'DemoHome',
    listPriceMinor: 9_800_00,
    stock: 18,
    sku: 'DEMO-BLEND-PRO',
  },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Seeds a clearly labeled demo catalog for staging/demo environments.
 */
export async function seedDemoCatalog(prisma: PrismaClient): Promise<{
  productIds: string[];
  notice: string;
}> {
  const { organizationId } = await seedIdentityCatalog(prisma);
  await seedCommerceDefaults(prisma, { defaultCurrency: 'KES' });
  const location = await prisma.location.findUniqueOrThrow({
    where: { code: DEFAULT_LOCATION_CODE },
  });

  const productIds: string[] = [];

  for (const item of DEMO_PRODUCTS) {
    const brandSlug = slugify(item.brand);
    const brand = await prisma.brand.upsert({
      where: { slug: brandSlug },
      create: { name: item.brand, slug: brandSlug },
      update: { name: item.brand },
    });
    const categorySlug = slugify(item.category);
    const category = await prisma.category.upsert({
      where: { slug: categorySlug },
      create: {
        name: item.category,
        slug: categorySlug,
        active: true,
      },
      update: { name: item.category, active: true },
    });

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      create: {
        name: `${item.name} (${DEMO_CATALOG_NOTICE})`,
        slug: item.slug,
        shortDescription: DEMO_CATALOG_NOTICE,
        description: `${item.name}. ${DEMO_CATALOG_NOTICE}`,
        status: 'ACTIVE',
        brandId: brand.id,
        primaryCategoryId: category.id,
        ...({ contentOrigin: 'DEMO' } as Record<string, unknown>),
      } as never,
      update: {
        name: `${item.name} (${DEMO_CATALOG_NOTICE})`,
        status: 'ACTIVE',
        deletedAt: null,
        brandId: brand.id,
        primaryCategoryId: category.id,
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

    const offer = await prisma.offer.findFirst({
      where: { skuId: sku.id, organizationId, deletedAt: null },
    });
    if (!offer) {
      await prisma.offer.create({
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
      await prisma.offer.update({
        where: { id: offer.id },
        data: {
          listPriceMinor: item.listPriceMinor,
          currency: 'KES',
          active: true,
        },
      });
    }

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

    await prisma.productSearchDocument.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        document: [item.name, item.brand, item.category, item.sku, DEMO_CATALOG_NOTICE]
          .join(' '),
      },
      update: {
        document: [item.name, item.brand, item.category, item.sku, DEMO_CATALOG_NOTICE]
          .join(' '),
      },
    });
  }

  return { productIds, notice: DEMO_CATALOG_NOTICE };
}
