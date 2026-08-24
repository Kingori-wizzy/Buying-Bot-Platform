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

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value): boolean | undefined => {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
    return undefined;
  });

export const apiEnvObjectSchema = baseServiceEnvObjectSchema.extend({
  SERVICE_NAME: z.string().trim().min(1).default('api'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  CORS_ORIGIN: z.string().trim().min(1).default('http://localhost:3001'),
  DATABASE_URL: z.string().trim().min(1).optional(),
  REDIS_URL: z.string().trim().min(1).optional(),
  SESSION_SECRET: z.string().trim().min(1).optional(),
  SERVICE_JWT_SECRET: z.string().trim().min(1).optional(),
  COOKIE_SECURE: booleanFromEnv,
  CUSTOMER_SESSION_COOKIE: z.string().trim().min(1).default('bb_cust_session'),
  ADMIN_SESSION_COOKIE: z.string().trim().min(1).default('bb_admin_session'),
  CSRF_COOKIE: z.string().trim().min(1).default('bb_csrf'),
  CUSTOMER_SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 7),
  ADMIN_SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 8),
  CUSTOMER_SESSION_ABSOLUTE_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),
  ADMIN_SESSION_ABSOLUTE_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24),
  /** When true, admin login requires TOTP. Default false (password-only). */
  ADMIN_MFA_REQUIRED: booleanFromEnv,
  STEP_UP_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 15),
  DEFAULT_CURRENCY: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .default('KES'),
  GUEST_CART_COOKIE: z.string().trim().min(1).default('bb_guest_cart'),
  CART_RESERVATION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 15),
  TAX_REQUIRED: booleanFromEnv,
  TAX_DEFAULT_RATE_BPS: z.coerce.number().int().min(0).max(100_000).optional(),
  TAX_POLICY_CODE: z.string().trim().min(1).default('DEFAULT'),
  SHIPPING_DEFAULT_CODE: z.string().trim().min(1).default('FLAT'),
  PAYMENTS_ENABLED: booleanFromEnv,
  /** Active payment rail: escrow (default) | mpesa (deferred). */
  PAYMENT_PROVIDER: z.enum(['escrow', 'mpesa']).default('escrow'),
  ESCROW_API_KEY: z.string().trim().min(1).optional(),
  ESCROW_API_SECRET: z.string().trim().min(1).optional(),
  ESCROW_BASE_URL: z.string().trim().url().optional(),
  ESCROW_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
  /** Test-only: allow escrow test double without live credentials. Never enable in production. */
  ESCROW_ALLOW_TEST_DOUBLE: booleanFromEnv,
  PUBLIC_API_BASE_URL: z.string().trim().url().optional(),
  /** Canonical public URLs for preflight/docs (web, admin, API). */
  PUBLIC_WEB_URL: z.string().trim().url().optional(),
  PUBLIC_ADMIN_URL: z.string().trim().url().optional(),
  PUBLIC_API_URL: z.string().trim().url().optional(),
  /** Hostnames without scheme (nginx / DNS). Example: shop.example.com */
  SHOP_DOMAIN: z.string().trim().min(1).optional(),
  ADMIN_DOMAIN: z.string().trim().min(1).optional(),
  API_DOMAIN: z.string().trim().min(1).optional(),
  /** Alias for S3_ACCESS_KEY_ID (AWS-style naming). */
  S3_ACCESS_KEY: z.string().trim().min(1).optional(),
  /** Alias for S3_SECRET_ACCESS_KEY. */
  S3_SECRET_KEY: z.string().trim().min(1).optional(),
  /** Explicit opt-in — M-Pesa is deferred from customer UX. */
  MPESA_ENABLED: booleanFromEnv,
  MPESA_CONSUMER_KEY: z.string().trim().min(1).optional(),
  MPESA_CONSUMER_SECRET: z.string().trim().min(1).optional(),
  MPESA_SHORTCODE: z.string().trim().min(1).optional(),
  MPESA_PASSKEY: z.string().trim().min(1).optional(),
  MPESA_CALLBACK_URL: z.string().trim().url().optional(),
  MPESA_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
  MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  WEBHOOK_REPLAY_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(300),
  MEDIA_LOCAL_ROOT: z.string().trim().min(1).optional(),
  MEDIA_PUBLIC_BASE_URL: z.string().trim().url().optional(),
  MEDIA_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
  /** local (dev) | s3 | minio */
  MEDIA_DRIVER: z.enum(['local', 's3', 'minio']).default('local'),
  S3_ENDPOINT: z.string().trim().url().optional(),
  S3_REGION: z.string().trim().min(1).default('us-east-1'),
  S3_BUCKET: z.string().trim().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
  S3_FORCE_PATH_STYLE: booleanFromEnv,
  AI_SERVICE_BASE_URL: z.string().trim().url().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().trim().url().optional(),
  PRODUCT_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  /**
   * When false (default), marketplace product-source sync cannot populate the shop.
   * Admin-managed catalog is the production source of truth.
   */
  MARKETPLACE_INGESTION_ENABLED: booleanFromEnv,
});

