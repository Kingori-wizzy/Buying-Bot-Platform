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

describe.skipIf(!databaseUrl)('escrow webhook idempotency', () => {
  const prisma = createPrismaClient(databaseUrl);
  const dbClient = { prisma } as PrismaDatabaseClient;

  const secret = 'test-escrow-webhook-secret-at-least-32!!';
  const payments = new PaymentsService(dbClient, {
    NODE_ENV: 'test',
    PAYMENT_PROVIDER: 'escrow',
    ESCROW_WEBHOOK_SECRET: secret,
    ESCROW_ALLOW_TEST_DOUBLE: true,
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
        name: `Escrow Product ${randomUUID()}`,
        slug: `escrow-${randomUUID()}`,
        status: 'DRAFT',
        variants: {
          create: {
            name: 'Default',
            sku: {
              create: { internalSku: `ESC-${randomUUID().slice(0, 8)}` },
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
        expiresAt: new Date(Date.now() + 86_400_000),
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
        provider: 'escrow',
        status: 'INITIATED',
        amountMinor: 1000,
        currency: 'KES',
      },
    });
    await prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        status: 'INITIATED',
        providerCheckoutId: 'esc_test_checkout',
        providerReference: 'escrow_ref_test',
        initiatedAt: new Date(),
      },
    });
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function sign(rawBody: string): { signature: string; timestamp: string } {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    return { signature, timestamp };
  }

  it('accepts duplicate escrow webhook event ids as idempotent no-ops', async () => {
    const eventId = `evt-${randomUUID()}`;
    const providerTxnId = `txn-${randomUUID()}`;
    const payload = {
      eventId,
      orderId,
      providerTxnId,
      amountMinor: 1000,
      currency: 'KES',
      status: 'paid',
    };
    const rawBody = JSON.stringify(payload);
    const { signature, timestamp } = sign(rawBody);

    const first = await payments.handleEscrowWebhook({
      rawBody,
      signature,
      timestamp,
      payload,
    });
    expect(first.accepted).toBe(true);

    await payments.applyEscrowReceipt(eventId, payload);

    const second = await payments.handleEscrowWebhook({
      rawBody,
      signature,
      timestamp,
      payload,
    });
    expect(second.accepted).toBe(true);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe('PROCESSING');

    const again = await confirmPaymentForOrder(prisma, {
      orderId,
      providerTxnId,
      amountMinor: 1000,
      currency: 'KES',
    });
    expect(again.alreadyProcessed).toBe(true);
  }, 30_000);

  it('rejects invalid escrow signature', async () => {
    const payload = {
      eventId: `evt-bad-${randomUUID()}`,
      orderId,
      status: 'paid',
      amountMinor: 1000,
      currency: 'KES',
    };
    const rawBody = JSON.stringify(payload);
    await expect(
      payments.handleEscrowWebhook({
        rawBody,
        signature: 'deadbeef',
        timestamp: String(Math.floor(Date.now() / 1000)),
        payload,
      }),
    ).rejects.toThrow();
  });

  it('does not mark order PAID on failed escrow status', async () => {
    const pending = await prisma.order.create({
      data: {
        status: 'PENDING_PAYMENT',
        currency: 'KES',
        payableMinor: 1000,
      },
    });
    await prisma.payment.create({
      data: {
        orderId: pending.id,
        provider: 'escrow',
        status: 'INITIATED',
        amountMinor: 1000,
        currency: 'KES',
      },
    });
    const eventId = `evt-fail-${randomUUID()}`;
    const payload = {
      eventId,
      orderId: pending.id,
      providerTxnId: `txn-fail-${randomUUID()}`,
      amountMinor: 1000,
      currency: 'KES',
      status: 'failed',
    };
    const rawBody = JSON.stringify(payload);
    const { signature, timestamp } = sign(rawBody);

    const accepted = await payments.handleEscrowWebhook({
      rawBody,
      signature,
      timestamp,
      payload,
    });
    expect(accepted.accepted).toBe(true);
    await payments.applyEscrowReceipt(eventId, payload);
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: pending.id },
    });
    expect(order.status).toBe('PENDING_PAYMENT');
  }, 30_000);

  it('rejects amount mismatch on a pending order', async () => {
    const pending = await prisma.order.create({
      data: {
        status: 'PENDING_PAYMENT',
        currency: 'KES',
        payableMinor: 1000,
      },
    });
    await prisma.payment.create({
      data: {
        orderId: pending.id,
        provider: 'escrow',
        status: 'INITIATED',
        amountMinor: 1000,
        currency: 'KES',
      },
    });
    await expect(
      confirmPaymentForOrder(prisma, {
        orderId: pending.id,
        providerTxnId: `mismatch-${randomUUID()}`,
        amountMinor: 9999,
        currency: 'KES',
      }),
    ).rejects.toThrow(/mismatch/i);
    const stillPending = await prisma.order.findUniqueOrThrow({
      where: { id: pending.id },
    });
    expect(stillPending.status).toBe('PENDING_PAYMENT');
  }, 30_000);

  it('holds late payment after reservation expiry', async () => {
    const product = await prisma.product.create({
      data: {
        name: `Escrow Late ${randomUUID()}`,
        slug: `escrow-late-${randomUUID()}`,
        status: 'DRAFT',
        variants: {
          create: {
            name: 'Default',
            sku: {
              create: { internalSku: `ESCL-${randomUUID().slice(0, 8)}` },
            },
          },
        },
      },
      include: { variants: { include: { sku: true } } },
    });
    const lateSkuId = product.variants[0]?.sku?.id ?? '';
    await prisma.inventoryBalance.create({
      data: {
        skuId: lateSkuId,
        locationId,
        onHand: 3,
        reserved: 1,
        version: 0,
      },
    });
    const reservation = await prisma.reservation.create({
      data: {
        skuId: lateSkuId,
        locationId,
        quantity: 1,
        status: 'EXPIRED',
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const lateOrder = await prisma.order.create({
      data: {
        status: 'PENDING_PAYMENT',
        currency: 'KES',
        payableMinor: 500,
        reservationId: reservation.id,
      },
    });
    await prisma.payment.create({
      data: {
        orderId: lateOrder.id,
        provider: 'escrow',
        status: 'INITIATED',
        amountMinor: 500,
        currency: 'KES',
      },
    });

    const result = await confirmPaymentForOrder(prisma, {
      orderId: lateOrder.id,
      providerTxnId: `late-${randomUUID()}`,
      amountMinor: 500,
      currency: 'KES',
    });
    expect(result.alreadyProcessed).toBe(false);
    const held = await prisma.order.findUniqueOrThrow({
      where: { id: lateOrder.id },
    });
    expect(held.status).toBe('RECONCILIATION_HOLD');
    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: { skuId_locationId: { skuId: lateSkuId, locationId } },
    });
    expect(balance.onHand).toBe(3);
  }, 30_000);

  it('mpesa webhook endpoint is deferred and does not settle orders', async () => {
    const pending = await prisma.order.create({
      data: {
        status: 'PENDING_PAYMENT',
        currency: 'KES',
        payableMinor: 1000,
      },
    });
    const result = await payments.handleMpesaWebhook({
      rawBody: '{}',
      payload: { orderId: pending.id },
    });
    expect(result.deferred).toBe(true);
    expect(result.accepted).toBe(false);
    const still = await prisma.order.findUniqueOrThrow({
      where: { id: pending.id },
    });
    expect(still.status).toBe('PENDING_PAYMENT');
  });
});
