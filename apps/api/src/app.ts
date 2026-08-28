import 'reflect-metadata';

import {
  type ApiEnv,
  apiEnvSchema,
  assertSafeCorsOrigin,
  loadEnv,
  resolveLogLevel,
} from '@buying-bot/config';
import {
  createPrismaClient,
  PrismaDatabaseClient,
  seedCommerceDefaults,
  seedDigitalShopTaxonomy,
  seedIdentityCatalog,
} from '@buying-bot/database';
import {
  createLogger,
  installGracefulShutdown,
  type Logger,
} from '@buying-bot/utils';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { type DynamicModule, Module, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Redis } from 'ioredis';

import { AiModule } from './ai/ai.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CartModule } from './cart/cart.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { createProductCache } from './catalog/product-cache.js';
import { CheckoutModule } from './checkout/checkout.module.js';
import { InMemoryEmailPort } from './common/email/email.port.js';
import { ApiExceptionFilter } from './common/filters/http-exception.filter.js';
import { requestContextPlugin } from './common/hooks/request-context.plugin.js';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js';
import {
  InMemoryRateLimiter,
  type RateLimiter,
  RedisRateLimiter,
} from './common/rate-limit/rate-limiter.js';
import { parseOriginAllowlist } from './config/env.js';
import {
  APP_ENV,
  APP_LOGGER,
  DATABASE_CLIENT,
  EMAIL_PORT,
  PRODUCT_CACHE,
  RATE_LIMITER,
} from './config/tokens.js';
import { HealthModule } from './health/health.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { KnowledgeModule } from './knowledge/knowledge.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ObservabilityModule } from './observability/observability.module.js';
import { bootstrapOpenTelemetry } from './observability/otel-bootstrap.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PricingModule } from './pricing/pricing.module.js';
import { ProductSourcesModule } from './product-sources/product-sources.module.js';
import { SecurityModule } from './security/security.module.js';

export interface ApiRuntime {
  readonly stop: () => Promise<void>;
  readonly address: () => { host: string; port: number } | undefined;
  readonly env: ApiEnv;
  readonly email: InMemoryEmailPort;
}

interface RedisHandle {
  connect(): Promise<void>;
  quit(): Promise<'OK'>;
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
  pttl(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<'OK'>;
  del(...keys: string[]): Promise<number>;
}

interface BootstrapDeps {
  readonly env: ApiEnv;
  readonly logger: Logger;
  readonly email: InMemoryEmailPort;
  readonly rateLimiter: RateLimiter;
  readonly database: PrismaDatabaseClient | null;
  readonly redis: RedisHandle | undefined;
  readonly productCache: import('./catalog/product-cache.js').ProductCache;
}

function createAppModule(deps: BootstrapDeps): Type<unknown> {
  @Module({})
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest dynamic providers
  class RuntimeProvidersModule {
    static register(): DynamicModule {
      return {
        module: RuntimeProvidersModule,
        global: true,
        providers: [
          { provide: APP_ENV, useValue: deps.env },
          { provide: APP_LOGGER, useValue: deps.logger },
          { provide: DATABASE_CLIENT, useValue: deps.database },
          { provide: EMAIL_PORT, useValue: deps.email },
          { provide: RATE_LIMITER, useValue: deps.rateLimiter },
          { provide: PRODUCT_CACHE, useValue: deps.productCache },
        ],
        exports: [
          APP_ENV,
          APP_LOGGER,
          DATABASE_CLIENT,
          EMAIL_PORT,
          RATE_LIMITER,
          PRODUCT_CACHE,
        ],
      };
    }
  }

  @Module({
    imports: [
      RuntimeProvidersModule.register(),
      HealthModule,
      AuthModule,
      CatalogModule,
      ProductSourcesModule,
      InventoryModule,
      PricingModule,
      CartModule,
      CheckoutModule,
      PaymentsModule,
      AiModule,
      KnowledgeModule,
      NotificationsModule,
      SecurityModule,
      ObservabilityModule,
    ],
  })
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest root module
  class AppModule {}

  return AppModule;
}

/**
 * NestJS + Fastify API bootstrap. Returns `{ stop, address }` for tests.
 */
export async function bootstrap(
  envSource: NodeJS.ProcessEnv = process.env,
): Promise<ApiRuntime> {
  const env = loadEnv(apiEnvSchema, envSource, 'API');
  assertSafeCorsOrigin(env.CORS_ORIGIN, env.NODE_ENV);

  const logger = createLogger({
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    level: resolveLogLevel(env),
  });
  await bootstrapOpenTelemetry(env.OTEL_EXPORTER_OTLP_ENDPOINT, logger);

  const email = new InMemoryEmailPort();
  const memoryLimiter = new InMemoryRateLimiter();
  let rateLimiter: RateLimiter = memoryLimiter;
  let redis: RedisHandle | undefined;

  if (env.REDIS_URL) {
    try {
      const client = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
      }) as unknown as RedisHandle;
      await client.connect();
      redis = client;
      rateLimiter = new RedisRateLimiter(client, memoryLimiter);
      logger.info('Redis rate limiter connected');
    } catch (error: unknown) {
      logger.warn('Redis unavailable; using in-memory auth rate limiter', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      rateLimiter = memoryLimiter;
      redis = undefined;
    }
  }

