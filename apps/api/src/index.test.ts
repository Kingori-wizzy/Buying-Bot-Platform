import { ConfigError } from '@buying-bot/config';
import { afterAll, describe, expect, it } from 'vitest';

import { bootstrap } from './app.js';
import {
  createCsrfToken,
  decryptSecret,
  encryptSecret,
  hashPassword,
  verifyPassword,
} from './auth/crypto.js';
import { issueServiceJwt, verifyServiceJwt } from './auth/service-jwt.js';

describe('@buying-bot/api foundation', () => {
  const runtimePromise = bootstrap({
    NODE_ENV: 'test',
    SERVICE_NAME: 'api',
    HOST: '127.0.0.1',
    PORT: '0',
    CORS_ORIGIN: 'http://localhost:3001',
    LOG_LEVEL: 'error',
  });

  afterAll(async () => {
    const runtime = await runtimePromise;
    await runtime.stop();
  });

  it('serves liveness with request ids', async () => {
    const runtime = await runtimePromise;
    const address = runtime.address();
    expect(address).toBeDefined();
    const response = await fetch(
      `http://127.0.0.1:${String(address?.port)}/health/live`,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('x-correlation-id')).toBeTruthy();
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  it('serves readiness without requiring database when unset', async () => {
    const runtime = await runtimePromise;
    const address = runtime.address();
    const response = await fetch(
      `http://127.0.0.1:${String(address?.port)}/health/ready`,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      checks: { name: string }[];
    };
    expect(body.status).toBe('ok');
    expect(body.checks.some((check) => check.name === 'process')).toBe(true);
    expect(body.checks.some((check) => check.name === 'database')).toBe(false);
  });

  it('returns ApiErrorBody for unknown routes', async () => {
    const runtime = await runtimePromise;
    const address = runtime.address();
    const response = await fetch(
      `http://127.0.0.1:${String(address?.port)}/does-not-exist`,
    );
    expect(response.status).toBe(404);
    const body = (await response.json()) as {
      error: { code: string; requestId: string; message: string };
    };
    expect(body.error.code).toBeTruthy();
    expect(body.error.requestId).toBeTruthy();
    expect(body.error.message).toBeTruthy();
  });

  it('rejects invalid config with ConfigError', async () => {
    await expect(
      bootstrap({
        NODE_ENV: 'production',
        SERVICE_NAME: 'api',
        HOST: '127.0.0.1',
        PORT: '3000',
        CORS_ORIGIN: '*',
        DATABASE_URL:
          'postgresql://buyingbot:buyingbot@127.0.0.1:5432/buyingbot',
        SESSION_SECRET: 'production-session-secret-32chars!!',
        SERVICE_JWT_SECRET: 'production-service-jwt-secret-32ch!',
        COOKIE_SECURE: 'true',
      }),
    ).rejects.toBeInstanceOf(ConfigError);
  });
});

describe('crypto + service jwt helpers', () => {
  it('hashes and verifies passwords with argon2id', async () => {
    const hashed = await hashPassword('correct-horse-battery');
    expect(await verifyPassword(hashed, 'correct-horse-battery')).toBe(true);
    expect(await verifyPassword(hashed, 'wrong')).toBe(false);
  });

  it('encrypts MFA secrets without leaking plaintext shape', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptSecret(
      secret,
      'test-session-secret-at-least-32-chars!!',
    );
    expect(encrypted).not.toContain(secret);
    expect(
      decryptSecret(encrypted, 'test-session-secret-at-least-32-chars!!'),
    ).toBe(secret);
  });

  it('issues and verifies service JWTs', async () => {
    const secret = 'test-service-jwt-secret-at-least-32!!';
    const token = await issueServiceJwt({
      secret,
      serviceName: 'worker',
      audience: 'api',
    });
    const claims = await verifyServiceJwt({
      token,
      secret,
      audience: 'api',
    });
    expect(claims.sub).toBe('worker');
    expect(claims.aud).toBe('api');
    expect(createCsrfToken().length).toBeGreaterThan(10);
  });
});
