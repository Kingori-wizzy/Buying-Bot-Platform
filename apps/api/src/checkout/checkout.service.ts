import { createHash, randomUUID } from 'node:crypto';

import type { PrismaDatabaseClient } from '@buying-bot/database';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { CartService } from '../cart/cart.service.js';
import type { ApiEnv } from '../config/env.js';
import { APP_ENV, DATABASE_CLIENT } from '../config/tokens.js';
import { InventoryService } from '../inventory/inventory.service.js';
import type { PromotionRule } from '../pricing/financial-calculation.engine.js';
import { PricingService } from '../pricing/pricing.service.js';
import type { CheckoutBody } from './checkout.schemas.js';

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
    @Inject(CartService) private readonly carts: CartService,
    @Inject(PricingService) private readonly pricing: PricingService,
    @Inject(InventoryService) private readonly inventory: InventoryService,
    @Optional() @Inject(APP_ENV) private readonly env?: ApiEnv,
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

  async checkout(input: {
    readonly userId?: string | undefined;
    readonly guestTokenHash?: string | undefined;
    readonly idempotencyKey: string;
    readonly body: CheckoutBody;
  }): Promise<unknown> {
    const prisma = this.prisma();
    const actorKey = input.userId ?? `guest:${input.guestTokenHash ?? 'anon'}`;
    const requestHash = createHash('sha256')
      .update(JSON.stringify(input.body))
      .digest('hex');

    const existing = await prisma.idempotencyRecord.findUnique({
      where: {
        key_actorKey: { key: input.idempotencyKey, actorKey },
      },
    });
    if (existing?.responseJson) {
      return existing.responseJson;
    }

    const cartRow = await this.carts.getOrCreateCart({
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.guestTokenHash !== undefined
        ? { guestTokenHash: input.guestTokenHash }
        : {}),
    });
    const cart = await this.carts.getCartView(cartRow.id);
    if (cart.lines.length === 0) {
      throw new BadRequestException({
        code: 'CART_EMPTY',
        message: 'Cart is empty',
      });
    }

    // v1: single-SKU reservation path — reserve each line separately and attach first
    // For multi-line, we create one reservation per line and store JSON in outbox; order.reservationId holds primary.
    const promotions: PromotionRule[] = [
      ...(await this.pricing.loadActiveItemPromotions()),
      ...(await this.pricing.loadActiveCartPromotions()),
    ];
    if (input.body.couponCode) {
      const coupon = await this.pricing.validateCoupon({
        code: input.body.couponCode,
        currency: cart.currency,
        goodsMinor: cart.lines.reduce((s, l) => s + l.lineTotalMinor, 0),
      });
      if (!coupon.valid || !coupon.rule) {
        throw new BadRequestException({
          code: 'INVALID_COUPON',
          message: coupon.reason ?? 'Coupon invalid',
        });
      }
      promotions.push(coupon.rule);
    }

    const offerMeta = await prisma.offer.findMany({
      where: { id: { in: cart.lines.map((l) => l.offerId) } },
      include: {
        sku: { include: { variant: { include: { product: true } } } },
      },
    });
    const offerById = new Map(offerMeta.map((o) => [o.id, o]));

    const calcLines = cart.lines.map((line) => {
      const offer = offerById.get(line.offerId);
      if (!offer) {
        throw new BadRequestException({
          code: 'OFFER_MISSING',
          message: 'Offer missing at checkout',
        });
      }
      return {
        offerId: line.offerId,
        skuId: line.skuId,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        currency: line.currency,
        taxInclusive: offer.taxInclusive,
        taxClass: offer.taxClass,
      };
    });

    let calculation;
    try {
      calculation = this.pricing.createEngine().calculate({
        lines: calcLines,
        promotions,
        ...(input.body.shippingMethodCode !== undefined
          ? { shippingMethodCode: input.body.shippingMethodCode }
          : {}),
      });
    } catch (error: unknown) {
      throw new BadRequestException({
        code: 'CALCULATION_FAILED',
        message: error instanceof Error ? error.message : 'calculation failed',
      });
    }

    const ttlSeconds = this.env?.CART_RESERVATION_TTL_SECONDS ?? 900;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // Reserve inventory outside provider HTTP; short txs per line
    const reservationIds: string[] = [];
    for (const line of cart.lines) {
      const reserved = await this.inventory.reserve({
        skuId: line.skuId,
        quantity: line.quantity,
        expiresAt,
        cartId: cart.id,
        idempotencyKey: `checkout-reserve:${input.idempotencyKey}:${line.offerId}`,
      });
      reservationIds.push(reserved.reservationId);
    }

    const orderId = randomUUID();
    const paymentId = randomUUID();
    const attemptId = randomUUID();

    try {
      const response = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            id: orderId,
            userId: input.userId ?? null,
            status: 'PENDING_PAYMENT',
            currency: calculation.currency,
            payableMinor: calculation.payableMinor,
            cartId: cart.id,
            reservationId: reservationIds[0] ?? null,
          },
        });

        for (const line of cart.lines) {
          const offer = offerById.get(line.offerId);
          if (!offer) {
            continue;
          }
          const priced = calculation.lines.find(
            (l) => l.offerId === line.offerId,
          );
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: offer.sku.variant.productId,
              productName: offer.sku.variant.product.name,
              variantName: offer.sku.variant.name,
              skuCode: offer.sku.internalSku,
              offerId: offer.id,
              organizationId: offer.organizationId,
              quantity: line.quantity,
              unitPriceMinor: priced?.unitPriceMinor ?? line.unitPriceMinor,
              currency: line.currency,
              lineDiscountMinor: priced?.lineDiscountMinor ?? 0,
              taxMinor: 0,
              lineTotalMinor: priced?.lineTotalMinor ?? line.lineTotalMinor,
              taxClass: offer.taxClass,
            },
          });
        }

        await tx.orderFinancialSnapshot.create({
          data: {
            orderId: order.id,
            calculationJson: calculation as never,
            goodsMinor: calculation.goodsMinor,
            discountMinor: calculation.discountMinor,
            shippingMinor: calculation.shippingMinor,
            taxMinor: calculation.taxMinor,
            payableMinor: calculation.payableMinor,
            currency: calculation.currency,
            calculationVersion: calculation.calculationVersion,
          },
        });

        await tx.payment.create({
          data: {
            id: paymentId,
            orderId: order.id,
            provider: 'escrow',
            status: 'PENDING',
            amountMinor: calculation.payableMinor,
            currency: calculation.currency,
            msisdnE164: input.body.msisdnE164 ?? null,
          },
        });

        await tx.paymentAttempt.create({
          data: {
            id: attemptId,
            paymentId,
            status: 'CREATED',
          },
        });

        await tx.outboxMessage.create({
          data: {
            type: 'payment.initiate',
            payloadJson: {
              orderId: order.id,
              paymentId,
              attemptId,
              amountMinor: calculation.payableMinor,
              currency: calculation.currency,
              ...(input.body.msisdnE164
                ? { msisdnE164: input.body.msisdnE164 }
                : {}),
              ...(input.userId
                ? { customerSubjectId: input.userId }
                : {}),
              ...(input.body.returnUrl
                ? { returnUrl: input.body.returnUrl }
                : {}),
            },
          },
        });

        await tx.cart.update({
          where: { id: cart.id },
          data: { status: 'CONVERTED' },
        });

        // Link reservations to order
        await tx.reservation.updateMany({
          where: { id: { in: reservationIds } },
          data: { orderId: order.id },
        });

        const payload = {
          orderId: order.id,
          status: order.status,
          payableMinor: order.payableMinor,
          currency: order.currency,
          paymentId,
          paymentAttemptId: attemptId,
          initiated: false,
        };

        await tx.idempotencyRecord.upsert({
          where: {
            key_actorKey: { key: input.idempotencyKey, actorKey },
          },
          create: {
            key: input.idempotencyKey,
            actorKey,
            requestHash,
            responseJson: payload,
            statusCode: 201,
          },
          update: {
            responseJson: payload,
            statusCode: 201,
            requestHash,
          },
        });

        return payload;
      });

      return response;
    } catch (error: unknown) {
      for (const reservationId of reservationIds) {
        await this.inventory.release(
          reservationId,
          `checkout-rollback:${input.idempotencyKey}:${reservationId}`,
        );
      }
      throw error;
    }
  }

  async getOrder(orderId: string, userId?: string): Promise<unknown> {
    const order = await this.prisma().order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        financialSnapshot: true,
        payments: { include: { attempts: true } },
      },
    });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }
    if (order.userId) {
      if (!userId || order.userId !== userId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Not your order',
        });
      }
    }
    return order;
  }

  async listMyOrders(userId: string): Promise<unknown> {
    return this.prisma().order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async adminListOrders(query: {
    page: number;
    pageSize: number;
    status?: string;
  }): Promise<{
    items: unknown[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const prisma = this.prisma();
    const allowed = [
      'PENDING_PAYMENT',
      'PAID',
      'CANCELLED',
      'FAILED',
      'RECONCILIATION_HOLD',
    ] as const;
    type OrderStatusFilter = (typeof allowed)[number];
    const statusFilter: OrderStatusFilter | undefined = allowed.find(
      (value) => value === query.status,
    );
    const [total, items] = await Promise.all([
      prisma.order.count({
        where: statusFilter ? { status: statusFilter } : {},
      }),
      prisma.order.findMany({
        where: statusFilter ? { status: statusFilter } : {},
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payments: true },
      }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async adminGetOrder(orderId: string): Promise<unknown> {
    const order = await this.prisma().order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        financialSnapshot: true,
        payments: { include: { attempts: true } },
      },
    });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }
    return order;
  }

  async cancelBeforePay(orderId: string, userId?: string): Promise<unknown> {
    const prisma = this.prisma();
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }
    if (order.userId) {
      if (!userId || order.userId !== userId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Not your order',
        });
      }
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new ConflictException({
        code: 'CANNOT_CANCEL',
        message: `Order status ${order.status}`,
      });
    }

    if (order.reservationId) {
      await this.inventory.release(
        order.reservationId,
        `cancel:${order.id}:${order.reservationId}`,
      );
    }

    // Release any other HELD reservations for this order
    const held = await prisma.reservation.findMany({
      where: { orderId: order.id, status: 'HELD' },
    });
    for (const reservation of held) {
      await this.inventory.release(
        reservation.id,
        `cancel:${order.id}:${reservation.id}`,
      );
    }

    return prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    });
  }
}
