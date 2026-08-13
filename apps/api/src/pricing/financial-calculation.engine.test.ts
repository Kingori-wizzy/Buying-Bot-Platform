import { describe, expect, it } from 'vitest';

import {
  ConfigurableTaxCalculator,
  FinancialCalculationEngine,
  FlatShippingQuoteAdapter,
} from './financial-calculation.engine.js';

describe('FinancialCalculationEngine golden fixtures', () => {
  const tax = new ConfigurableTaxCalculator({
    required: true,
    rateBps: 1600,
    currency: 'KES',
  });
  const shipping = new FlatShippingQuoteAdapter({
    methodCode: 'FLAT',
    currency: 'KES',
    flatRateMinor: 20000,
    freeAboveMinor: null,
  });
  const engine = new FinancialCalculationEngine(tax, shipping);

  it('computes exclusive tax + shipping with item percent promo then coupon', () => {
    const result = engine.calculate({
      lines: [
        {
          offerId: 'o1',
          skuId: 's1',
          quantity: 2,
          unitPriceMinor: 100_000,
          currency: 'KES',
          taxInclusive: false,
          taxClass: 'standard',
        },
      ],
      promotions: [
        {
          id: 'p-item',
          type: 'PERCENT_OFF_ITEM',
          percentBps: 1000,
          stackable: true,
          priority: 10,
          stage: 'item',
          label: '10% item',
        },
        {
          id: 'p-coupon',
          type: 'FIXED_OFF_CART',
          amountMinor: 5_000,
          currency: 'KES',
          stackable: true,
          priority: 5,
          stage: 'coupon',
          label: 'coupon',
        },
      ],
    });

    // 2 * 100000 = 200000; item 10% = 20000 → 180000; coupon 5000 → 175000
    expect(result.goodsMinor).toBe(200_000);
    expect(result.itemDiscountMinor).toBe(20_000);
    expect(result.couponDiscountMinor).toBe(5_000);
    expect(result.shippingMinor).toBe(20_000);
    // tax on 175000+20000 exclusive @16% = 31200
    expect(result.taxMinor).toBe(31_200);
    expect(result.payableMinor).toBe(175_000 + 20_000 + 31_200);
    expect(result.calculationVersion).toBe('v1-adr0012');
  });

  it('fails closed when tax config missing and required', () => {
    const failEngine = new FinancialCalculationEngine(
      new ConfigurableTaxCalculator({
        required: true,
        rateBps: null,
        currency: 'KES',
      }),
      shipping,
    );
    expect(() =>
      failEngine.calculate({
        lines: [
          {
            offerId: 'o1',
            skuId: 's1',
            quantity: 1,
            unitPriceMinor: 100,
            currency: 'KES',
            taxInclusive: true,
          },
        ],
        promotions: [],
      }),
    ).toThrow(/TAX_CONFIG_MISSING/);
  });
});
