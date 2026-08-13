import type { PrismaDatabaseClient } from '@buying-bot/database';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import type { ApiEnv } from '../config/env.js';
import { APP_ENV, DATABASE_CLIENT } from '../config/tokens.js';
import {
  ConfigurableTaxCalculator,
  FinancialCalculationEngine,
  FlatShippingQuoteAdapter,
  type PromotionRule,
} from './financial-calculation.engine.js';
import type {
  CreateCouponBody,
  CreatePromotionBody,
  ValidateCouponBody,
} from './pricing.schemas.js';

@Injectable()
export class PricingService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
    @Optional() @Inject(APP_ENV) private readonly env?: ApiEnv,
  ) {}

  createEngine(): FinancialCalculationEngine {
    const currency = this.env?.DEFAULT_CURRENCY ?? 'KES';
    const rateBps = this.env?.TAX_DEFAULT_RATE_BPS ?? 0;
    const tax = new ConfigurableTaxCalculator({
      required: this.env?.TAX_REQUIRED === true,
      rateBps,
      currency,
    });
    const shipping = new FlatShippingQuoteAdapter({
      methodCode: this.env?.SHIPPING_DEFAULT_CODE ?? 'FLAT',
      currency,
      flatRateMinor: 0,
      freeAboveMinor: null,
    });
    return new FinancialCalculationEngine(tax, shipping);
  }

  async listPromotions(): Promise<unknown> {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'DB required',
      });
    }
    return this.database.prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { coupons: true },
    });
  }

  async listCoupons(): Promise<unknown> {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'DB required',
      });
    }
    return this.database.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { promotion: true },
    });
  }

  async createPromotion(body: CreatePromotionBody): Promise<unknown> {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'DB required',
      });
    }
    return this.database.prisma.promotion.create({
      data: {
        name: body.name,
        code: body.code ?? null,
        type: body.type,
        percentBps: body.percentBps ?? null,
        amountMinor: body.amountMinor ?? null,
        currency: body.currency ?? this.env?.DEFAULT_CURRENCY ?? null,
        stackable: body.stackable ?? false,
        priority: body.priority ?? 0,
        minSpendMinor: body.minSpendMinor ?? null,
        active: body.active ?? true,
      },
    });
  }

  async createCoupon(body: CreateCouponBody): Promise<unknown> {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'DB required',
      });
    }
    const promo = await this.database.prisma.promotion.findUnique({
      where: { id: body.promotionId },
    });
    if (!promo) {
      throw new NotFoundException({
        code: 'PROMO_NOT_FOUND',
        message: 'Promotion not found',
      });
    }
    return this.database.prisma.coupon.create({
      data: {
        code: body.code.toUpperCase(),
        promotionId: body.promotionId,
        maxRedemptions: body.maxRedemptions ?? null,
        startsAt: body.startsAt ?? null,
        endsAt: body.endsAt ?? null,
      },
    });
  }

  async validateCoupon(body: ValidateCouponBody): Promise<{
    valid: boolean;
    couponId?: string;
    promotionId?: string;
    reason?: string;
    rule?: PromotionRule;
  }> {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'DB required',
      });
    }
    const coupon = await this.database.prisma.coupon.findUnique({
      where: { code: body.code.toUpperCase() },
      include: { promotion: true },
    });
    if (coupon?.status !== 'ACTIVE' || !coupon.promotion.active) {
      return { valid: false, reason: 'INVALID_COUPON' };
    }
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return { valid: false, reason: 'NOT_STARTED' };
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      return { valid: false, reason: 'EXPIRED' };
    }
    if (
      coupon.maxRedemptions !== null &&
      coupon.redeemedCount >= coupon.maxRedemptions
    ) {
      return { valid: false, reason: 'MAX_REDEMPTIONS' };
    }
    if (
      coupon.promotion.minSpendMinor !== null &&
      body.goodsMinor !== undefined &&
      body.goodsMinor < coupon.promotion.minSpendMinor
    ) {
      return { valid: false, reason: 'MIN_SPEND' };
    }

    const stage =
      coupon.promotion.type === 'PERCENT_OFF_ITEM' ||
      coupon.promotion.type === 'FIXED_OFF_ITEM'
        ? 'coupon'
        : 'coupon';

    return {
      valid: true,
      couponId: coupon.id,
      promotionId: coupon.promotionId,
      rule: {
        id: coupon.promotion.id,
        type: coupon.promotion.type,
        percentBps: coupon.promotion.percentBps,
        amountMinor: coupon.promotion.amountMinor,
        currency: coupon.promotion.currency,
        stackable: coupon.promotion.stackable,
        priority: coupon.promotion.priority,
        minSpendMinor: coupon.promotion.minSpendMinor,
        stage,
        label: coupon.code,
      },
    };
  }

  async loadActiveItemPromotions(): Promise<PromotionRule[]> {
    if (!this.database) {
      return [];
    }
    const now = new Date();
    const promos = await this.database.prisma.promotion.findMany({
      where: {
        active: true,
        type: { in: ['PERCENT_OFF_ITEM', 'FIXED_OFF_ITEM'] },
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
    });
    return promos.map((p) => ({
      id: p.id,
      type: p.type,
      percentBps: p.percentBps,
      amountMinor: p.amountMinor,
      currency: p.currency,
      stackable: p.stackable,
      priority: p.priority,
      minSpendMinor: p.minSpendMinor,
      stage: 'item' as const,
      label: p.name,
    }));
  }

  async loadActiveCartPromotions(): Promise<PromotionRule[]> {
    if (!this.database) {
      return [];
    }
    const now = new Date();
    const promos = await this.database.prisma.promotion.findMany({
      where: {
        active: true,
        type: { in: ['PERCENT_OFF_CART', 'FIXED_OFF_CART'] },
        code: null,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
    });
    return promos.map((p) => ({
      id: p.id,
      type: p.type,
      percentBps: p.percentBps,
      amountMinor: p.amountMinor,
      currency: p.currency,
      stackable: p.stackable,
      priority: p.priority,
      minSpendMinor: p.minSpendMinor,
      stage: 'cart' as const,
      label: p.name,
    }));
  }

  resolveEffectiveUnitPrice(input: {
    readonly listPriceMinor: number;
    readonly windows: readonly {
      readonly id: string;
      readonly salePriceMinor: number;
      readonly startsAt: Date;
      readonly endsAt: Date | null;
      readonly priority: number;
    }[];
    readonly asOf?: Date;
  }): number {
    const asOf = input.asOf ?? new Date();
    const active = input.windows.filter(
      (w) => w.startsAt <= asOf && (w.endsAt === null || w.endsAt >= asOf),
    );
    if (active.length === 0) {
      return input.listPriceMinor;
    }
    active.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      if (a.salePriceMinor !== b.salePriceMinor) {
        return a.salePriceMinor - b.salePriceMinor;
      }
      return a.id.localeCompare(b.id);
    });
    return active[0]?.salePriceMinor ?? input.listPriceMinor;
  }
}
