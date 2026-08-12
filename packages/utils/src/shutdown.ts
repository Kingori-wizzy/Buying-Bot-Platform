import type { Logger } from './logger.js';

export interface GracefulShutdownOptions {
  readonly logger: Logger;
  readonly timeoutMs?: number;
  readonly onShutdown: () => Promise<void> | void;
  readonly signals?: readonly NodeJS.Signals[];
}

/**
 * Install SIGTERM/SIGINT handlers that stop accepting work and run cleanup.
 */
export function installGracefulShutdown(
  options: GracefulShutdownOptions,
): () => void {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const signals = options.signals ?? (['SIGTERM', 'SIGINT'] as const);
  let shuttingDown = false;

  const handler = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      options.logger.warn('Duplicate shutdown signal ignored', { signal });
      return;
    }
    shuttingDown = true;
    options.logger.info('Graceful shutdown started', { signal, timeoutMs });

    const forceTimer = setTimeout(() => {
      options.logger.error('Graceful shutdown timed out; forcing exit', {
        timeoutMs,
      });
      process.exit(1);
    }, timeoutMs);
    forceTimer.unref();

    void Promise.resolve()
      .then(() => options.onShutdown())
      .then(() => {
        options.logger.info('Graceful shutdown completed');
        process.exit(0);
      })
      .catch((error: unknown) => {
        options.logger.error('Graceful shutdown failed', {
          error: error instanceof Error ? error.message : 'unknown',
        });
        process.exit(1);
      });
  };

  for (const signal of signals) {
    process.on(signal, handler);
  }

  return () => {
    for (const signal of signals) {
      process.off(signal, handler);
    }
  };
}
