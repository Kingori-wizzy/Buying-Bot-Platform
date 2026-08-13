import { randomUUID } from 'node:crypto';

import {
  createPrismaClient,
  DEFAULT_ORG_SLUG,
  hashOpaqueToken,
  type PrismaDatabaseClient,
  seedCommerceDefaults,
  seedIdentityCatalog,
} from '@buying-bot/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PricingService } from '../pricing/pricing.service.js';
import { CartService } from './cart.service.js';

const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('cart merge', () => {
  const prisma = createPrismaClient(databaseUrl);
  const dbClient = { prisma } as PrismaDatabaseClient;

  const pricing = new PricingService(dbClient, {
    DEFAULT_CURRENCY: 'KES',
  } as never);
  const carts = new CartService(dbClient, pricing, {
    DEFAULT_CURRENCY: 'KES',
    GUEST_CART_COOKIE: 'bb_guest_cart',
    COOKIE_SECURE: false,
  } as never);

  let offerId = '';
  let skuId = '';
  let userId = '';

  beforeAll(async () => {
    await seedIdentityCatalog(prisma);
    await seedCommerceDefaults(prisma, { defaultCurrency: 'KES' });
    const org = await prisma.organization.findUniqueOrThrow({
      where: { slug: DEFAULT_ORG_SLUG },
    });
    const user = await prisma.user.create({
      data: {
        email: `cart-${randomUUID()}@example.com`,
        emailNormalized: `cart-${randomUUID()}@example.com`,
        status: 'ACTIVE',
      },
    });
    userId = user.id;

    const product = await prisma.product.create({
      data: {
        name: `Cart Product ${randomUUID()}`,
        slug: `cart-${randomUUID()}`,
        status: 'ACTIVE',
        variants: {
          create: {
            name: 'Default',
            sku: {
              create: { internalSku: `CART-${randomUUID().slice(0, 8)}` },
            },
          },
        },
      },
      include: { variants: { include: { sku: true } } },
    });
    skuId = product.variants[0]?.sku?.id ?? '';
    const offer = await prisma.offer.create({
      data: {
        organizationId: org.id,
        skuId,
        listPriceMinor: 1000,
        currency: 'KES',
        active: true,
      },
    });
    offerId = offer.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('merges guest lines into authenticated cart and converts guest', async () => {
    const guestToken = randomUUID();
    const guestHash = hashOpaqueToken(guestToken);
    const guestCart = await carts.getOrCreateCart({
      guestTokenHash: guestHash,
    });
    await carts.addLine(guestCart.id, { offerId, quantity: 2 });

    const userCart = await carts.getOrCreateCart({ userId });
    await carts.addLine(userCart.id, { offerId, quantity: 1 });

    const merge = await carts.mergeOnLogin({
      userId,
      guestTokenHash: guestHash,
    });
    expect(merge.merged).toBe(true);
    expect(merge.cartId).toBe(userCart.id);

    const view = await carts.getCartView(userCart.id);
    const line = view.lines.find((l) => l.offerId === offerId);
    expect(line?.quantity).toBe(3);

    const guest = await prisma.cart.findUnique({ where: { id: guestCart.id } });
    expect(guest?.status).toBe('CONVERTED');
  });
});
