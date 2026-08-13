import { describe, expect, it } from 'vitest';

import {
  addMoney,
  money,
  mulRational,
  percentOfMinor,
  subMoney,
} from './money.js';

describe('money helpers', () => {
  it('adds and subtracts same currency', () => {
    const a = money(100, 'KES');
    const b = money(50, 'kes');
    expect(addMoney(a, b)).toEqual({ amount: 150, currency: 'KES' });
    expect(subMoney(a, b)).toEqual({ amount: 50, currency: 'KES' });
  });

  it('rejects cross-currency add', () => {
    expect(() => addMoney(money(1, 'KES'), money(1, 'USD'))).toThrow(
      /Currency mismatch/,
    );
  });

  it('rounds half away from zero', () => {
    // 1 * 1 / 2 = 0.5 → 1
    expect(mulRational(1, 1, 2)).toBe(1);
    // -1 * 1 / 2 = -0.5 → -1
    expect(mulRational(-1, 1, 2)).toBe(-1);
    // 125050 * 1600 / 10000 = 20008
    expect(percentOfMinor(125_050, 1600)).toBe(20_008);
  });
});
