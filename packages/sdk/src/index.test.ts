import { describe, expect, it } from 'vitest';

import {
  firstOfferPrice,
  formatMoneyMinor,
  parseSseJsonStream,
  PlatformApiError,
  PlatformSdk,
} from './index.js';

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
        new Response(JSON.stringify({ code: 'BOOM', message: 'nope' }), {
          status: 500,
          headers: {
            'content-type': 'application/json',
            'x-request-id': 'req-1',
          },
        }),
      );

    const sdk = new PlatformSdk({
      baseUrl: 'http://localhost:3000',
      fetchImpl,
    });
    await expect(sdk.health()).rejects.toBeInstanceOf(PlatformApiError);
  });

  it('sends CSRF header on mutating requests', async () => {
    const calls: { url: string; headers: Headers }[] = [];
    const fetchImpl: typeof fetch = (input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const headers = new Headers(init?.headers);
      calls.push({ url, headers });
      if (url.endsWith('/v1/auth/csrf')) {
        return Promise.resolve(
          new Response(JSON.stringify({ csrfToken: 'csrf-test' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    };

    const sdk = new PlatformSdk({
      baseUrl: 'http://localhost:3000',
      fetchImpl,
      credentials: 'include',
    });
    await sdk.logout();
    const logout = calls.find((c) => c.url.endsWith('/v1/auth/logout'));
    expect(logout?.headers.get('x-csrf-token')).toBe('csrf-test');
  });

  it('formats money from API minor units', () => {
    expect(formatMoneyMinor(19900, 'KES')).toContain('199');
  });

  it('picks first offer price from product', () => {
    const price = firstOfferPrice({
      id: 'p1',
      name: 'Test',
      slug: 'test',
      variants: [
        {
          id: 'v1',
          sku: {
            id: 's1',
            offers: [
              { id: 'o1', listPriceMinor: 500, currency: 'KES', active: true },
            ],
          },
        },
      ],
    });
    expect(price).toEqual({
      offerId: 'o1',
      listPriceMinor: 500,
      currency: 'KES',
    });
  });

  it('parses SSE JSON data frames', async () => {
    const payload = [
      'data: {"type":"status","text":"tools"}\n\n',
      'data: {"type":"delta","text":"Hello"}\n\n',
      'data: {"type":"done"}\n\n',
    ].join('');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    const events: Record<string, unknown>[] = [];
    for await (const event of parseSseJsonStream(stream)) {
      events.push(event);
    }
    expect(events.map((e) => e.type)).toEqual(['status', 'delta', 'done']);
  });
});
