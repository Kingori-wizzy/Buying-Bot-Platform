import { describe, expect, it } from 'vitest';

import {
  DefaultAgentRuntime,
  DeterministicModelProvider,
  type ToolExecutorPort,
} from '../index.js';

describe('deterministic provider conversation flow', () => {
  it('uses prior user context when recommending after budget turn', async () => {
    const executor: ToolExecutorPort = {
      execute: async (toolName, args) => ({
        ok: true,
        resultJson: JSON.stringify({
          items: [
            {
              id: 'p1',
              name: 'Writer Pro Platform',
              slug: 'writer-pro',
              shortDescription: 'AI writing workflows',
              variants: [
                {
                  id: 'v1',
                  sku: {
                    id: 's1',
                    offers: [
                      {
                        id: 'o1',
                        listPriceMinor: 800_000,
                        currency: 'KES',
                        active: true,
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      }),
    };

    const runtime = new DefaultAgentRuntime({
      provider: new DeterministicModelProvider(),
      tools: [
        {
          name: 'searchProducts',
          description: 'Search catalog',
          riskLevel: 'read',
          requiresHumanApproval: false,
          parametersJsonSchema: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query'],
          },
        },
      ],
      toolExecutor: executor,
      guardrails: { checkInput: () => ({ ok: true }), scrubOutput: ({ text }) => ({ ok: true, sanitizedText: text }) },
      systemPrompt: 'test',
    });

    const result = await runtime.run({
      model: 'deterministic-v1',
      messages: [
        { role: 'user', content: 'I need an AI writing platform.' },
        { role: 'assistant', content: 'Tell me your budget and I can search the catalog.' },
        { role: 'user', content: 'My budget is KES 10,000.' },
        { role: 'assistant', content: 'Thanks — I will use that budget.' },
        { role: 'user', content: 'Which one would you recommend?' },
      ],
      context: {
        actingSubjectId: 'user-1',
        realm: 'customer',
        serviceJwt: 'test',
      },
    });

    expect(result.content).toMatch(/Writer Pro Platform/i);
    expect(result.content).not.toMatch(/Based on tool results/i);
    expect(result.products?.length).toBeGreaterThan(0);
  });
});
