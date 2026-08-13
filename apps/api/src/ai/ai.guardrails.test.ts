import { assertNoInventedCommerceFacts } from '@buying-bot/ai-core';
import { describe, expect, it } from 'vitest';

describe('AI commerce guardrails', () => {
  it('rejects an ungrounded price narrative', () => {
    expect(assertNoInventedCommerceFacts('This costs KES 4,999.')).toBe(false);
  });

  it('allows prices explicitly grounded in tool output', () => {
    expect(
      assertNoInventedCommerceFacts(
        'Based on tool results, unitPriceMinor is KES 4,999.',
      ),
    ).toBe(true);
  });
});
