import { describe, expect, it } from 'vitest';

import { defaultTokens } from './index.js';

describe('@buying-bot/ui', () => {
  it('exposes default design tokens', () => {
    expect(defaultTokens.color.accent).toMatch(/^#/);
    expect(defaultTokens.fontFamily.sans.length).toBeGreaterThan(0);
  });
});
