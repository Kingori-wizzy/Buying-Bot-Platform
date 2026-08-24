import { describe, expect, it } from 'vitest';

import {
  apiEnvSchema,
  assertSafeCorsOrigin,
  ConfigError,
  loadEnv,
  normalizeDeploymentEnv,
  resolveLogLevel,
} from './index.js';

describe('@buying-bot/config', () => {
  it('loads api env with defaults', () => {
    const env = loadEnv(apiEnvSchema, { SERVICE_NAME: 'api' }, 'API');
    expect(env.SERVICE_NAME).toBe('api');
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.CUSTOMER_SESSION_COOKIE).toBe('bb_cust_session');
  });

  it('requires secrets in production', () => {
    expect(() =>
      loadEnv(
        apiEnvSchema,
        {
          NODE_ENV: 'production',
          SERVICE_NAME: 'api',
          PORT: '3000',
          CORS_ORIGIN: 'https://app.example.com',
        },
        'API',
      ),
    ).toThrow(ConfigError);
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

  it('maps S3 and public URL env aliases', () => {
    const normalized = normalizeDeploymentEnv({
      S3_ACCESS_KEY: 'ak',
      S3_SECRET_KEY: 'sk',
      PUBLIC_API_URL: 'https://api.example.com',
    });
    expect(normalized.S3_ACCESS_KEY_ID).toBe('ak');
    expect(normalized.S3_SECRET_ACCESS_KEY).toBe('sk');
    expect(normalized.PUBLIC_API_BASE_URL).toBe('https://api.example.com');
  });

  it('maps SHOP_DOMAIN hostnames to public HTTPS URLs', () => {
    const normalized = normalizeDeploymentEnv({
      SHOP_DOMAIN: 'shop.example.com',
      ADMIN_DOMAIN: 'admin.example.com',
      API_DOMAIN: 'api.example.com',
    });
    expect(normalized.PUBLIC_WEB_URL).toBe('https://shop.example.com');
    expect(normalized.PUBLIC_ADMIN_URL).toBe('https://admin.example.com');
    expect(normalized.PUBLIC_API_URL).toBe('https://api.example.com');
    expect(normalized.PUBLIC_API_BASE_URL).toBe('https://api.example.com');
  });
});
