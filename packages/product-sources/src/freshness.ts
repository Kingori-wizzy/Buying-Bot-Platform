/** Configurable price freshness bands (not checkout truth). */
export type PriceFreshnessBand = 'FRESH' | 'RECENT' | 'STALE' | 'EXPIRED';

export interface PriceFreshnessPolicy {
  /** Minutes after observation still considered fresh (default 15). */
  readonly freshMinutes: number;
  /** Minutes after observation still considered recent (default 60). */
  readonly recentMinutes: number;
  /** Minutes after observation before expired (default 1440 = 24h). */
  readonly expiredMinutes: number;
}

export const DEFAULT_PRICE_FRESHNESS_POLICY: PriceFreshnessPolicy = {
  freshMinutes: 15,
  recentMinutes: 60,
  expiredMinutes: 24 * 60,
};

export function computePriceFreshness(
  observedAt: Date | string | null | undefined,
  now: Date = new Date(),
  policy: PriceFreshnessPolicy = DEFAULT_PRICE_FRESHNESS_POLICY,
): PriceFreshnessBand {
  if (!observedAt) {
    return 'EXPIRED';
  }
  const ts =
    typeof observedAt === 'string' ? new Date(observedAt) : observedAt;
  if (Number.isNaN(ts.getTime())) {
    return 'EXPIRED';
  }
  const ageMinutes = (now.getTime() - ts.getTime()) / 60_000;
  if (ageMinutes <= policy.freshMinutes) {
    return 'FRESH';
  }
  if (ageMinutes <= policy.recentMinutes) {
    return 'RECENT';
  }
  if (ageMinutes <= policy.expiredMinutes) {
    return 'STALE';
  }
  return 'EXPIRED';
}

export function priceFreshnessLabel(band: PriceFreshnessBand): string {
  switch (band) {
    case 'FRESH':
      return 'Verified merchant price';
    case 'RECENT':
      return 'Recently checked price';
    case 'STALE':
      return 'Price may have changed';
    case 'EXPIRED':
      return 'Price check expired — revalidate before checkout';
  }
}
