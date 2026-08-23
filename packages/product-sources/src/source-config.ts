import { z } from '@buying-bot/validation';

export const sourceRuntimeConfigSchema = z.object({
  timeoutMs: z.number().int().positive().default(30_000),
  maxAttempts: z.number().int().positive().default(3),
  pageSize: z.number().int().positive().max(500).default(100),
  paginationMode: z.enum(['offset', 'cursor', 'none']).default('offset'),
  rateLimitPerMinute: z.number().int().positive().default(60),
  affiliateUrlTemplate: z.string().max(2_048).optional(),
});

export type SourceRuntimeConfig = z.infer<typeof sourceRuntimeConfigSchema>;

export function parseSourceRuntimeConfig(
  configJson: unknown,
  envPrefix?: string,
): SourceRuntimeConfig {
  const fromDb =
    configJson && typeof configJson === 'object'
      ? (configJson as Record<string, unknown>)
      : {};
  const prefix = envPrefix ?? '';
  const envNum = (key: string, fallback?: number): number | undefined => {
    const raw = process.env[`${prefix}${key}`];
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return sourceRuntimeConfigSchema.parse({
    timeoutMs: envNum('TIMEOUT_MS') ?? fromDb.timeoutMs,
    maxAttempts: envNum('MAX_ATTEMPTS') ?? fromDb.maxAttempts,
    pageSize: envNum('PAGE_SIZE') ?? fromDb.pageSize,
    paginationMode: fromDb.paginationMode,
    rateLimitPerMinute: fromDb.rateLimitPerMinute,
    affiliateUrlTemplate:
      typeof fromDb.affiliateUrlTemplate === 'string'
        ? fromDb.affiliateUrlTemplate
        : undefined,
  });
}

export interface JumiaEnvConfig {
  readonly apiKey?: string;
  readonly apiSecret?: string;
  readonly baseUrl: string;
  readonly configured: boolean;
}

export function readJumiaEnvConfig(): JumiaEnvConfig {
  const apiKey = process.env.JUMIA_SELLER_API_KEY;
  const apiSecret = process.env.JUMIA_SELLER_API_SECRET;
  const baseUrl =
    process.env.JUMIA_SELLER_API_BASE_URL ?? 'https://vendor-api.jumia.com';
  return {
    ...(apiKey ? { apiKey } : {}),
    ...(apiSecret ? { apiSecret } : {}),
    baseUrl,
    configured: Boolean(apiKey && apiSecret && baseUrl),
  };
}
