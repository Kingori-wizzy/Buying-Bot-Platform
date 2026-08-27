import { enrichSearchToolArgs } from '@buying-bot/ai-core';
import { describe, expect, it } from 'vitest';

describe('AiService commerce helpers', () => {
  it('enriches search tool args from multi-turn user budget', () => {
    const enriched = enrichSearchToolArgs(
      { query: 'AI writing platform' },
      [
        'I need an AI writing platform.',
        'My budget is KES 10,000.',
        'Which one would you recommend?',
      ],
    );
    expect(enriched).toMatchObject({
      query: 'AI writing platform',
      priceMaxMinor: 1_000_000,
    });
  });
});
