import type {
  FailoverRouter,
  ModelProvider,
  ProviderRegistry,
} from '../ports.js';
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  StreamChunk,
} from '../types.js';
import { AnthropicModelProvider } from './anthropic.js';
import { DeterministicModelProvider } from './deterministic.js';
import { GeminiModelProvider } from './gemini.js';
import { OllamaModelProvider } from './ollama.js';
import { OpenAiModelProvider } from './openai.js';

export class InMemoryProviderRegistry implements ProviderRegistry {
  private readonly providers = new Map<string, ModelProvider>();

  get(name: string): ModelProvider | undefined {
    return this.providers.get(name);
  }

  list(): readonly string[] {
    return [...this.providers.keys()];
  }

  register(provider: ModelProvider): void {
    this.providers.set(provider.name, provider);
  }
}

/**
 * Tries providers in order; fails closed if all fail.
 */
export class ProviderFailoverRouter implements FailoverRouter {
  constructor(private readonly providers: readonly ModelProvider[]) {
    if (providers.length === 0) {
      throw new Error('FailoverRouter requires at least one provider');
    }
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    let lastError: unknown;
    for (const provider of this.providers) {
      try {
        return await provider.complete(request);
      } catch (error: unknown) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('All AI providers failed');
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    let lastError: unknown;
    for (const provider of this.providers) {
      try {
        return await provider.embed(request);
      } catch (error: unknown) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('All embedding providers failed');
  }

  async *stream(request: AiCompletionRequest): AsyncIterable<StreamChunk> {
    let lastError: unknown;
    for (const provider of this.providers) {
      try {
        if (provider.stream) {
          yield* provider.stream(request);
          return;
        }
        const result = await provider.complete(request);
        yield { type: 'delta', text: result.content };
        if (result.usage) {
          yield { type: 'usage', usage: result.usage };
        }
        yield { type: 'done', id: result.id, model: result.model };
        return;
      } catch (error: unknown) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('All AI stream providers failed');
  }
}

export interface ProviderEnv {
  readonly AI_PROVIDER: string;
  readonly OPENAI_API_KEY?: string | undefined;
  readonly ANTHROPIC_API_KEY?: string | undefined;
  readonly GEMINI_API_KEY?: string | undefined;
  readonly OLLAMA_BASE_URL?: string | undefined;
  readonly NODE_ENV: string;
  readonly AI_EMBEDDING_DIMS?: number | undefined;
}

/**
 * Resolve ModelProvider from env. Deterministic only for test or AI_PROVIDER=deterministic.
 * Real providers fail closed without credentials at call time.
 */
export function createProviderFromEnv(env: ProviderEnv): ModelProvider {
  const useDeterministic =
    env.NODE_ENV === 'test' || env.AI_PROVIDER === 'deterministic';

  if (useDeterministic) {
    return new DeterministicModelProvider(env.AI_EMBEDDING_DIMS ?? 1536);
  }

  switch (env.AI_PROVIDER) {
    case 'openai':
      return new OpenAiModelProvider(env.OPENAI_API_KEY);
    case 'anthropic':
      return new AnthropicModelProvider(env.ANTHROPIC_API_KEY);
    case 'gemini':
      return new GeminiModelProvider(env.GEMINI_API_KEY);
    case 'ollama':
      return new OllamaModelProvider(env.OLLAMA_BASE_URL);
    default:
      throw new Error(
        `Unknown AI_PROVIDER=${env.AI_PROVIDER}; set a real provider or AI_PROVIDER=deterministic`,
      );
  }
}
