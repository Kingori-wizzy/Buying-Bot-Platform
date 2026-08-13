import type { ModelProvider } from '../ports.js';
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  StreamChunk,
} from '../types.js';

/**
 * Local Ollama HTTP adapter. Fails closed when base URL unreachable / unset.
 */
export class OllamaModelProvider implements ModelProvider {
  readonly name = 'ollama';

  constructor(private readonly baseUrl: string | undefined) {}

  private assertConfigured(): string {
    if (!this.baseUrl) {
      throw new Error(
        'Ollama provider is not configured (OLLAMA_BASE_URL missing)',
      );
    }
    return this.baseUrl.replace(/\/$/, '');
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const baseUrl = this.assertConfigured();
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        stream: false,
        messages: request.messages.map((m) => ({
          role: m.role === 'tool' ? 'user' : m.role,
          content: m.content,
        })),
        options: {
          temperature: request.temperature ?? 0.2,
          num_predict: request.maxTokens ?? 1024,
        },
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Ollama complete failed: HTTP ${String(response.status)}`,
      );
    }
    const body = (await response.json()) as {
      message?: { content?: string };
      model?: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };
    return {
      id: `ollama-${Date.now().toString(36)}`,
      model: body.model ?? request.model,
      content: body.message?.content ?? '',
      usage: {
        promptTokens: body.prompt_eval_count ?? 0,
        completionTokens: body.eval_count ?? 0,
        totalTokens: (body.prompt_eval_count ?? 0) + (body.eval_count ?? 0),
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
    const baseUrl = this.assertConfigured();
    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        prompt: request.input,
      }),
    });
    if (!response.ok) {
      throw new Error(`Ollama embed failed: HTTP ${String(response.status)}`);
    }
    const body = (await response.json()) as { embedding?: number[] };
    const embedding = body.embedding;
    if (!embedding) {
      throw new Error('Ollama embed returned empty vector');
    }
    return { model: request.model, embedding, dims: embedding.length };
  }
}
