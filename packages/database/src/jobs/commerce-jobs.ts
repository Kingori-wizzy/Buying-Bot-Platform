/**
 * Shared commerce job runners used by apps/worker (and callable from API tests).
 * No payment provider HTTP inside DB transactions.
 */

import type { PrismaClient } from '@prisma/client';

export async function expireHeldReservations(
  prisma: PrismaClient,
  now = new Date(),
): Promise<number> {
  const expired = await prisma.reservation.findMany({
    where: { status: 'HELD', expiresAt: { lte: now } },
    take: 100,
  });

  let count = 0;
  for (const reservation of expired) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.reservation.findUnique({
        where: { id: reservation.id },
      });
      if (current?.status !== 'HELD') {
        return;
      }

      const balance = await tx.inventoryBalance.findUnique({
        where: {
          skuId_locationId: {
            skuId: current.skuId,
            locationId: current.locationId,
          },
        },
      });
      if (!balance) {
        await tx.reservation.update({
          where: { id: current.id },
          data: { status: 'EXPIRED' },
        });
        count += 1;
        return;
      }

      const updated = await tx.inventoryBalance.updateMany({
        where: { id: balance.id, version: balance.version },
        data: {
          reserved: { decrement: current.quantity },
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new Error('Optimistic lock failed while expiring reservation');
      }

      await tx.inventoryMovement.create({
        data: {
          skuId: current.skuId,
          locationId: current.locationId,
          type: 'RELEASE',
          quantity: current.quantity,
          reason: 'reservation_expired',
          idempotencyKey: `expire:${current.id}`,
        },
      });

      await tx.reservation.update({
        where: { id: current.id },
        data: { status: 'EXPIRED' },
      });
      count += 1;
    });
  }
  return count;
}

export type OutboxHandler = (type: string, payload: unknown) => Promise<void>;

/**
 * Publishes messages currently eligible for delivery. FAILED rows are kept
 * separate so operators can requeue them with requeueFailedOutbox.
 */
export async function publishPendingOutbox(
  prisma: PrismaClient,
  handler: OutboxHandler,
  limit = 20,
): Promise<number> {
  const messages = await prisma.outboxMessage.findMany({
    where: {
      status: 'PENDING',
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let published = 0;
  for (const message of messages) {
    try {
      await handler(message.type, message.payloadJson);
      await prisma.outboxMessage.update({
        where: { id: message.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      published += 1;
    } catch (error: unknown) {
      await prisma.outboxMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          attempts: { increment: 1 },
          lastError:
            error instanceof Error ? error.message.slice(0, 500) : 'unknown',
          availableAt: new Date(Date.now() + 30_000),
        },
      });
    }
  }
  return published;
}

/**
 * Confirm payment + commit reservation + mark order PAID (idempotent).
 */
export async function confirmPaymentForOrder(
  prisma: PrismaClient,
  input: {
    readonly orderId: string;
    readonly providerTxnId: string;
    readonly amountMinor: number;
    readonly currency: string;
    readonly rawPayload?: unknown;
  },
): Promise<{ alreadyProcessed: boolean }> {
  return prisma.$transaction(async (tx) => {
    const existingTxn = await tx.paymentTransaction.findUnique({
      where: { providerTxnId: input.providerTxnId },
    });
    if (existingTxn?.status === 'CONFIRMED') {
      return { alreadyProcessed: true };
    }

    const order = await tx.order.findUnique({ where: { id: input.orderId } });
    if (!order) {
      throw new Error('Order not found');
    }
    if (order.status === 'PAID' || order.status === 'RECONCILIATION_HOLD') {
      return { alreadyProcessed: true };
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new Error(
        `Cannot confirm payment for order status ${order.status}`,
      );
    }

    const payment = await tx.payment.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) {
      throw new Error('Payment stub missing');
    }

    if (
      payment.amountMinor !== input.amountMinor ||
      payment.currency !== input.currency
    ) {
      throw new Error('Payment amount/currency mismatch');
    }

    await tx.paymentTransaction.upsert({
      where: { providerTxnId: input.providerTxnId },
      create: {
        paymentId: payment.id,
        type: 'CHARGE',
        status: 'CONFIRMED',
        amountMinor: input.amountMinor,
        currency: input.currency,
        providerTxnId: input.providerTxnId,
        rawPayloadJson: input.rawPayload as never,
      },
      update: {
        status: 'CONFIRMED',
        rawPayloadJson: input.rawPayload as never,
      },
    });

    const attempt = await tx.paymentAttempt.findFirst({
      where: { paymentId: payment.id },
      orderBy: { createdAt: 'desc' },
    });
    if (attempt) {
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'CONFIRMED' },
    });

    let nextStatus: 'PAID' | 'RECONCILIATION_HOLD' = 'PAID';
    if (order.reservationId) {
      const reservation = await tx.reservation.findUnique({
        where: { id: order.reservationId },
      });
      if (reservation?.status === 'HELD') {
        const balance = await tx.inventoryBalance.findUnique({
          where: {
            skuId_locationId: {
              skuId: reservation.skuId,
              locationId: reservation.locationId,
            },
          },
        });
        if (!balance) {
          throw new Error('Inventory balance missing for reservation');
        }
        const locked = await tx.inventoryBalance.updateMany({
          where: { id: balance.id, version: balance.version },
          data: {
            onHand: { decrement: reservation.quantity },
            reserved: { decrement: reservation.quantity },
            version: { increment: 1 },
          },
        });
        if (locked.count !== 1) {
          throw new Error('Optimistic lock failed on sale commit');
        }
        await tx.inventoryMovement.create({
          data: {
            skuId: reservation.skuId,
            locationId: reservation.locationId,
            type: 'SALE',
            quantity: reservation.quantity,
            reason: 'payment_confirmed',
            idempotencyKey: `sale:${reservation.id}`,
            correlationId: order.id,
          },
        });
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'COMMITTED' },
        });
      } else if (reservation?.status === 'COMMITTED') {
        nextStatus = 'PAID';
      } else {
        nextStatus = 'RECONCILIATION_HOLD';
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: nextStatus },
    });

    return { alreadyProcessed: false };
  });
}
