import { createHash } from 'node:crypto';

import {
  enrichSearchToolArgs,
  extractBudgetFromConversation,
} from '../commerce/budget-extraction.js';
import {
  extractProductsFromToolResult,
  formatDeterministicCommerceReply,
} from '../commerce/product-results.js';
import { deriveCatalogSearchQuery } from '../commerce/search-query.js';
import type { ModelProvider } from '../ports.js';
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  StreamChunk,
} from '../types.js';

/**
 * Deterministic provider for tests and local fail-closed defaults.
 * Use only when NODE_ENV=test or AI_PROVIDER=deterministic.
 */
export class DeterministicModelProvider implements ModelProvider {
  readonly name = 'deterministic';

  constructor(
    private readonly dims = 1536,
    private readonly fixedReplies: ReadonlyMap<string, string> = new Map(),
  ) {}

  complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const userMessages = request.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content);
    const lastUser = [...userMessages].reverse()[0];
    const prompt = lastUser ?? '';
    const conversationText = userMessages.join('\n');
    const override = this.fixedReplies.get(prompt);
    const toolHint = request.tools?.find(
      (t) => t.name === 'searchProducts' || t.name === 'recommendProducts',
    );

    let content: string;
    let toolCalls: AiCompletionResponse['toolCalls'];

    if (override) {
      content = override;
    } else if (request.messages.some((m) => m.role === 'tool')) {
      const toolMsg = [...request.messages]
        .reverse()
        .find((m) => m.role === 'tool');
      const toolName = toolMsg?.name ?? 'searchProducts';
      const products = extractProductsFromToolResult(
        toolName,
        toolMsg?.content ?? '{}',
      );
      content = formatDeterministicCommerceReply({
        userMessages,
        toolName,
        ...(toolMsg?.content ? { toolResultJson: toolMsg.content } : {}),
        products,
      });
    } else if (toolHint && this.shouldInvokeCatalogTool(conversationText)) {
      const enriched = enrichSearchToolArgs(
        { query: this.buildSearchQuery(userMessages) },
        userMessages,
      );
      const budget = extractBudgetFromConversation(userMessages);
      if (budget?.ambiguous && !budget.priceMinMinor && !budget.priceMaxMinor) {
        content =
          'Could you confirm your budget more precisely? For example, "under KES 30,000" or "between 20k and 40k" helps me search the catalog accurately.';
      } else {
        toolCalls = [
          {
            id: 'tool_det_1',
            name: toolHint.name,
            argumentsJson: JSON.stringify(enriched),
          },
        ];
        content = '';
      }
    } else if (this.shouldInvokeCatalogTool(conversationText)) {
      content =
        'I can search the shop catalog for matching platforms. Tell me more about what you need, or share your budget so I can narrow the results.';
    } else {
      content =
        'I can help you find digital platforms in our shop, compare options, and check live catalog prices. What type of platform are you looking for?';
    }

    const promptTokens = estimateTokens(
      request.messages.map((m) => m.content).join(' '),
    );
    const completionTokens = estimateTokens(content);

    return Promise.resolve({
      id: `det-${createHash('sha256').update(prompt).digest('hex').slice(0, 12)}`,
      content,
      model: request.model,
      ...(toolCalls ? { toolCalls } : {}),
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    });
  }

  async *stream(request: AiCompletionRequest): AsyncIterable<StreamChunk> {
    const result = await this.complete(request);
    const chunkSize = 24;
    for (let i = 0; i < result.content.length; i += chunkSize) {
      yield {
        type: 'delta',
        text: result.content.slice(i, i + chunkSize),
      };
    }
    if (result.toolCalls) {
      for (const toolCall of result.toolCalls) {
        yield { type: 'tool_call', toolCall };
      }
    }
    if (result.usage) {
      yield { type: 'usage', usage: result.usage };
    }
    yield { type: 'done', id: result.id, model: result.model };
  }

  embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const embedding = deterministicEmbedding(request.input, this.dims);
    return Promise.resolve({
      model: request.model,
      embedding,
      dims: this.dims,
    });
  }

  private shouldInvokeCatalogTool(conversationText: string): boolean {
    return /platform|product|catalog|recommend|budget|price|writing|marketing|payout|survey|moderation|compare|cheapest|which one|under|below|between|k\b/i.test(
      conversationText,
    );
  }

  private buildSearchQuery(userMessages: readonly string[]): string {
    return deriveCatalogSearchQuery(userMessages);
  }
}

export function deterministicEmbedding(input: string, dims: number): number[] {
  const out = new Array<number>(dims);
  const digest = createHash('sha256').update(input).digest();
  for (let i = 0; i < dims; i += 1) {
    const byte = digest[i % digest.length] ?? 0;
    out[i] = (byte / 255) * 2 - 1;
  }
  // L2 normalize for cosine similarity stability in tests.
  let norm = 0;
  for (const v of out) {
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  return out.map((v) => v / norm);
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