  let database: PrismaDatabaseClient | null = null;
  if (env.DATABASE_URL) {
    const prisma = createPrismaClient(env.DATABASE_URL);
    database = new PrismaDatabaseClient(prisma);
    const health = await database.healthCheck();
    if (!health.ok) {
      logger.warn('Database configured but unhealthy at bootstrap', {
        message: health.message,
      });
    } else {
      await seedIdentityCatalog(prisma);
      await seedCommerceDefaults(prisma, {
        defaultCurrency: env.DEFAULT_CURRENCY,
        ...(env.TAX_DEFAULT_RATE_BPS !== undefined
          ? { taxDefaultRateBps: env.TAX_DEFAULT_RATE_BPS }
          : {}),
      });
      await seedDigitalShopTaxonomy(prisma);
      logger.info('Identity, commerce, and digital shop taxonomy seeded');
    }
  }

  const deps: BootstrapDeps = {
    env,
    logger,
    email,
    rateLimiter,
    database,
    redis,
    productCache: createProductCache(redis),
  };

  const AppModule = createAppModule(deps);
  const adapter = new FastifyAdapter({
    logger: false,
    trustProxy: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { logger: false, abortOnError: false },
  );

  // Nest Fastify typings lag plugin augmentations; cast keeps runtime safe.
  await app.register(cookie as unknown as never);
  await app.register(helmet as unknown as never, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...originsForCsp(env.CORS_ORIGIN)],
      },
    },
    hsts:
      env.NODE_ENV === 'production' || env.NODE_ENV === 'staging'
        ? { maxAge: 31536000, includeSubDomains: true, preload: false }
        : false,
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
    xssFilter: true,
    noSniff: true,
  });

  try {
    const compress = await import('@fastify/compress');
    await app.register(compress.default as unknown as never, {
      global: true,
      threshold: 1024,
    });
  } catch {
    logger.warn(
      '@fastify/compress unavailable; continuing without compression',
    );
  }

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(requestContextPlugin as never);

  const origins = parseOriginAllowlist(env.CORS_ORIGIN);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    exposedHeaders: ['x-conversation-id', 'x-request-id', 'x-correlation-id'],
  });

  app.useGlobalFilters(
    new ApiExceptionFilter(logger, env.NODE_ENV !== 'production'),
  );
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.enableShutdownHooks();

  const uninstallShutdown = installGracefulShutdown({
    logger,
    timeoutMs: 10_000,
    onShutdown: async () => {
      await shutdown(app, deps);
    },
  });

  await app.listen(env.PORT, env.HOST);
  logger.info('API bootstrap complete', {
    corsOrigin: env.CORS_ORIGIN,
    databaseConfigured: Boolean(env.DATABASE_URL),
  });

  const addressInfo = app.getHttpServer().address();
  const resolvedPort =
    addressInfo && typeof addressInfo === 'object'
      ? addressInfo.port
      : env.PORT;
  const resolvedHost =
    addressInfo && typeof addressInfo === 'object'
      ? addressInfo.address
      : env.HOST;

  return {
    env,
    email,
    stop: async () => {
      uninstallShutdown();
      await shutdown(app, deps);
    },
    address: () => ({ host: resolvedHost, port: resolvedPort }),
  };
}

async function shutdown(
  app: NestFastifyApplication,
  deps: BootstrapDeps,
): Promise<void> {
  await app.close();
  if (deps.database) {
    await deps.database.disconnect();
  }
  await deps.rateLimiter.disconnect();
  if (deps.redis) {
    try {
      await deps.redis.quit();
    } catch {
      // ignore
    }
  }
}

function originsForCsp(corsOrigin: string): string[] {
  return [...parseOriginAllowlist(corsOrigin)];
}
