import { describe, expect, it } from 'vitest';

import { PlatformApiError, PlatformSdk } from './index.js';

describe('@buying-bot/sdk', () => {
  it('calls health endpoint', async () => {
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ status: 'ok', service: 'api' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    const sdk = new PlatformSdk({
      baseUrl: 'http://localhost:3000',
      fetchImpl,
    });
    await expect(sdk.health()).resolves.toEqual({
      status: 'ok',
      service: 'api',
    });
  });

  it('throws PlatformApiError on failure', async () => {
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(
        new Response('nope', {
          status: 500,
          headers: { 'x-request-id': 'req-1' },
        }),
      );

    const sdk = new PlatformSdk({
      baseUrl: 'http://localhost:3000',
      fetchImpl,
    });
    await expect(sdk.health()).rejects.toBeInstanceOf(PlatformApiError);
  });
});
