import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiMessage,
  AiToolDefinition,
  Citation,
  EmbeddingRequest,
  EmbeddingResponse,
  PromptTemplate,
  StreamChunk,
  ToolCall,
} from './types.js';

/**
 * Model completion + optional streaming. Embeddings may live here or on
 * EmbeddingProvider (default: ModelProvider.embed).
 */
export interface ModelProvider {
  readonly name: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  stream?(request: AiCompletionRequest): AsyncIterable<StreamChunk>;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

export interface EmbeddingProvider {
  readonly name: string;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

export interface GuardrailInput {
  readonly messages: readonly AiMessage[];
  readonly userText?: string;
}

export interface GuardrailOutput {
  readonly text: string;
  readonly citations?: readonly Citation[];
}

export interface GuardrailResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly sanitizedText?: string;
}

export interface GuardrailPort {
  checkInput(input: GuardrailInput): GuardrailResult;
  scrubOutput(output: GuardrailOutput): GuardrailResult;
}

export interface PromptTemplateRegistry {
  get(id: string, version?: string): PromptTemplate | undefined;
  list(): readonly PromptTemplate[];
  register(template: PromptTemplate): void;
}

export interface ProviderRegistry {
  get(name: string): ModelProvider | undefined;
  list(): readonly string[];
  register(provider: ModelProvider): void;
}

export interface FailoverRouter {
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  stream?(request: AiCompletionRequest): AsyncIterable<StreamChunk>;
}

export interface ToolExecutorContext {
  readonly actingSubjectId: string;
  readonly realm: 'customer' | 'admin';
  readonly conversationId?: string;
  readonly serviceJwt: string;
  readonly correlationId?: string;
}

export interface ToolExecutorPort {
  execute(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutorContext,
  ): Promise<{ readonly resultJson: string; readonly ok: boolean }>;
}

export interface AgentRuntimeOptions {
  readonly provider: ModelProvider;
  readonly tools: readonly AiToolDefinition[];
  readonly toolExecutor: ToolExecutorPort;
  readonly guardrails: GuardrailPort;
  readonly systemPrompt: string;
  readonly maxToolRounds?: number;
}

export interface AgentTurnRequest {
  readonly messages: readonly AiMessage[];
  readonly context: ToolExecutorContext;
  readonly model: string;
  readonly retrieveCitations?: () => Promise<readonly Citation[]>;
}

export interface AgentTurnResult {
  readonly content: string;
  readonly messages: readonly AiMessage[];
  readonly toolCalls: readonly ToolCall[];
  readonly citations: readonly Citation[];
  readonly products?: readonly Record<string, unknown>[];
  readonly usage?: AiCompletionResponse['usage'];
}

export interface AgentRuntime {
  run(request: AgentTurnRequest): Promise<AgentTurnResult>;
}
