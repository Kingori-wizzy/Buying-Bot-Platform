import { describe, expect, it } from 'vitest';

import {
  AI_STREAM_EXPOSED_HEADERS,
  buildAiStreamResponseHeaders,
} from './ai-stream-headers.js';

describe('buildAiStreamResponseHeaders', () => {
  it('includes conversation id and expose-headers for browser clients', () => {
    const headers = buildAiStreamResponseHeaders({
      conversationId: '11111111-1111-4111-8111-111111111111',
      origin: 'https://buybot.staging.earnhub.tech',
      corsOrigin: 'https://buybot.staging.earnhub.tech',
    });

    expect(headers['x-conversation-id']).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
    expect(headers['content-type']).toBe('text/event-stream; charset=utf-8');
    expect(headers['access-control-expose-headers']).toBe(
      AI_STREAM_EXPOSED_HEADERS,
    );
    expect(headers['access-control-allow-origin']).toBe(
      'https://buybot.staging.earnhub.tech',
    );
    expect(headers['access-control-allow-credentials']).toBe('true');
  });

  it('omits allow-origin when request origin is not allowlisted', () => {
    const headers = buildAiStreamResponseHeaders({
      conversationId: '22222222-2222-4222-8222-222222222222',
      origin: 'https://evil.example',
      corsOrigin: 'https://buybot.staging.earnhub.tech',
    });

    expect(headers['x-conversation-id']).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(headers['access-control-allow-origin']).toBeUndefined();
    expect(headers['access-control-allow-credentials']).toBeUndefined();
  });
});