export const apiEnvSchema = apiEnvObjectSchema
  .superRefine(productionGuards)
  .superRefine((value, ctx) => {
    const requiresSecrets =
      value.NODE_ENV === 'production' || value.NODE_ENV === 'staging';

    if (requiresSecrets) {
      if (!value.DATABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL is required in staging/production',
        });
      }
      if (!value.SESSION_SECRET || value.SESSION_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SESSION_SECRET'],
          message:
            'SESSION_SECRET must be at least 32 characters in staging/production',
        });
      }
      if (!value.SERVICE_JWT_SECRET || value.SERVICE_JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SERVICE_JWT_SECRET'],
          message:
            'SERVICE_JWT_SECRET must be at least 32 characters in staging/production',
        });
      }
      if (value.COOKIE_SECURE !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in staging/production',
        });
      }
    }

    const paymentsEnabled = value.PAYMENTS_ENABLED === true;
    if (paymentsEnabled && requiresSecrets) {
      const provider = value.PAYMENT_PROVIDER;
      if (provider === 'escrow') {
        for (const key of [
          'ESCROW_API_KEY',
          'ESCROW_API_SECRET',
          'ESCROW_BASE_URL',
          'ESCROW_WEBHOOK_SECRET',
        ] as const) {
          if (!value[key]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [key],
              message: `${key} is required when PAYMENTS_ENABLED with PAYMENT_PROVIDER=escrow in staging/production`,
            });
          }
        }
        if (value.ESCROW_ALLOW_TEST_DOUBLE === true) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ESCROW_ALLOW_TEST_DOUBLE'],
            message:
              'ESCROW_ALLOW_TEST_DOUBLE must be false in staging/production',
          });
        }
      } else if (value.MPESA_ENABLED === true) {
        for (const key of [
          'MPESA_CONSUMER_KEY',
          'MPESA_CONSUMER_SECRET',
          'MPESA_SHORTCODE',
          'MPESA_PASSKEY',
          'MPESA_CALLBACK_URL',
          'MPESA_WEBHOOK_SECRET',
        ] as const) {
          if (!value[key]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [key],
              message: `${key} is required when PAYMENTS_ENABLED with M-Pesa in staging/production`,
            });
          }
        }
      }
    }

    if (
      requiresSecrets &&
      (value.MEDIA_DRIVER === 's3' || value.MEDIA_DRIVER === 'minio')
    ) {
      for (const key of [
        'S3_ENDPOINT',
        'S3_BUCKET',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when MEDIA_DRIVER is s3/minio in staging/production`,
          });
        }
      }
    }
  })
  .transform((value) => {
    const isTest = value.NODE_ENV === 'test';
    const sessionSecret =
      value.SESSION_SECRET ??
      (isTest
        ? 'test-session-secret-at-least-32-chars!!'
        : value.NODE_ENV === 'development'
          ? 'dev-session-secret-at-least-32-chars!!'
          : undefined);
    const serviceJwtSecret =
      value.SERVICE_JWT_SECRET ??
      (isTest
        ? 'test-service-jwt-secret-at-least-32!!'
        : value.NODE_ENV === 'development'
          ? 'dev-service-jwt-secret-at-least-32!!'
          : undefined);

    return {
      ...value,
      SESSION_SECRET: sessionSecret ?? 'dev-session-secret-at-least-32-chars!!',
      SERVICE_JWT_SECRET:
        serviceJwtSecret ?? 'dev-service-jwt-secret-at-least-32!!',
      COOKIE_SECURE:
        value.COOKIE_SECURE ??
        (value.NODE_ENV === 'production' || value.NODE_ENV === 'staging'),
      TAX_REQUIRED: value.TAX_REQUIRED ?? false,
      PAYMENTS_ENABLED: value.PAYMENTS_ENABLED ?? false,
      PAYMENT_PROVIDER: value.PAYMENT_PROVIDER,
      ESCROW_ALLOW_TEST_DOUBLE: value.ESCROW_ALLOW_TEST_DOUBLE ?? false,
      MPESA_ENABLED: value.MPESA_ENABLED ?? false,
      ADMIN_MFA_REQUIRED: value.ADMIN_MFA_REQUIRED ?? false,
      MARKETPLACE_INGESTION_ENABLED:
        value.MARKETPLACE_INGESTION_ENABLED ?? false,
      S3_FORCE_PATH_STYLE: value.S3_FORCE_PATH_STYLE ?? true,
      MEDIA_DRIVER: value.MEDIA_DRIVER,
    };
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const workerEnvSchema = baseServiceEnvObjectSchema
  .extend({
    SERVICE_NAME: z.string().trim().min(1).default('worker'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3002),
    DATABASE_URL: z.string().trim().min(1).optional(),
    OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
    RESERVATION_EXPIRE_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(30_000),
    PAYMENT_RECONCILE_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60_000),
    NOTIFICATION_POLL_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5_000),
    KNOWLEDGE_INGEST_POLL_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(10_000),
    AI_SERVICE_BASE_URL: z.string().trim().url().optional(),
    SERVICE_JWT_SECRET: z.string().trim().min(1).optional(),
    AI_PROVIDER: z
      .enum(['deterministic', 'openai', 'anthropic', 'gemini', 'ollama'])
      .default('deterministic'),
    MPESA_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
    MPESA_CONSUMER_KEY: z.string().trim().min(1).optional(),
    MPESA_CONSUMER_SECRET: z.string().trim().min(1).optional(),
    MPESA_SHORTCODE: z.string().trim().min(1).optional(),
    MPESA_PASSKEY: z.string().trim().min(1).optional(),
    MPESA_CALLBACK_URL: z.string().trim().url().optional(),
    MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
    MPESA_ENABLED: booleanFromEnv,
    PAYMENT_PROVIDER: z.enum(['escrow', 'mpesa']).default('escrow'),
    ESCROW_API_KEY: z.string().trim().min(1).optional(),
    ESCROW_API_SECRET: z.string().trim().min(1).optional(),
    ESCROW_BASE_URL: z.string().trim().url().optional(),
    ESCROW_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
    ESCROW_ALLOW_TEST_DOUBLE: booleanFromEnv,
    PUBLIC_API_BASE_URL: z.string().trim().url().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().trim().url().optional(),
    SMTP_URL: z.string().trim().min(1).optional(),
    WHATSAPP_ACCESS_TOKEN: z.string().trim().min(1).optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().trim().min(1).optional(),
  })
  .superRefine(productionGuards)
  .transform((value) => {
    const isTest = value.NODE_ENV === 'test';
    const serviceJwtSecret =
      value.SERVICE_JWT_SECRET ??
      (isTest
        ? 'test-service-jwt-secret-at-least-32!!'
        : value.NODE_ENV === 'development'
          ? 'dev-service-jwt-secret-at-least-32!!'
          : undefined);
    return {
      ...value,
      SERVICE_JWT_SECRET:
        serviceJwtSecret ?? 'dev-service-jwt-secret-at-least-32!!',
      MPESA_ENABLED: value.MPESA_ENABLED ?? false,
      ESCROW_ALLOW_TEST_DOUBLE: value.ESCROW_ALLOW_TEST_DOUBLE ?? false,
      PAYMENT_PROVIDER: value.PAYMENT_PROVIDER,
    };
  });

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export const aiServiceEnvSchema = baseServiceEnvObjectSchema
  .extend({
    SERVICE_NAME: z.string().trim().min(1).default('ai-service'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3003),
    AI_PROVIDER: z
      .enum(['deterministic', 'openai', 'anthropic', 'gemini', 'ollama'])
      .optional(),
    OPENAI_API_KEY: z.string().trim().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
    GEMINI_API_KEY: z.string().trim().min(1).optional(),
    OLLAMA_BASE_URL: z.string().trim().url().optional(),
    SERVICE_JWT_SECRET: z.string().trim().min(1).optional(),
    API_BASE_URL: z.string().trim().url().optional(),
    REDIS_URL: z.string().trim().min(1).optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().trim().url().optional(),
    AI_DEFAULT_MODEL: z.string().trim().min(1).default('deterministic-v1'),
    AI_EMBEDDING_MODEL: z
      .string()
      .trim()
      .min(1)
      .default('deterministic-embed-v1'),
    AI_EMBEDDING_DIMS: z.coerce.number().int().positive().default(1536),
  })
  .superRefine(productionGuards)
  .superRefine((value, ctx) => {
    const requiresSecrets =
      value.NODE_ENV === 'production' || value.NODE_ENV === 'staging';
    if (requiresSecrets) {
      if (!value.SERVICE_JWT_SECRET || value.SERVICE_JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SERVICE_JWT_SECRET'],
          message:
            'SERVICE_JWT_SECRET must be at least 32 characters in staging/production',
        });
      }
      if (!value.API_BASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['API_BASE_URL'],
          message: 'API_BASE_URL is required in staging/production',
        });
      }
    }
  })
  .transform((value) => {
    const isTest = value.NODE_ENV === 'test';
    const provider =
      value.AI_PROVIDER ??
      (isTest || value.NODE_ENV === 'development'
        ? 'deterministic'
        : undefined);
    const serviceJwtSecret =
      value.SERVICE_JWT_SECRET ??
      (isTest
        ? 'test-service-jwt-secret-at-least-32!!'
        : value.NODE_ENV === 'development'
          ? 'dev-service-jwt-secret-at-least-32!!'
          : undefined);
    return {
      ...value,
      AI_PROVIDER: provider ?? 'deterministic',
      SERVICE_JWT_SECRET:
        serviceJwtSecret ?? 'dev-service-jwt-secret-at-least-32!!',
      API_BASE_URL: value.API_BASE_URL ?? 'http://127.0.0.1:3000',
    };
  });

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
 * Map common deployment env aliases before schema validation.
 */
export function normalizeDeploymentEnv(
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...env };
  if (!out.S3_ACCESS_KEY_ID && out.S3_ACCESS_KEY) {
    out.S3_ACCESS_KEY_ID = out.S3_ACCESS_KEY;
  }
  if (!out.S3_SECRET_ACCESS_KEY && out.S3_SECRET_KEY) {
    out.S3_SECRET_ACCESS_KEY = out.S3_SECRET_KEY;
  }
  if (!out.PUBLIC_API_BASE_URL && out.PUBLIC_API_URL) {
    out.PUBLIC_API_BASE_URL = out.PUBLIC_API_URL;
  }
  if (!out.PUBLIC_WEB_URL && out.SHOP_DOMAIN) {
    out.PUBLIC_WEB_URL = `https://${out.SHOP_DOMAIN.replace(/^https?:\/\//, '')}`;
  }
  if (!out.PUBLIC_ADMIN_URL && out.ADMIN_DOMAIN) {
    out.PUBLIC_ADMIN_URL = `https://${out.ADMIN_DOMAIN.replace(/^https?:\/\//, '')}`;
  }
  if (!out.PUBLIC_API_URL && out.API_DOMAIN) {
    out.PUBLIC_API_URL = `https://${out.API_DOMAIN.replace(/^https?:\/\//, '')}`;
  }
  if (!out.PUBLIC_API_BASE_URL && out.PUBLIC_API_URL) {
    out.PUBLIC_API_BASE_URL = out.PUBLIC_API_URL;
  }
  return out;
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
  const result = schema.safeParse(normalizeDeploymentEnv(env));
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

/**
 * Parse comma-separated CORS origin allowlist.
 */
export function parseCorsOrigins(corsOrigin: string): readonly string[] {
  return corsOrigin
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
