import { describe, expect, it } from 'vitest';

import type { HealthReport, HealthStatus } from './index.js';

describe('@buying-bot/types', () => {
  it('accepts a valid health report shape', () => {
    const status: HealthStatus = 'ok';
    const report: HealthReport = {
      status,
      service: 'api',
      environment: 'test',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 1,
      checks: [{ name: 'process', status: 'ok' }],
    };

    expect(report.status).toBe('ok');
    expect(report.checks).toHaveLength(1);
  });
});
