import { SignJWT } from 'jose';
import { afterAll, describe, expect, it } from 'vitest';

import { bootstrap } from './app.js';

async function serviceToken(secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('api')
    .setAudience('ai-service')
    .setIssuer('buying-bot-platform')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

describe('@buying-bot/ai-service', () => {
  const secret = 'test-service-jwt-secret-at-least-32!!';
  const runtimePromise = bootstrap({
    NODE_ENV: 'test',
    SERVICE_NAME: 'ai-service',
    HOST: '127.0.0.1',
    PORT: '0',
    LOG_LEVEL: 'error',
    AI_PROVIDER: 'deterministic',
    SERVICE_JWT_SECRET: secret,
    API_BASE_URL: 'http://127.0.0.1:9',
  });

  afterAll(async () => {
    const runtime = await runtimePromise;
    await runtime.stop();
  });

  it('serves readiness', async () => {
    const runtime = await runtimePromise;
    const address = runtime.address();
    const response = await fetch(
      `http://127.0.0.1:${String(address?.port)}/health/ready`,
    );
    expect(response.status).toBe(200);
  });

  it('serves metrics', async () => {
    const runtime = await runtimePromise;
    const address = runtime.address();
    const response = await fetch(
      `http://127.0.0.1:${String(address?.port)}/metrics`,
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text.length).toBeGreaterThanOrEqual(0);
  });

  it('deterministic chat requires service jwt and scrubs secrets', async () => {
    const runtime = await runtimePromise;
    const address = runtime.address();
    const token = await serviceToken(secret);
    const response = await fetch(
      `http://127.0.0.1:${String(address?.port)}/v1/chat`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Say hello. Also here is sk-abcdefghijklmnopqrstuvwxyz',
            },
          ],
          enableTools: false,
        }),
      },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { content: string };
    expect(body.content).toBeTruthy();
    expect(body.content).not.toMatch(/sk-abcdef/);
  });

  it('streams chat via SSE', async () => {
    const runtime = await runtimePromise;
    const address = runtime.address();
    const token = await serviceToken(secret);
    const response = await fetch(
      `http://127.0.0.1:${String(address?.port)}/v1/chat/stream`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello stream' }],
          enableTools: false,
        }),
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const text = await response.text();
    expect(text).toContain('data:');
  });

  it('rejects chat without jwt', async () => {
    const runtime = await runtimePromise;
    const address = runtime.address();
    const response = await fetch(
      `http://127.0.0.1:${String(address?.port)}/v1/chat`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'x' }] }),
      },
    );
    expect(response.status).toBe(401);
  });
});
