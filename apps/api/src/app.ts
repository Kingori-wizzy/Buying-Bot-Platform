import {
  apiEnvSchema,
  assertSafeCorsOrigin,
  loadEnv,
  resolveLogLevel,
} from '@buying-bot/config';
import type { OpsServer } from '@buying-bot/utils';
import {
  createLogger,
  createOpsServer,
  installGracefulShutdown,
  processHealthCheck,
} from '@buying-bot/utils';

export interface ApiRuntime {
  readonly stop: () => Promise<void>;
  readonly address: OpsServer['address'];
}

/**
 * Backend API application shell.
 *
 * Framework selection (Nest/Fastify/etc.) is deferred to a future ADR.
 * This bootstrap provides production ops foundations: typed config,
 * structured logging, liveness/readiness/health, and graceful shutdown.
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

  const ops = createOpsServer({
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    logger,
    exposeStackTraces: env.NODE_ENV !== 'production',
    getReadiness: () => [processHealthCheck()],
  });

  installGracefulShutdown({
    logger,
    timeoutMs: 10_000,
    onShutdown: async () => {
      await ops.stop();
    },
  });

  await ops.start();
  logger.info('API bootstrap complete', {
    corsOrigin: env.CORS_ORIGIN,
  });

  return {
    stop: async () => {
      await ops.stop();
    },
    address: () => ops.address(),
  };
}
