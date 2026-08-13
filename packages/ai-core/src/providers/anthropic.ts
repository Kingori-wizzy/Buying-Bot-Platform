import type { ModelProvider } from '../ports.js';
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  StreamChunk,
} from '../types.js';

/**
 * Anthropic Messages API adapter. Fails closed without credentials.
 */
export class AnthropicModelProvider implements ModelProvider {
  readonly name = 'anthropic';

  constructor(
    private readonly apiKey: string | undefined,
    private readonly baseUrl = 'https://api.anthropic.com/v1',
  ) {}

  private assertConfigured(): string {
    if (!this.apiKey) {
      throw new Error(
        'Anthropic provider is not configured (ANTHROPIC_API_KEY missing)',
      );
    }
    return this.apiKey;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = this.assertConfigured();
    const system = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');
    const messages = request.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens ?? 1024,
        ...(system ? { system } : {}),
        messages,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Anthropic complete failed: HTTP ${String(response.status)}`,
      );
    }
    const body = (await response.json()) as {
      id: string;
      model: string;
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (body.content ?? [])
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text ?? '')
      .join('');
    return {
      id: body.id,
      model: body.model,
      content: text,
      usage: {
        promptTokens: body.usage?.input_tokens ?? 0,
        completionTokens: body.usage?.output_tokens ?? 0,
        totalTokens:
          (body.usage?.input_tokens ?? 0) + (body.usage?.output_tokens ?? 0),
      },
    };
  }

  async *stream(request: AiCompletionRequest): AsyncIterable<StreamChunk> {
    const result = await this.complete(request);
    yield { type: 'delta', text: result.content };
    if (result.usage) {
      yield { type: 'usage', usage: result.usage };
    }
    yield { type: 'done', id: result.id, model: result.model };
  }

  embed(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    void _request;
    return Promise.reject(
      new Error(
        'Anthropic embed is not supported in this adapter; use OpenAI/Gemini embeddings',
      ),
    );
  }
}
