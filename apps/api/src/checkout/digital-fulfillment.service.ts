import type { PrismaDatabaseClient } from '@buying-bot/database';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DATABASE_CLIENT } from '../config/tokens.js';

/**
 * Digital fulfillment after verified payment.
 * Never logs or returns raw credentials/passwords.
 */
@Injectable()
export class DigitalFulfillmentService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
  ) {}

  private prisma() {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    return this.database.prisma;
  }

  /**
   * Create PENDING fulfillment rows when an order is paid.
   * Delivery content stays empty until an authorized admin/process marks READY.
   */
  async enqueueForPaidOrder(orderId: string): Promise<{ created: number }> {
    const prisma = this.prisma();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, digitalFulfillments: true },
    });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }
    if (order.status !== 'PAID' && order.status !== 'PROCESSING') {
      throw new BadRequestException({
        code: 'ORDER_NOT_PAID',
        message: 'Digital fulfillment requires a paid order',
      });
    }
    if (order.digitalFulfillments.length > 0) {
      return { created: 0 };
    }

    let created = 0;
    for (const item of order.items) {
      const offer = await prisma.offer.findFirst({
        where: { id: item.offerId, deletedAt: null },
      });
      const method = offer?.deliveryMethod ?? 'MANUAL';
      if (method === 'NONE') {
        continue;
      }
      await prisma.digitalFulfillment.create({
        data: {
          orderId,
          orderItemId: item.id,
          deliveryMethod: method,
          status: 'PENDING',
          deliveryPayloadJson: {
            productName: item.productName,
            skuCode: item.skuCode,
            note: 'Awaiting authorized digital delivery — no credentials stored',
          },
        },
      });
      created += 1;
    }

    if (created > 0 && order.status === 'PAID') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PROCESSING' },
      });
    }
    return { created };
  }

  async listForOrder(
    orderId: string,
    options?: { readonly includePayload?: boolean },
  ): Promise<unknown[]> {
    const rows = await this.prisma().digitalFulfillment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      orderItemId: row.orderItemId,
      deliveryMethod: row.deliveryMethod,
      status: row.status,
      deliveredAt: row.deliveredAt,
      createdAt: row.createdAt,
      ...(options?.includePayload &&
      (row.status === 'READY' || row.status === 'DELIVERED')
        ? { deliveryPayload: row.deliveryPayloadJson }
        : {}),
    }));
  }

  async markReady(
    fulfillmentId: string,
    safePayload: Record<string, unknown>,
  ): Promise<unknown> {
    // Reject obvious secret-shaped keys from being stored in cleartext payloads.
    for (const key of Object.keys(safePayload)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('api_key') ||
        lower.includes('apikey')
      ) {
        throw new BadRequestException({
          code: 'SENSITIVE_PAYLOAD_REJECTED',
          message:
            'Fulfillment payload must not include password/secret/token fields',
        });
      }
    }
    const prisma = this.prisma();
    const row = await prisma.digitalFulfillment.findUnique({
      where: { id: fulfillmentId },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'FULFILLMENT_NOT_FOUND',
        message: 'Fulfillment not found',
      });
    }
    const updated = await prisma.digitalFulfillment.update({
      where: { id: fulfillmentId },
      data: {
        status: 'READY',
        deliveryPayloadJson: JSON.parse(JSON.stringify(safePayload)) as object,
      },
    });
    await prisma.order.update({
      where: { id: row.orderId },
      data: { status: 'FULFILLING' },
    });
    return {
      id: updated.id,
      status: updated.status,
      deliveryMethod: updated.deliveryMethod,
    };
  }

  async markDelivered(fulfillmentId: string): Promise<unknown> {
    const prisma = this.prisma();
    const row = await prisma.digitalFulfillment.findUnique({
      where: { id: fulfillmentId },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'FULFILLMENT_NOT_FOUND',
        message: 'Fulfillment not found',
      });
    }
    const updated = await prisma.digitalFulfillment.update({
      where: { id: fulfillmentId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });
    const pending = await prisma.digitalFulfillment.count({
      where: {
        orderId: row.orderId,
        status: { in: ['PENDING', 'READY'] },
      },
    });
    if (pending === 0) {
      await prisma.order.update({
        where: { id: row.orderId },
        data: { status: 'COMPLETED' },
      });
    }
    return { id: updated.id, status: updated.status };
  }
}
