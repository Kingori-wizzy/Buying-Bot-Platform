/**
 * Provider-agnostic AI ports and adapters (ADR-0015).
 * AI never connects to PostgreSQL/Redis; commerce facts come from tools only.
 */

export {
  assertNoInventedCommerceFacts,
  COMMERCE_TOOL_DEFINITIONS,
  DefaultAgentRuntime,
} from './agent/runtime.js';
export {
  type ChunkOptions,
  chunkText,
  contentHash,
  type TextChunk,
} from './chunking/chunk-text.js';
export {
  type BudgetConstraint,
  enrichSearchToolArgs,
  extractBudgetFromConversation,
  extractBudgetFromText,
} from './commerce/budget-extraction.js';
export {
  type CatalogProductCard,
  extractProductsFromToolResult,
  formatDeterministicCommerceReply,
  mergeProductResults,
} from './commerce/product-results.js';
export { deriveCatalogSearchQuery } from './commerce/search-query.js';
export {
  DefaultGuardrails,
  scrubSecrets,
} from './guardrails/default-guardrails.js';
export type {
  AgentRuntime,
  AgentRuntimeOptions,
  AgentTurnRequest,
  AgentTurnResult,
  EmbeddingProvider,
  FailoverRouter,
  GuardrailInput,
  GuardrailOutput,
  GuardrailPort,
  GuardrailResult,
  ModelProvider,
  PromptTemplateRegistry,
  ProviderRegistry,
  ToolExecutorContext,
  ToolExecutorPort,
} from './ports.js';
export {
  COMMERCE_ASSISTANT_V1,
  defaultPrompts,
  InMemoryPromptRegistry,
} from './prompts/registry.js';
export { AnthropicModelProvider } from './providers/anthropic.js';
export {
  deterministicEmbedding,
  DeterministicModelProvider,
} from './providers/deterministic.js';
export { GeminiModelProvider } from './providers/gemini.js';
export { OllamaModelProvider } from './providers/ollama.js';
export { OpenAiModelProvider } from './providers/openai.js';
export {
  createProviderFromEnv,
  InMemoryProviderRegistry,
  type ProviderEnv,
  ProviderFailoverRouter,
} from './providers/registry.js';
export type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiMessage,
  AiRole,
  AiToolDefinition,
  Citation,
  EmbeddingRequest,
  EmbeddingResponse,
  PromptTemplate,
  StreamChunk,
  ToolCall,
  ToolCallSchema,
  ToolRiskLevel,
} from './types.js';
