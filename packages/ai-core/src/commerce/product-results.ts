/** Minimal product card shape returned from catalog search tools. */
export interface CatalogProductCard {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription?: string | null;
  readonly variants?: readonly {
    readonly id: string;
    readonly sku?: {
      readonly id: string;
      readonly offers?: readonly {
        readonly id: string;
        readonly listPriceMinor: number;
        readonly currency: string;
        readonly active?: boolean;
      }[];
    } | null;
  }[];
}

export function extractProductsFromToolResult(
  toolName: string,
  resultJson: string,
): readonly CatalogProductCard[] {
  if (toolName !== 'searchProducts' && toolName !== 'recommendProducts') {
    return [];
  }
  try {
    const parsed = JSON.parse(resultJson) as { items?: unknown };
    if (!Array.isArray(parsed.items)) {
      return [];
    }
    return parsed.items.filter(isProductCard);
  } catch {
    return [];
  }
}

export function mergeProductResults(
  existing: readonly CatalogProductCard[],
  incoming: readonly CatalogProductCard[],
  limit = 6,
): readonly CatalogProductCard[] {
  const byId = new Map<string, CatalogProductCard>();
  for (const product of [...existing, ...incoming]) {
    byId.set(product.id, product);
  }
  return [...byId.values()].slice(0, limit);
}

function isProductCard(value: unknown): value is CatalogProductCard {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.slug === 'string'
  );
}

function firstOffer(product: CatalogProductCard): {
  listPriceMinor: number;
  currency: string;
} | null {
  for (const variant of product.variants ?? []) {
    for (const offer of variant.sku?.offers ?? []) {
      if (offer.active !== false) {
        return {
          listPriceMinor: offer.listPriceMinor,
          currency: offer.currency,
        };
      }
    }
  }
  return null;
}

function formatMinor(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
  }).format(minor / 100);
}

/**
 * Deterministic/test-friendly natural-language reply from catalog tool JSON.
 * Real LLM providers produce their own prose; this avoids internal-looking dumps.
 */
export function formatDeterministicCommerceReply(input: {
  readonly userMessages: readonly string[];
  readonly toolName?: string;
  readonly toolResultJson?: string;
  readonly products: readonly CatalogProductCard[];
}): string {
  const latestUser =
    [...input.userMessages].reverse().find((m) => m.trim().length > 0) ?? '';
  const wantsRecommendation =
    /\b(recommend|which one|best|suggest|pick)\b/i.test(latestUser) ||
    input.userMessages.some((m) =>
      /\b(recommend|which one|best|suggest|pick)\b/i.test(m),
    );

  if (input.products.length === 0) {
    return 'No matching product is currently available in the shop for that request. You can try widening your budget or describing a different type of platform.';
  }

  const lines: string[] = [];
  if (wantsRecommendation && input.products.length >= 1) {
    const top = input.products[0];
    if (!top) {
      return 'No matching product is currently available in the shop.';
    }
    const price = firstOffer(top);
    lines.push(
      `Based on what you told me, I would start with **${top.name}**.`,
    );
    if (price) {
      lines.push(
        `It is listed at ${formatMinor(price.listPriceMinor, price.currency)} in the live catalog.`,
      );
    }
    if (top.shortDescription) {
      lines.push(top.shortDescription);
    }
    if (input.products.length > 1) {
      const altNames = input.products
        .slice(1, 3)
        .map((p) => p.name)
        .join(' and ');
      lines.push(`Alternatives to compare: ${altNames}.`);
    }
    lines.push('All prices and availability above come from the shop catalog.');
    return lines.join(' ');
  }

  lines.push(`I found ${String(input.products.length)} matching product(s) in the catalog:`);
  for (const product of input.products.slice(0, 4)) {
    const price = firstOffer(product);
    const priceText = price
      ? formatMinor(price.listPriceMinor, price.currency)
      : 'price unavailable';
    lines.push(`- ${product.name} (${priceText})`);
  }
  lines.push('Let me know if you want a recommendation or a comparison.');
  return lines.join(' ');
}
