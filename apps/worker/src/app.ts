import { loadEnv, resolveLogLevel, workerEnvSchema } from '@buying-bot/config';
import type { OpsServer } from '@buying-bot/utils';
import {
  createLogger,
  createOpsServer,
  installGracefulShutdown,
  processHealthCheck,
} from '@buying-bot/utils';

export interface WorkerRuntime {
  readonly stop: () => Promise<void>;
  readonly address: OpsServer['address'];
}

/**
 * Background worker application shell.
 * Queue consumers are deferred; ops endpoints and graceful shutdown are ready.
 */
export async function bootstrap(
  envSource: NodeJS.ProcessEnv = process.env,
): Promise<WorkerRuntime> {
  const env = loadEnv(workerEnvSchema, envSource, 'WORKER');
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
  logger.info('Worker bootstrap complete');

  return {
    stop: async () => {
      await ops.stop();
    },
    address: () => ops.address(),
  };
}
