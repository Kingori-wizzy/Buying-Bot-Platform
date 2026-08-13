import type { ModelProvider } from '../ports.js';
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  StreamChunk,
} from '../types.js';

/**
 * Google Gemini generateContent adapter. Fails closed without API key.
 */
export class GeminiModelProvider implements ModelProvider {
  readonly name = 'gemini';

  constructor(
    private readonly apiKey: string | undefined,
    private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
  ) {}

  private assertConfigured(): string {
    if (!this.apiKey) {
      throw new Error(
        'Gemini provider is not configured (GEMINI_API_KEY missing)',
      );
    }
    return this.apiKey;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = this.assertConfigured();
    const url = `${this.baseUrl}/models/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = request.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.2,
          maxOutputTokens: request.maxTokens ?? 1024,
        },
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Gemini complete failed: HTTP ${String(response.status)}`,
      );
    }
    const body = (await response.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
      }[];
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
    const text =
      body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ??
      '';
    return {
      id: `gemini-${Date.now().toString(36)}`,
      model: request.model,
      content: text,
      usage: {
        promptTokens: body.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: body.usageMetadata?.totalTokenCount ?? 0,
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

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const apiKey = this.assertConfigured();
    const url = `${this.baseUrl}/models/${encodeURIComponent(request.model)}:embedContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: request.input }] },
      }),
    });
    if (!response.ok) {
      throw new Error(`Gemini embed failed: HTTP ${String(response.status)}`);
    }
    const body = (await response.json()) as {
      embedding?: { values?: number[] };
    };
    const embedding = body.embedding?.values;
    if (!embedding) {
      throw new Error('Gemini embed returned empty vector');
    }
    return { model: request.model, embedding, dims: embedding.length };
  }
}
