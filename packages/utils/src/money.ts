/**
 * Integer minor-unit money helpers (ADR-0012).
 * No IEEE-754 financial arithmetic.
 */

export interface Money {
  readonly amount: number;
  readonly currency: string;
}

export function money(amount: number, currency: string): Money {
  if (!Number.isInteger(amount)) {
    throw new Error('Money amount must be an integer minor unit');
  }
  if (amount < 0) {
    throw new Error('Negative money is not allowed for prices/totals');
  }
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error('Currency must be ISO 4217 (3 letters)');
  }
  return { amount, currency: normalized };
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  const result = a.amount - b.amount;
  if (result < 0) {
    throw new Error('Subtraction would yield negative money');
  }
  return money(result, a.currency);
}

/**
 * Half-away-from-zero rounding on integer minor units (ADR-0012 §12).
 * Multiplies amount by numerator/denominator.
 */
export function mulRational(
  amount: number,
  numerator: number,
  denominator: number,
): number {
  if (!Number.isInteger(amount) || !Number.isInteger(numerator)) {
    throw new Error('mulRational requires integer amount and numerator');
  }
  if (!Number.isInteger(denominator) || denominator === 0) {
    throw new Error('mulRational requires non-zero integer denominator');
  }
  const product = BigInt(amount) * BigInt(numerator);
  const den = BigInt(denominator);
  const half = den / 2n;
  if (product >= 0n) {
    return Number((product + half) / den);
  }
  return Number((product - half) / den);
}

/** Apply basis points (1% = 100 bps) with half-away-from-zero. */
export function percentOfMinor(amount: number, bps: number): number {
  return mulRational(amount, bps, 10_000);
}

export function mulMoney(
  m: Money,
  numerator: number,
  denominator: number,
): Money {
  return money(mulRational(m.amount, numerator, denominator), m.currency);
}
