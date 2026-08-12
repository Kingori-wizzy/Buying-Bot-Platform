import type { LogLevel, NodeEnvironment } from '@buying-bot/types';
import { z } from '@buying-bot/validation';

export const nodeEnvironmentSchema = z.enum([
  'development',
  'test',
  'staging',
  'production',
]);

export const logLevelSchema = z.enum([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
]);

const productionGuards = (
  value: {
    NODE_ENV: NodeEnvironment;
    SERVICE_NAME: string;
    PORT: number;
  },
  ctx: z.RefinementCtx,
): void => {
  if (value.NODE_ENV !== 'production') {
    return;
  }
  if (value.PORT === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PORT'],
      message: 'PORT must be a fixed listening port in production',
    });
  }
  if (value.SERVICE_NAME.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SERVICE_NAME'],
      message: 'SERVICE_NAME is required in production',
    });
  }
};

/**
 * Base environment shared by all Node deployables.
 * Production forbids silent unsafe defaults for service identity.
 */
export const baseServiceEnvObjectSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default('development'),
  SERVICE_NAME: z.string().trim().min(1),
  LOG_LEVEL: logLevelSchema.optional(),
  HOST: z.string().trim().min(1).default('0.0.0.0'),
  /** Port `0` requests an ephemeral port (useful for tests). */
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
});

export const baseServiceEnvSchema =
  baseServiceEnvObjectSchema.superRefine(productionGuards);

export type BaseServiceEnv = z.infer<typeof baseServiceEnvObjectSchema> & {
  NODE_ENV: NodeEnvironment;
  LOG_LEVEL?: LogLevel;
};

export const apiEnvSchema = baseServiceEnvObjectSchema
  .extend({
    SERVICE_NAME: z.string().trim().min(1).default('api'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    CORS_ORIGIN: z.string().trim().min(1).default('http://localhost:3001'),
  })
  .superRefine(productionGuards);

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const workerEnvSchema = baseServiceEnvObjectSchema
  .extend({
    SERVICE_NAME: z.string().trim().min(1).default('worker'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3002),
  })
  .superRefine(productionGuards);

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export const aiServiceEnvSchema = baseServiceEnvObjectSchema
  .extend({
    SERVICE_NAME: z.string().trim().min(1).default('ai-service'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3003),
  })
  .superRefine(productionGuards);

export type AiServiceEnv = z.infer<typeof aiServiceEnvSchema>;

export class ConfigError extends Error {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[]) {
    super(message);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

/**
 * Load and validate environment variables. Fails fast on invalid config.
 * Never substitutes unsafe production defaults for required secrets.
 */
export function loadEnv<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  env: NodeJS.ProcessEnv = process.env,
  label = 'Environment',
): z.infer<TSchema> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new ConfigError(`${label} validation failed`, issues);
  }
  return result.data as z.infer<TSchema>;
}

/**
 * Resolve effective log level with environment-aware defaults.
 */
export function resolveLogLevel(env: {
  NODE_ENV: NodeEnvironment;
  LOG_LEVEL?: LogLevel | undefined;
}): LogLevel {
  if (env.LOG_LEVEL !== undefined) {
    return env.LOG_LEVEL;
  }
  return env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Production must not use wildcard CORS.
 */
export function assertSafeCorsOrigin(
  origin: string,
  nodeEnv: NodeEnvironment,
): void {
  if (nodeEnv === 'production' && (origin === '*' || origin.trim() === '')) {
    throw new ConfigError('CORS_ORIGIN is unsafe for production', [
      'CORS_ORIGIN: wildcard or empty origin is forbidden in production',
    ]);
  }
}
