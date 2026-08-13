import type { ModelProvider } from '../ports.js';
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  StreamChunk,
} from '../types.js';

/**
 * OpenAI HTTP adapter (fetch). Fails closed when API key is missing.
 */
export class OpenAiModelProvider implements ModelProvider {
  readonly name = 'openai';

  constructor(
    private readonly apiKey: string | undefined,
    private readonly baseUrl = 'https://api.openai.com/v1',
  ) {}

  private assertConfigured(): string {
    if (!this.apiKey) {
      throw new Error(
        'OpenAI provider is not configured (OPENAI_API_KEY missing)',
      );
    }
    return this.apiKey;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = this.assertConfigured();
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.name ? { name: m.name } : {}),
        })),
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 1024,
        ...(request.tools && request.tools.length > 0
          ? {
              tools: request.tools.map((t) => ({
                type: 'function',
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: t.parametersJsonSchema,
                },
              })),
            }
          : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(
        `OpenAI complete failed: HTTP ${String(response.status)}`,
      );
    }
    const body = (await response.json()) as {
      id: string;
      model: string;
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: {
            id: string;
            function: { name: string; arguments: string };
          }[];
        };
      }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };
    const message = body.choices?.[0]?.message;
    const toolCalls = message?.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      argumentsJson: tc.function.arguments,
    }));
    return {
      id: body.id,
      model: body.model,
      content: message?.content ?? '',
      ...(toolCalls ? { toolCalls } : {}),
      usage: {
        promptTokens: body.usage?.prompt_tokens ?? 0,
        completionTokens: body.usage?.completion_tokens ?? 0,
        totalTokens: body.usage?.total_tokens ?? 0,
      },
    };
  }

  async *stream(request: AiCompletionRequest): AsyncIterable<StreamChunk> {
    // Prefer complete + synthetic stream when streaming parse is heavy; still real HTTP complete.
    const result = await this.complete(request);
    yield { type: 'delta', text: result.content };
    if (result.usage) {
      yield { type: 'usage', usage: result.usage };
    }
    yield { type: 'done', id: result.id, model: result.model };
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const apiKey = this.assertConfigured();
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        input: request.input,
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI embed failed: HTTP ${String(response.status)}`);
    }
    const body = (await response.json()) as {
      data?: { embedding: number[] }[];
      model: string;
    };
    const embedding = body.data?.[0]?.embedding;
    if (!embedding) {
      throw new Error('OpenAI embed returned empty vector');
    }
    return { model: body.model, embedding, dims: embedding.length };
  }
}
