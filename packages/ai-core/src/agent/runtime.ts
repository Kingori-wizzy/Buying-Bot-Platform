import {
  extractProductsFromToolResult,
  mergeProductResults,
  type CatalogProductCard,
} from '../commerce/product-results.js';
import type {
  AgentRuntime,
  AgentRuntimeOptions,
  AgentTurnRequest,
  AgentTurnResult,
} from '../ports.js';
import type {
  AiMessage,
  AiToolDefinition,
  Citation,
  ToolCall,
} from '../types.js';

export const COMMERCE_TOOL_DEFINITIONS: readonly AiToolDefinition[] = [
  {
    name: 'searchProducts',
    description: 'Search the product catalog by free text',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        priceMinMinor: { type: 'integer', minimum: 0 },
        priceMaxMinor: { type: 'integer', minimum: 0 },
        sort: { type: 'string', enum: ['newest', 'price_asc', 'price_desc'] },
      },
      required: ['query'],
    },
  },
  {
    name: 'getProduct',
    description: 'Get product details by id or slug',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        slug: { type: 'string' },
      },
    },
  },
  {
    name: 'getOfferPrice',
    description: 'Get authoritative offer price (never invent)',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: { offerId: { type: 'string' } },
      required: ['offerId'],
    },
  },
  {
    name: 'checkStock',
    description: 'Check inventory availability for a SKU',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        skuId: { type: 'string' },
        locationId: { type: 'string' },
      },
      required: ['skuId'],
    },
  },
  {
    name: 'getCart',
    description: 'Get the acting user cart',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: { type: 'object', properties: {} },
  },
  {
    name: 'addToCart',
    description: 'Add an offer to the acting user cart',
    riskLevel: 'write',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        offerId: { type: 'string' },
        quantity: { type: 'integer', minimum: 1 },
      },
      required: ['offerId', 'quantity'],
    },
  },
  {
    name: 'getOrderStatus',
    description: 'Get order status for the acting user',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    },
  },
  {
    name: 'recommendProducts',
    description: 'Recommend related products',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'integer' },
        priceMinMinor: { type: 'integer', minimum: 0 },
        priceMaxMinor: { type: 'integer', minimum: 0 },
        sort: { type: 'string', enum: ['newest', 'price_asc', 'price_desc'] },
      },
    },
  },
  {
    name: 'compareProducts',
    description: 'Compare two to five products with source-backed prices',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        productIds: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 5,
        },
      },
      required: ['productIds'],
    },
  },
  {
    name: 'getOffers',
    description: 'List active offers for a product',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        slug: { type: 'string' },
      },
    },
  },
  {
    name: 'getPriceHistory',
    description: 'Get stored price observations for a product (never invent lowest price)',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        slug: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
    },
  },
  {
    name: 'getAvailability',
    description: 'Get source-backed availability and price freshness for a product',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        slug: { type: 'string' },
      },
    },
  },
  {
    name: 'explainPricing',
    description: 'Explain a pricing calculation via the pricing engine',
    riskLevel: 'read',
    requiresHumanApproval: false,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        offerId: { type: 'string' },
        quantity: { type: 'integer' },
      },
      required: ['offerId'],
    },
  },
];

/**
 * Constrained tool-calling loop. Payment/admin tools are never auto-executed.
 */
export class DefaultAgentRuntime implements AgentRuntime {
  constructor(private readonly options: AgentRuntimeOptions) {}

