import { createHmac, randomUUID } from 'node:crypto';

import {
  confirmPaymentForOrder,
  createPrismaClient,
  type PrismaDatabaseClient,
  seedCommerceDefaults,
  seedIdentityCatalog,
} from '@buying-bot/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PaymentsService } from './payments.service.js';

const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('mpesa webhook idempotency', () => {
  const prisma = createPrismaClient(databaseUrl);
  const dbClient = { prisma } as PrismaDatabaseClient;

  const secret = 'test-webhook-secret-at-least-32-chars!!';
  const payments = new PaymentsService(dbClient, {
    NODE_ENV: 'test',
    MPESA_WEBHOOK_SECRET: secret,
    MPESA_ENV: 'sandbox',
    WEBHOOK_REPLAY_WINDOW_SECONDS: 300,
    DEFAULT_CURRENCY: 'KES',
  } as never);

  let orderId = '';
  let locationId = '';
  let skuId = '';

  beforeAll(async () => {
    await seedIdentityCatalog(prisma);
    const commerce = await seedCommerceDefaults(prisma, {
      defaultCurrency: 'KES',
    });
    locationId = commerce.locationId;

    const product = await prisma.product.create({
      data: {
        name: `Pay Product ${randomUUID()}`,
        slug: `pay-${randomUUID()}`,
        status: 'ACTIVE',
        variants: {
          create: {
            name: 'Default',
            sku: {
              create: { internalSku: `PAY-${randomUUID().slice(0, 8)}` },
            },
          },
        },
      },
      include: { variants: { include: { sku: true } } },
    });
    skuId = product.variants[0]?.sku?.id ?? '';
    expect(skuId).toBeTruthy();

    await prisma.inventoryBalance.create({
      data: { skuId, locationId, onHand: 10, reserved: 1, version: 0 },
    });

    const reservation = await prisma.reservation.create({
      data: {
        skuId,
        locationId,
        quantity: 1,
        status: 'HELD',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const order = await prisma.order.create({
      data: {
        status: 'PENDING_PAYMENT',
        currency: 'KES',
        payableMinor: 1000,
        reservationId: reservation.id,
      },
    });
    orderId = order.id;

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { orderId },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId,
        provider: 'mpesa',
        status: 'INITIATED',
        amountMinor: 1000,
        currency: 'KES',
        msisdnE164: '+254712345678',
      },
    });
    await prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        status: 'INITIATED',
        providerCheckoutId: 'ws_test_checkout',
        providerReference: 'mpesa_ref_test',
        initiatedAt: new Date(),
      },
    });
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('accepts duplicate webhook event ids as idempotent no-ops', async () => {
    const eventId = `evt-${randomUUID()}`;
    const providerTxnId = `txn-${randomUUID()}`;
    const payload = {
      eventId,
      orderId,
      providerTxnId,
      amountMinor: 1000,
      currency: 'KES',
      Body: {
        stkCallback: {
          CheckoutRequestID: 'ws_test_checkout',
          ResultCode: 0,
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 10 },
              { Name: 'MpesaReceiptNumber', Value: providerTxnId },
            ],
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    const first = await payments.handleMpesaWebhook({
      rawBody,
      signature,
      timestamp,
      payload,
    });
    expect(first.accepted).toBe(true);

    await payments.applyMpesaReceipt(eventId, payload);

    const second = await payments.handleMpesaWebhook({
      rawBody,
      signature,
      timestamp,
      payload,
    });
    expect(second.accepted).toBe(true);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe('PAID');

    const again = await confirmPaymentForOrder(prisma, {
      orderId,
      providerTxnId,
      amountMinor: 1000,
      currency: 'KES',
    });
    expect(again.alreadyProcessed).toBe(true);
  }, 30_000);
});
