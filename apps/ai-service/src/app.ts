import {
  aiServiceEnvSchema,
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

export interface AiServiceRuntime {
  readonly stop: () => Promise<void>;
  readonly address: OpsServer['address'];
}

/**
 * AI service application shell.
 * Shared AI ports live in @buying-bot/ai-core; this app owns the process.
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
    onShutdown: async () => {
      await ops.stop();
    },
  });

  await ops.start();
  logger.info('AI service bootstrap complete');

  return {
    stop: async () => {
      await ops.stop();
    },
    address: () => ops.address(),
  };
}
