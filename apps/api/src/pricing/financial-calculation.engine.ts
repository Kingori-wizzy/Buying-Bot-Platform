import { type Money, money, percentOfMinor } from '@buying-bot/utils';

export const CALCULATION_VERSION = 'v1-adr0012';

export interface TaxCalculatorInput {
  readonly currency: string;
  readonly taxableGoodsMinor: number;
  readonly taxableShippingMinor: number;
  readonly taxInclusive: boolean;
  readonly taxClass?: string | null | undefined;
}

export interface TaxResult {
  readonly taxMinor: number;
  readonly currency: string;
  readonly rateBps: number;
}

export interface TaxCalculator {
  calculate(input: TaxCalculatorInput): TaxResult;
}

export interface ShippingQuoteInput {
  readonly currency: string;
  readonly goodsMinorAfterDiscount: number;
  readonly methodCode?: string | undefined;
}

export interface ShippingQuote {
  readonly amountMinor: number;
  readonly currency: string;
  readonly methodCode: string;
}

export interface ShippingQuotePort {
  quote(input: ShippingQuoteInput): ShippingQuote;
}

export interface CalcLineInput {
  readonly offerId: string;
  readonly skuId: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly currency: string;
  readonly taxInclusive: boolean;
  readonly taxClass?: string | null | undefined;
}

export interface PromotionRule {
  readonly id: string;
  readonly type:
    | 'PERCENT_OFF_ITEM'
    | 'FIXED_OFF_ITEM'
    | 'PERCENT_OFF_CART'
    | 'FIXED_OFF_CART';
  readonly percentBps?: number | null | undefined;
  readonly amountMinor?: number | null | undefined;
  readonly currency?: string | null | undefined;
  readonly stackable: boolean;
  readonly priority: number;
  readonly minSpendMinor?: number | null | undefined;
  readonly stage: 'item' | 'coupon' | 'cart';
  readonly label?: string | undefined;
}

export interface CalculationResult {
  readonly currency: string;
  readonly lines: {
    readonly offerId: string;
    readonly skuId: string;
    readonly quantity: number;
    readonly unitPriceMinor: number;
    readonly lineSubtotalMinor: number;
    readonly lineDiscountMinor: number;
    readonly lineTotalMinor: number;
  }[];
  readonly goodsMinor: number;
  readonly itemDiscountMinor: number;
  readonly couponDiscountMinor: number;
  readonly cartDiscountMinor: number;
  readonly discountMinor: number;
  readonly shippingMinor: number;
  readonly taxMinor: number;
  readonly payableMinor: number;
  readonly adjustments: {
    readonly type: string;
    readonly referenceId: string;
    readonly amount: number;
    readonly currency: string;
    readonly label?: string | undefined;
  }[];
  readonly calculationVersion: string;
}

/**
 * Deterministic financial calculation engine (ADR-0012).
 * Stacking order: item → coupon → cart. Limited stacking.
 */
export class FinancialCalculationEngine {
  constructor(
    private readonly taxCalculator: TaxCalculator,
    private readonly shippingQuote: ShippingQuotePort,
  ) {}

