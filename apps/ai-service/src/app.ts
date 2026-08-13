import { randomUUID } from 'node:crypto';

import {
  type Citation,
  COMMERCE_ASSISTANT_V1,
  COMMERCE_TOOL_DEFINITIONS,
  createProviderFromEnv,
  DefaultAgentRuntime,
  DefaultGuardrails,
  InMemoryPromptRegistry,
  type ModelProvider,
  type ToolExecutorPort,
} from '@buying-bot/ai-core';
import {
  type AiServiceEnv,
  aiServiceEnvSchema,
  loadEnv,
  resolveLogLevel,
} from '@buying-bot/config';
import {
  createLogger,
  installGracefulShutdown,
  type Logger,
  processHealthCheck,
} from '@buying-bot/utils';
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';

import { verifyBearerServiceJwt } from './auth/service-jwt.js';
import { InMemoryMetrics } from './metrics/registry.js';
import { ApiToolExecutor } from './orchestration/api-tool-executor.js';
import { retrieveCitations } from './orchestration/retrieve.js';
import { InMemoryRateLimiter } from './rate-limit/limiter.js';

export interface AiServiceRuntime {
  readonly stop: () => Promise<void>;
  readonly address: () => { host: string; port: number } | undefined;
  readonly env: AiServiceEnv;
  readonly metrics: InMemoryMetrics;
}

interface ChatBody {
  readonly messages?: { role: string; content: string }[];
  readonly conversationId?: string;
  readonly actingSubjectId?: string;
  readonly realm?: 'customer' | 'admin';
  readonly model?: string;
  readonly queryForRetrieve?: string;
  readonly enableTools?: boolean;
}

/**
 * AI service: model orchestration only — never talks to PostgreSQL/Redis for SoT.
 */
export async function bootstrap(
  envSource: NodeJS.ProcessEnv = process.env,
): Promise<AiServiceRuntime> {
  const env = loadEnv(aiServiceEnvSchema, envSource, 'AI_SERVICE');
  const logger = createLogger({
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    level: resolveLogLevel(env),
  });

  const provider = createProviderFromEnv(env);
  const guardrails = new DefaultGuardrails();
  const prompts = new InMemoryPromptRegistry();
  const metrics = new InMemoryMetrics();
  const rateLimiter = new InMemoryRateLimiter();
  const toolExecutor: ToolExecutorPort = new ApiToolExecutor(env.API_BASE_URL);

  const app = Fastify({ logger: false, trustProxy: true });

  registerHealth(app, env);
  registerMetrics(app, metrics);
  registerChatRoutes({
    app,
    env,
    logger,
    provider,
    guardrails,
    prompts,
    metrics,
    rateLimiter,
    toolExecutor,
  });

  const uninstall = installGracefulShutdown({
    logger,
    onShutdown: async () => {
      await app.close();
    },
  });

  await app.listen({ host: env.HOST, port: env.PORT });
  logger.info('AI service bootstrap complete', {
    provider: provider.name,
    apiBaseUrl: env.API_BASE_URL,
  });

  const addr = app.server.address();
  const port = addr && typeof addr === 'object' ? addr.port : env.PORT;
  const host = addr && typeof addr === 'object' ? addr.address : env.HOST;

  return {
    env,
    metrics,
    stop: async () => {
      uninstall();
      await app.close();
    },
    address: () => ({ host, port }),
  };
}

function registerHealth(app: FastifyInstance, env: AiServiceEnv): void {
  app.get('/health/live', () => ({
    status: 'ok',
    service: env.SERVICE_NAME,
  }));
  app.get('/livez', () => ({
    status: 'ok',
    service: env.SERVICE_NAME,
  }));
  app.get('/health/ready', (_req, reply) => {
    const check = processHealthCheck();
    if (check.status === 'error') {
      return reply.status(503).send({ status: 'error', checks: [check] });
    }
    return {
      status: 'ok',
      service: env.SERVICE_NAME,
      environment: env.NODE_ENV,
      checks: [check],
    };
  });
  app.get('/readyz', (_req, reply) => {
    const check = processHealthCheck();
    if (check.status === 'error') {
      return reply.status(503).send({ status: 'error', checks: [check] });
    }
    return { status: 'ok', service: env.SERVICE_NAME, checks: [check] };
  });
  app.get('/health', () => ({
    status: 'ok',
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    checks: [processHealthCheck()],
  }));
  app.get('/healthz', () => ({
    status: 'ok',
    service: env.SERVICE_NAME,
    checks: [processHealthCheck()],
  }));
}

function registerMetrics(app: FastifyInstance, metrics: InMemoryMetrics): void {
  app.get('/metrics', (_req, reply) => {
    void reply.header(
      'content-type',
      'text/plain; version=0.0.4; charset=utf-8',
    );
    return metrics.toPrometheus();
  });
}

