import { afterAll, describe, expect, it } from 'vitest';

import { bootstrap } from './app.js';

describe('@buying-bot/ai-service', () => {
  const runtimePromise = bootstrap({
    NODE_ENV: 'test',
    SERVICE_NAME: 'ai-service',
    HOST: '127.0.0.1',
    PORT: '0',
    LOG_LEVEL: 'error',
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
});