  calculate(input: {
    readonly lines: readonly CalcLineInput[];
    readonly promotions: readonly PromotionRule[];
    readonly shippingMethodCode?: string | undefined;
    readonly asOf?: Date | undefined;
  }): CalculationResult {
    if (input.lines.length === 0) {
      throw new Error('CART_EMPTY');
    }
    const currency = input.lines[0]?.currency;
    if (!currency) {
      throw new Error('CURRENCY_REQUIRED');
    }
    for (const line of input.lines) {
      if (line.currency !== currency) {
        throw new Error('MIXED_CURRENCY');
      }
      if (line.quantity < 1 || line.unitPriceMinor < 0) {
        throw new Error('INVALID_LINE');
      }
    }

    const adjustments: CalculationResult['adjustments'] = [];
    const working = input.lines.map((line) => {
      const lineSubtotalMinor = line.unitPriceMinor * line.quantity;
      return {
        ...line,
        lineSubtotalMinor,
        lineDiscountMinor: 0,
        lineTotalMinor: lineSubtotalMinor,
      };
    });

    const applyStage = (stage: 'item' | 'coupon' | 'cart'): number => {
      const rules = input.promotions
        .filter((p) => p.stage === stage)
        .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

      let stageDiscount = 0;
      let appliedNonStackable = false;

      for (const rule of rules) {
        if (appliedNonStackable && !rule.stackable) {
          continue;
        }
        if (
          rule.minSpendMinor !== null &&
          rule.minSpendMinor !== undefined &&
          working.reduce((s, l) => s + l.lineTotalMinor, 0) < rule.minSpendMinor
        ) {
          continue;
        }

        let discount = 0;
        if (
          rule.type === 'PERCENT_OFF_ITEM' ||
          rule.type === 'FIXED_OFF_ITEM'
        ) {
          for (const line of working) {
            const base = line.lineTotalMinor;
            const lineDisc =
              rule.type === 'PERCENT_OFF_ITEM'
                ? percentOfMinor(base, rule.percentBps ?? 0)
                : Math.min(base, rule.amountMinor ?? 0);
            line.lineDiscountMinor += lineDisc;
            line.lineTotalMinor -= lineDisc;
            discount += lineDisc;
          }
        } else if (rule.type === 'PERCENT_OFF_CART') {
          const goods = working.reduce((s, l) => s + l.lineTotalMinor, 0);
          discount = percentOfMinor(goods, rule.percentBps ?? 0);
          this.allocateCartDiscount(working, discount);
        } else {
          const goods = working.reduce((s, l) => s + l.lineTotalMinor, 0);
          discount = Math.min(goods, rule.amountMinor ?? 0);
          if (rule.currency && rule.currency !== currency) {
            throw new Error('PROMO_CURRENCY_MISMATCH');
          }
          this.allocateCartDiscount(working, discount);
        }

        if (discount > 0) {
          stageDiscount += discount;
          adjustments.push({
            type: rule.type,
            referenceId: rule.id,
            amount: discount,
            currency,
            label: rule.label,
          });
          if (!rule.stackable) {
            appliedNonStackable = true;
          }
        }
      }
      return stageDiscount;
    };

    const itemDiscountMinor = applyStage('item');
    const couponDiscountMinor = applyStage('coupon');
    const cartDiscountMinor = applyStage('cart');
    const discountMinor =
      itemDiscountMinor + couponDiscountMinor + cartDiscountMinor;
    const goodsMinor = working.reduce((s, l) => s + l.lineSubtotalMinor, 0);
    const goodsAfterDiscount = working.reduce(
      (s, l) => s + l.lineTotalMinor,
      0,
    );

    const shipping = this.shippingQuote.quote({
      currency,
      goodsMinorAfterDiscount: goodsAfterDiscount,
      methodCode: input.shippingMethodCode,
    });
    money(shipping.amountMinor, shipping.currency);

    const taxInclusive = input.lines.every((l) => l.taxInclusive);
    const tax = this.taxCalculator.calculate({
      currency,
      taxableGoodsMinor: goodsAfterDiscount,
      taxableShippingMinor: shipping.amountMinor,
      taxInclusive,
      taxClass: input.lines[0]?.taxClass,
    });

    let payableMinor: number;
    if (taxInclusive) {
      payableMinor = goodsAfterDiscount + shipping.amountMinor;
    } else {
      payableMinor = goodsAfterDiscount + shipping.amountMinor + tax.taxMinor;
    }

    const payable: Money = money(payableMinor, currency);

    return {
      currency: payable.currency,
      lines: working.map((l) => ({
        offerId: l.offerId,
        skuId: l.skuId,
        quantity: l.quantity,
        unitPriceMinor: l.unitPriceMinor,
        lineSubtotalMinor: l.lineSubtotalMinor,
        lineDiscountMinor: l.lineDiscountMinor,
        lineTotalMinor: l.lineTotalMinor,
      })),
      goodsMinor,
      itemDiscountMinor,
      couponDiscountMinor,
      cartDiscountMinor,
      discountMinor,
      shippingMinor: shipping.amountMinor,
      taxMinor: tax.taxMinor,
      payableMinor: payable.amount,
      adjustments,
      calculationVersion: CALCULATION_VERSION,
    };
  }

  private allocateCartDiscount(
    lines: { lineTotalMinor: number; lineDiscountMinor: number }[],
    discount: number,
  ): void {
    const goods = lines.reduce((s, l) => s + l.lineTotalMinor, 0);
    if (goods <= 0 || discount <= 0) {
      return;
    }
    let remaining = discount;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) {
        continue;
      }
      const share =
        i === lines.length - 1
          ? remaining
          : Math.min(
              line.lineTotalMinor,
              Math.floor((discount * line.lineTotalMinor) / goods),
            );
      line.lineDiscountMinor += share;
      line.lineTotalMinor -= share;
      remaining -= share;
    }
  }
}

/** Fail-closed configurable tax adapter. */
export class ConfigurableTaxCalculator implements TaxCalculator {
  constructor(
    private readonly config: {
      readonly required: boolean;
      readonly rateBps: number | null;
      readonly currency: string;
    },
  ) {}

  calculate(input: TaxCalculatorInput): TaxResult {
    if (this.config.rateBps === null) {
      if (this.config.required) {
        throw new Error('TAX_CONFIG_MISSING');
      }
      return { taxMinor: 0, currency: input.currency, rateBps: 0 };
    }
    if (input.currency !== this.config.currency) {
      throw new Error('TAX_CURRENCY_MISMATCH');
    }
    const taxable = input.taxableGoodsMinor + input.taxableShippingMinor;
    if (input.taxInclusive) {
      // Extract tax from inclusive amount: tax = amount - amount/(1+r)
      const divisor = 10_000 + this.config.rateBps;
      const net = Math.floor((taxable * 10_000) / divisor);
      return {
        taxMinor: taxable - net,
        currency: input.currency,
        rateBps: this.config.rateBps,
      };
    }
    return {
      taxMinor: percentOfMinor(taxable, this.config.rateBps),
      currency: input.currency,
      rateBps: this.config.rateBps,
    };
  }
}

export class FlatShippingQuoteAdapter implements ShippingQuotePort {
  constructor(
    private readonly config: {
      readonly methodCode: string;
      readonly currency: string;
      readonly flatRateMinor: number;
      readonly freeAboveMinor?: number | null;
    },
  ) {}

  quote(input: ShippingQuoteInput): ShippingQuote {
    if (input.currency !== this.config.currency) {
      throw new Error('SHIPPING_CURRENCY_MISMATCH');
    }
    const free =
      this.config.freeAboveMinor !== null &&
      this.config.freeAboveMinor !== undefined &&
      input.goodsMinorAfterDiscount >= this.config.freeAboveMinor;
    return {
      amountMinor: free ? 0 : this.config.flatRateMinor,
      currency: this.config.currency,
      methodCode: input.methodCode ?? this.config.methodCode,
    };
  }
}