function registerChatRoutes(deps: {
  readonly app: FastifyInstance;
  readonly env: AiServiceEnv;
  readonly logger: Logger;
  readonly provider: ModelProvider;
  readonly guardrails: DefaultGuardrails;
  readonly prompts: InMemoryPromptRegistry;
  readonly metrics: InMemoryMetrics;
  readonly rateLimiter: InMemoryRateLimiter;
  readonly toolExecutor: ToolExecutorPort;
}): void {
  const auth = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<boolean> => {
    try {
      await verifyBearerServiceJwt({
        authorization: request.headers.authorization,
        secret: deps.env.SERVICE_JWT_SECRET,
        audience: 'ai-service',
      });
      return true;
    } catch {
      void reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid service JWT' },
      });
      return false;
    }
  };

  deps.app.post('/v1/chat', async (request, reply) => {
    if (!(await auth(request, reply))) {
      return;
    }
    const body = (request.body ?? {}) as ChatBody;
    const subject =
      body.actingSubjectId ??
      headerString(request.headers['x-acting-subject']) ??
      'anonymous';
    const limited = deps.rateLimiter.tryConsume(`chat:${subject}`, 30, 60_000);
    if (!limited.ok) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many AI requests' },
      });
    }

    const started = Date.now();
    try {
      const result = await runChat(deps, body, subject, request);
      deps.metrics.inc('ai_chat_requests_total', { outcome: 'ok' });
      deps.metrics.observe('ai_chat_duration_ms', Date.now() - started);
      if (result.usage) {
        deps.logger.info('token usage', {
          model: body.model ?? deps.env.AI_DEFAULT_MODEL,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          conversationId: body.conversationId,
        });
        deps.metrics.inc(
          'ai_tokens_total',
          {
            type: 'prompt',
          },
          result.usage.promptTokens,
        );
        deps.metrics.inc(
          'ai_tokens_total',
          {
            type: 'completion',
          },
          result.usage.completionTokens,
        );
      }
      return result;
    } catch (error: unknown) {
      deps.metrics.inc('ai_chat_requests_total', { outcome: 'error' });
      deps.logger.error('chat failed', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      return reply.status(500).send({
        error: {
          code: 'AI_CHAT_FAILED',
          message:
            deps.env.NODE_ENV === 'production'
              ? 'Chat failed'
              : error instanceof Error
                ? error.message
                : 'Chat failed',
        },
      });
    }
  });

  deps.app.post('/v1/chat/stream', async (request, reply) => {
    if (!(await auth(request, reply))) {
      return;
    }
    const body = (request.body ?? {}) as ChatBody;
    const subject =
      body.actingSubjectId ??
      headerString(request.headers['x-acting-subject']) ??
      'anonymous';
    const limited = deps.rateLimiter.tryConsume(`chat:${subject}`, 30, 60_000);
    if (!limited.ok) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many AI requests' },
      });
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    });

    try {
      const result = await runChat(deps, body, subject, request);
      const chunkSize = 32;
      for (let i = 0; i < result.content.length; i += chunkSize) {
        const delta = result.content.slice(i, i + chunkSize);
        reply.raw.write(
          `data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`,
        );
      }
      reply.raw.write(
        `data: ${JSON.stringify({
          type: 'done',
          citations: result.citations,
          usage: result.usage,
        })}\n\n`,
      );
      deps.metrics.inc('ai_chat_stream_total', { outcome: 'ok' });
    } catch (error: unknown) {
      deps.metrics.inc('ai_chat_stream_total', { outcome: 'error' });
      reply.raw.write(
        `data: ${JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'stream failed',
        })}\n\n`,
      );
    } finally {
      reply.raw.end();
    }
  });

  deps.app.post('/v1/embed', async (request, reply) => {
    if (!(await auth(request, reply))) {
      return;
    }
    const body = (request.body ?? {}) as { input?: string; model?: string };
    if (!body.input) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'input required' },
      });
    }
    const embedding = await deps.provider.embed({
      model: body.model ?? deps.env.AI_EMBEDDING_MODEL,
      input: body.input,
    });
    return embedding;
  });
}

async function runChat(
  deps: {
    readonly env: AiServiceEnv;
    readonly provider: ModelProvider;
    readonly guardrails: DefaultGuardrails;
    readonly prompts: InMemoryPromptRegistry;
    readonly toolExecutor: ToolExecutorPort;
  },
  body: ChatBody,
  subject: string,
  request: FastifyRequest,
): Promise<{
  readonly id: string;
  readonly content: string;
  readonly citations: readonly Citation[];
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
}> {
  const messages = (body.messages ?? [])
    .filter(
      (m): m is { role: 'user' | 'assistant' | 'system'; content: string } =>
        (m.role === 'user' || m.role === 'assistant' || m.role === 'system') &&
        typeof m.content === 'string',
    )
    .map((m) => ({ role: m.role, content: m.content }));

  const serviceJwt =
    typeof request.headers.authorization === 'string'
      ? request.headers.authorization.replace(/^Bearer\s+/i, '')
      : '';

  const system =
    deps.prompts.get('commerce-assistant')?.template ?? COMMERCE_ASSISTANT_V1;

  const enableTools = body.enableTools !== false;
  const runtime = new DefaultAgentRuntime({
    provider: deps.provider,
    tools: enableTools ? COMMERCE_TOOL_DEFINITIONS : [],
    toolExecutor: deps.toolExecutor,
    guardrails: deps.guardrails,
    systemPrompt: system,
  });

  const correlationId = headerString(request.headers['x-correlation-id']);
  const result = await runtime.run({
    model: body.model ?? deps.env.AI_DEFAULT_MODEL,
    messages,
    context: {
      actingSubjectId: subject,
      realm: body.realm ?? 'customer',
      serviceJwt,
      ...(body.conversationId ? { conversationId: body.conversationId } : {}),
      ...(correlationId ? { correlationId } : {}),
    },
    retrieveCitations: async () => {
      const q =
        body.queryForRetrieve ??
        [...messages].reverse().find((m) => m.role === 'user')?.content;
      if (!q) {
        return [];
      }
      return retrieveCitations({
        apiBaseUrl: deps.env.API_BASE_URL,
        serviceJwt,
        query: q,
      });
    },
  });

  return {
    id: randomUUID(),
    content: result.content,
    citations: result.citations,
    ...(result.usage ? { usage: result.usage } : {}),
  };
}

function headerString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value[0]) {
    return value[0];
  }
  return undefined;
}
