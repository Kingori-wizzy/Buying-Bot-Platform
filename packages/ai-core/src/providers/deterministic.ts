import { createHash } from 'node:crypto';

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
    const lastUser = [...request.messages]
      .reverse()
      .find((m) => m.role === 'user');
    const prompt = lastUser?.content ?? '';
    const override = this.fixedReplies.get(prompt);
    const toolHint = request.tools?.[0];

    let content: string;
    let toolCalls: AiCompletionResponse['toolCalls'];

    if (override) {
      content = override;
    } else if (
      toolHint &&
      /price|stock|product|cart|order/i.test(prompt) &&
      !request.messages.some((m) => m.role === 'tool')
    ) {
      const args =
        toolHint.name === 'searchProducts'
          ? JSON.stringify({ query: prompt.slice(0, 80) })
          : toolHint.name === 'getOfferPrice'
            ? JSON.stringify({ offerId: 'deterministic-offer' })
            : JSON.stringify({});
      toolCalls = [
        {
          id: 'tool_det_1',
          name: toolHint.name,
          argumentsJson: args,
        },
      ];
      content = '';
    } else if (request.messages.some((m) => m.role === 'tool')) {
      const toolMsg = [...request.messages]
        .reverse()
        .find((m) => m.role === 'tool');
      content = `Based on tool results: ${toolMsg?.content ?? '{}'} (deterministic; not invented).`;
    } else {
      content =
        'I can help with catalog, cart, and orders using tools. I will not invent prices or stock.';
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
