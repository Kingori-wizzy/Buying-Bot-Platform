import type {
  HealthCheckDetail,
  HealthReport,
  HealthStatus,
  NodeEnvironment,
} from '@buying-bot/types';

const startedAt = Date.now();

export function processHealthCheck(): HealthCheckDetail {
  return {
    name: 'process',
    status: 'ok',
    message: 'process is running',
  };
}

export function aggregateHealth(
  service: string,
  environment: NodeEnvironment,
  checks: readonly HealthCheckDetail[],
): HealthReport {
  const status = checks.reduce<HealthStatus>((current, check) => {
    if (check.status === 'error' || current === 'error') {
      return 'error';
    }
    if (check.status === 'degraded' || current === 'degraded') {
      return 'degraded';
    }
    return 'ok';
  }, 'ok');

  return {
    status,
    service,
    environment,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    checks,
  };
}
