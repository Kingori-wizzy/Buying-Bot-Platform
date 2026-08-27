/**
 * Natural-language budget extraction for catalog search filters.
 * Amounts map to integer minor units (major × 100) per ADR-0011.
 */

export interface BudgetConstraint {
  readonly priceMinMinor?: number;
  readonly priceMaxMinor?: number;
  readonly sort?: 'price_asc' | 'price_desc';
  /** True when the phrase is too vague to apply a filter safely. */
  readonly ambiguous?: boolean;
}

const OPTIONAL_CURRENCY = '(?:KES|USD|EUR|GBP|KSh)?\\s*';
const AMOUNT = '([\\d,]+(?:\\.\\d+)?)(k|K)?';

function parseMajorAmount(raw: string, kSuffix?: string): number | null {
  const normalized = raw.replace(/,/g, '').trim();
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  const major = kSuffix ? value * 1000 : value;
  return Math.round(major * 100);
}

function parseAmountMatch(
  match: RegExpMatchArray,
  amountIndex: number,
  kIndex?: number,
): number | null {
  const amount = match[amountIndex];
  if (!amount) {
    return null;
  }
  const kSuffix = kIndex !== undefined ? match[kIndex] : undefined;
  return parseMajorAmount(amount, kSuffix);
}

/**
 * Extract a budget constraint from a single user utterance.
 * Does not hardcode a currency — numeric amounts are treated as major units.
 */
export function extractBudgetFromText(text: string): BudgetConstraint | null {
  const normalized = text.trim();
  if (!normalized) {
    return null;
  }

  const betweenMatch = normalized.match(
    new RegExp(
      `(?:between|from)\\s*${OPTIONAL_CURRENCY}${AMOUNT}\\s*(?:and|to|-)\\s*${OPTIONAL_CURRENCY}${AMOUNT}`,
      'i',
    ),
  );
  if (betweenMatch) {
    const minMinor = parseAmountMatch(betweenMatch, 1, 2);
    const maxMinor = parseAmountMatch(betweenMatch, 3, 4);
    if (minMinor !== null && maxMinor !== null) {
      return {
        priceMinMinor: Math.min(minMinor, maxMinor),
        priceMaxMinor: Math.max(minMinor, maxMinor),
      };
    }
  }

  if (
    /\b(cheapest|lowest\s+price|most\s+affordable|best\s+value)\b/i.test(
      normalized,
    )
  ) {
    const underMatch = normalized.match(
      new RegExp(
        `(?:cheapest|lowest\\s+price|most\\s+affordable|best\\s+value)\\s+(?:under|below)?\\s*${OPTIONAL_CURRENCY}${AMOUNT}`,
        'i',
      ),
    );
    if (underMatch) {
      const maxMinor = parseAmountMatch(underMatch, 1, 2);
      if (maxMinor !== null) {
        return { priceMaxMinor: maxMinor, sort: 'price_asc' };
      }
    }
    return { sort: 'price_asc' };
  }

  const maxMatch = normalized.match(
    new RegExp(
      `(?:under|below|less\\s+than|max(?:imum)?|up\\s+to|at\\s+most)\\s*${OPTIONAL_CURRENCY}${AMOUNT}`,
      'i',
    ),
  );
  if (maxMatch) {
    const maxMinor = parseAmountMatch(maxMatch, 1, 2);
    if (maxMinor !== null) {
      return { priceMaxMinor: maxMinor };
    }
  }

  const minMatch = normalized.match(
    new RegExp(
      `(?:over|above|more\\s+than|min(?:imum)?|at\\s+least)\\s*${OPTIONAL_CURRENCY}${AMOUNT}`,
      'i',
    ),
  );
  if (minMatch) {
    const minMinor = parseAmountMatch(minMatch, 1, 2);
    if (minMinor !== null) {
      return { priceMinMinor: minMinor };
    }
  }

  const aroundMatch = normalized.match(
    new RegExp(
      `(?:around|about|approximately)\\s*${OPTIONAL_CURRENCY}${AMOUNT}`,
      'i',
    ),
  );
  if (aroundMatch) {
    return { ambiguous: true };
  }

  const budgetMatch = normalized.match(
    new RegExp(
      `budget\\s+(?:is|of|around|about)?\\s*${OPTIONAL_CURRENCY}${AMOUNT}`,
      'i',
    ),
  );
  if (budgetMatch) {
    const maxMinor = parseAmountMatch(budgetMatch, 1, 2);
    if (maxMinor !== null) {
      return { priceMaxMinor: maxMinor };
    }
  }

  return null;
}

/** Merge budget hints from multiple user messages (most recent wins). */
export function extractBudgetFromConversation(
  userMessages: readonly string[],
): BudgetConstraint | null {
  let merged: BudgetConstraint | null = null;
  for (const message of userMessages) {
    const next = extractBudgetFromText(message);
    if (!next) {
      continue;
    }
    merged = {
      ...(merged ?? {}),
      ...next,
      ...(next.sort ? { sort: next.sort } : {}),
      ...(next.ambiguous ? { ambiguous: true } : {}),
    };
  }
  return merged;
}

/** Apply budget extraction to catalog search tool arguments. */
export function enrichSearchToolArgs(
  args: Record<string, unknown>,
  userMessages: readonly string[],
): Record<string, unknown> {
  const budget = extractBudgetFromConversation(userMessages);
  const enriched: Record<string, unknown> = { ...args };

  if (budget?.ambiguous && !budget.priceMinMinor && !budget.priceMaxMinor) {
    return enriched;
  }

  if (budget?.priceMinMinor !== undefined && enriched.priceMinMinor === undefined) {
    enriched.priceMinMinor = budget.priceMinMinor;
  }
  if (budget?.priceMaxMinor !== undefined && enriched.priceMaxMinor === undefined) {
    enriched.priceMaxMinor = budget.priceMaxMinor;
  }
  if (budget?.sort !== undefined && enriched.sort === undefined) {
    enriched.sort = budget.sort;
  }

  return enriched;
}
