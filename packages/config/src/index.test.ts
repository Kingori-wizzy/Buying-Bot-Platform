import { describe, expect, it } from 'vitest';

import {
  apiEnvSchema,
  assertSafeCorsOrigin,
  ConfigError,
  loadEnv,
  resolveLogLevel,
} from './index.js';

describe('@buying-bot/config', () => {
  it('loads api env with defaults', () => {
    const env = loadEnv(apiEnvSchema, { SERVICE_NAME: 'api' }, 'API');
    expect(env.SERVICE_NAME).toBe('api');
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('fails fast on invalid PORT', () => {
    expect(() =>
      loadEnv(apiEnvSchema, { SERVICE_NAME: 'api', PORT: 'not-a-port' }, 'API'),
    ).toThrow(ConfigError);
  });

  it('forbids wildcard CORS in production', () => {
    expect(() => {
      assertSafeCorsOrigin('*', 'production');
    }).toThrow(ConfigError);
  });

  it('defaults log level by environment', () => {
    expect(resolveLogLevel({ NODE_ENV: 'production' })).toBe('info');
    expect(resolveLogLevel({ NODE_ENV: 'development' })).toBe('debug');
  });
});
