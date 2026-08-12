import { describe, expect, it } from 'vitest';

import { aggregateHealth, processHealthCheck } from './health.js';
import { createCorrelationId, createRequestId } from './ids.js';
import { createLogger } from './logger.js';

describe('@buying-bot/utils', () => {
  it('creates unique request ids', () => {
    expect(createRequestId()).not.toBe(createRequestId());
  });

  it('reuses provided correlation ids', () => {
    expect(createCorrelationId('abc-123')).toBe('abc-123');
  });

  it('aggregates health checks', () => {
    const report = aggregateHealth('api', 'test', [
      processHealthCheck(),
      { name: 'redis', status: 'degraded', message: 'high latency' },
    ]);
    expect(report.status).toBe('degraded');
  });

  it('redacts sensitive log fields', () => {
    const lines: string[] = [];
    const logger = createLogger({
      service: 'test',
      environment: 'test',
      level: 'info',
      sink: (line) => {
        lines.push(line);
      },
    });

    logger.info('auth attempt', { password: 'super-secret', userId: 'u1' });
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0] ?? '{}') as {
      password?: string;
      userId?: string;
    };
    expect(parsed.password).toBe('[REDACTED]');
    expect(parsed.userId).toBe('u1');
  });
});
