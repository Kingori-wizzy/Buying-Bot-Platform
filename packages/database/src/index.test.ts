import { describe, expect, it } from 'vitest';

import type { DatabaseHealth } from './index.js';

describe('@buying-bot/database', () => {
  it('defines a health contract', () => {
    const health: DatabaseHealth = { ok: true, latencyMs: 3 };
    expect(health.ok).toBe(true);
  });
});
