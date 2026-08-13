import type { Logger } from '@buying-bot/utils';

/**
 * Lightweight bootstrap seam. A deployment can add the OpenTelemetry SDK
 * without making local/test startup depend on telemetry packages.
 */
export function bootstrapOpenTelemetry(
  endpoint: string | undefined,
  logger: Pick<Logger, 'info' | 'warn'>,
): Promise<boolean> {
  if (!endpoint) {
    return Promise.resolve(false);
  }
  try {
    new URL(endpoint);
    logger.info('OpenTelemetry exporter endpoint configured', { endpoint });
    return Promise.resolve(true);
  } catch {
    logger.warn('Ignoring invalid OpenTelemetry exporter endpoint');
    return Promise.resolve(false);
  }
}