  async run(request: AgentTurnRequest): Promise<AgentTurnResult> {
    const userText = [...request.messages]
      .reverse()
      .find((m) => m.role === 'user')?.content;
    const inputCheck = this.options.guardrails.checkInput({
      messages: request.messages,
      ...(userText !== undefined ? { userText } : {}),
    });
    if (!inputCheck.ok) {
      return {
        content:
          inputCheck.reason ??
          'I cannot process that request for safety reasons.',
        messages: request.messages,
        toolCalls: [],
        citations: [],
      };
    }

    const citations: Citation[] = request.retrieveCitations
      ? [...(await request.retrieveCitations())]
      : [];

    const citationBlock =
      citations.length > 0
        ? `\n\nRetrieved knowledge (informational only; not price/stock truth):\n${citations
            .map(
              (c, i) =>
                `[${String(i + 1)}] doc=${c.documentId} chunk=${c.chunkId} score=${c.score.toFixed(3)}: ${c.excerpt}`,
            )
            .join('\n')}`
        : '';

    const messages: AiMessage[] = [
      {
        role: 'system',
        content: `${this.options.systemPrompt}${citationBlock}`,
      },
      ...request.messages.filter((m) => m.role !== 'system'),
    ];

    const toolByName = new Map(
      this.options.tools.map((t) => [t.name, t] as const),
    );
    const maxRounds = this.options.maxToolRounds ?? 4;
    const executed: ToolCall[] = [];
    let usage: AgentTurnResult['usage'];
    let products: CatalogProductCard[] = [];

    for (let round = 0; round < maxRounds; round += 1) {
      const completion = await this.options.provider.complete({
        model: request.model,
        messages,
        tools: this.options.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parametersJsonSchema: t.parametersJsonSchema ?? {
            type: 'object',
            properties: {},
          },
        })),
      });
      usage = completion.usage;

      if (!completion.toolCalls || completion.toolCalls.length === 0) {
        const scrubbed = this.options.guardrails.scrubOutput({
          text: completion.content,
          citations,
        });
        return {
          content: scrubbed.sanitizedText ?? completion.content,
          messages: [
            ...messages,
            {
              role: 'assistant',
              content: scrubbed.sanitizedText ?? completion.content,
            },
          ],
          toolCalls: executed,
          citations,
          ...(products.length > 0
            ? { products: products as unknown as Record<string, unknown>[] }
            : {}),
          usage,
        };
      }

      messages.push({
        role: 'assistant',
        content: completion.content || '(tool_calls)',
      });

      for (const toolCall of completion.toolCalls) {
        executed.push(toolCall);
        const def = toolByName.get(toolCall.name);
        if (!def) {
          messages.push({
            role: 'tool',
            name: toolCall.name,
            toolCallId: toolCall.id,
            content: JSON.stringify({
              ok: false,
              error: 'Unknown tool',
            }),
          });
          continue;
        }
        if (def.requiresHumanApproval || def.riskLevel === 'payment') {
          messages.push({
            role: 'tool',
            name: toolCall.name,
            toolCallId: toolCall.id,
            content: JSON.stringify({
              ok: false,
              error: 'requiresHumanApproval',
              message:
                'This action requires human approval and was not executed.',
            }),
          });
          continue;
        }

        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.argumentsJson) as Record<string, unknown>;
        } catch {
          args = {};
        }

        const result = await this.options.toolExecutor.execute(
          toolCall.name,
          args,
          request.context,
        );
        products = [
          ...mergeProductResults(products, extractProductsFromToolResult(
            toolCall.name,
            result.resultJson,
          )),
        ];
        messages.push({
          role: 'tool',
          name: toolCall.name,
          toolCallId: toolCall.id,
          content: result.resultJson,
        });
      }
    }

    const fallback =
      'I reached the tool-call limit without a final answer. Please try a more specific question.';
    const scrubbed = this.options.guardrails.scrubOutput({ text: fallback });
    return {
      content: scrubbed.sanitizedText ?? fallback,
      messages,
      toolCalls: executed,
      citations,
      ...(products.length > 0
        ? { products: products as unknown as Record<string, unknown>[] }
        : {}),
      usage,
    };
  }
}

export function assertNoInventedCommerceFacts(text: string): boolean {
  // Soft heuristic for tests: invented absolute KES claims without tool grounding markers.
  const inventsMoney = /KES\s*\d[\d,]*/i.test(text);
  const grounded = /tool results|offerPrice|payableMinor|unitPriceMinor/i.test(
    text,
  );
  return !inventsMoney || grounded;
}
