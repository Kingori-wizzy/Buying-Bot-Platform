/**
 * Provider-agnostic AI ports. High-risk actions must require explicit authorization.
 * Never place secrets inside prompts.
 */

export type AiRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AiMessage {
  readonly role: AiRole;
  readonly content: string;
}

export interface AiCompletionRequest {
  readonly model: string;
  readonly messages: readonly AiMessage[];
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface AiCompletionResponse {
  readonly id: string;
  readonly content: string;
  readonly model: string;
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
}

export interface EmbeddingRequest {
  readonly model: string;
  readonly input: string;
}

export interface EmbeddingResponse {
  readonly model: string;
  readonly embedding: readonly number[];
}

/**
 * Model provider port — swap OpenAI/Anthropic/etc. via adapters.
 */
export interface ModelProvider {
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

/**
 * Guardrail: tools that mutate commerce state require elevated approval.
 */
export type ToolRiskLevel = 'read' | 'write' | 'payment' | 'admin';

export interface AiToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly riskLevel: ToolRiskLevel;
  readonly requiresHumanApproval: boolean;
}
