/**
 * Shared AI message / tool / streaming types (ADR-0015).
 */

export type AiRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AiMessage {
  readonly role: AiRole;
  readonly content: string;
  readonly name?: string;
  readonly toolCallId?: string;
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly argumentsJson: string;
}

export interface AiCompletionRequest {
  readonly model: string;
  readonly messages: readonly AiMessage[];
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly tools?: readonly ToolCallSchema[];
}

export interface ToolCallSchema {
  readonly name: string;
  readonly description: string;
  readonly parametersJsonSchema: Record<string, unknown>;
}

export interface AiCompletionResponse {
  readonly id: string;
  readonly content: string;
  readonly model: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
}

export type StreamChunk =
  | { readonly type: 'delta'; readonly text: string }
  | { readonly type: 'tool_call'; readonly toolCall: ToolCall }
  | {
      readonly type: 'usage';
      readonly usage: NonNullable<AiCompletionResponse['usage']>;
    }
  | { readonly type: 'done'; readonly id: string; readonly model: string };

export interface EmbeddingRequest {
  readonly model: string;
  readonly input: string;
}

export interface EmbeddingResponse {
  readonly model: string;
  readonly embedding: readonly number[];
  readonly dims: number;
}

export type ToolRiskLevel = 'read' | 'write' | 'payment' | 'admin';

export interface AiToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly riskLevel: ToolRiskLevel;
  readonly requiresHumanApproval: boolean;
  readonly parametersJsonSchema?: Record<string, unknown>;
}

export interface Citation {
  readonly chunkId: string;
  readonly documentId: string;
  readonly score: number;
  readonly excerpt: string;
}

export interface PromptTemplate {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly template: string;
  readonly description?: string;
}
