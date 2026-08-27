import { describe, expect, it } from 'vitest';

import {
  enrichSearchToolArgs,
  extractBudgetFromConversation,
  extractBudgetFromText,
} from './budget-extraction.js';

describe('extractBudgetFromText', () => {
  it('parses under KES 30,000', () => {
    expect(extractBudgetFromText('under KES 30,000')).toEqual({
      priceMaxMinor: 3_000_000,
    });
  });

  it('parses below 30k', () => {
    expect(extractBudgetFromText('below 30k')).toEqual({
      priceMaxMinor: 3_000_000,
    });
  });

  it('parses max 50,000', () => {
    expect(extractBudgetFromText('max 50,000')).toEqual({
      priceMaxMinor: 5_000_000,
    });
  });

  it('parses between 20k and 40k', () => {
    expect(extractBudgetFromText('between 20k and 40k')).toEqual({
      priceMinMinor: 2_000_000,
      priceMaxMinor: 4_000_000,
    });
  });

  it('flags around 25,000 as ambiguous', () => {
    expect(extractBudgetFromText('around 25,000')).toEqual({ ambiguous: true });
  });

  it('parses cheapest option', () => {
    expect(extractBudgetFromText('cheapest option')).toEqual({
      sort: 'price_asc',
    });
  });

  it('parses best value under 30k', () => {
    expect(extractBudgetFromText('best value under 30k')).toEqual({
      priceMaxMinor: 3_000_000,
      sort: 'price_asc',
    });
  });
});

describe('extractBudgetFromConversation', () => {
  it('uses the latest explicit budget across turns', () => {
    const budget = extractBudgetFromConversation([
      'I need an AI writing platform.',
      'My budget is KES 10,000.',
    ]);
    expect(budget).toEqual({ priceMaxMinor: 1_000_000 });
  });
});

describe('enrichSearchToolArgs', () => {
  it('adds priceMaxMinor from conversation when missing in args', () => {
    const enriched = enrichSearchToolArgs(
      { query: 'AI platform' },
      ['Show me options', 'under KES 30,000'],
    );
    expect(enriched).toMatchObject({
      query: 'AI platform',
      priceMaxMinor: 3_000_000,
    });
  });
});
