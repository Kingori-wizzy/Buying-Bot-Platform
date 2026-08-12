import { describe, expect, it } from 'vitest';

import type { AiToolDefinition } from './index.js';

describe('@buying-bot/ai-core', () => {
  it('marks payment tools as high risk', () => {
    const tool: AiToolDefinition = {
      name: 'refund_order',
      description: 'Issue a refund',
      riskLevel: 'payment',
      requiresHumanApproval: true,
    };
    expect(tool.requiresHumanApproval).toBe(true);
  });
});
