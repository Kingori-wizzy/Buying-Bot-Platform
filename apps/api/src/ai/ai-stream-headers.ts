import { parseOriginAllowlist } from '../config/env.js';

export const AI_STREAM_EXPOSED_HEADERS =
  'x-conversation-id, x-request-id, x-correlation-id';

export function buildAiStreamResponseHeaders(input: {
  readonly conversationId: string;
  readonly origin?: string;
  readonly corsOrigin: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-conversation-id': input.conversationId,
    'access-control-expose-headers': AI_STREAM_EXPOSED_HEADERS,
  };

  const allowed = parseOriginAllowlist(input.corsOrigin);
  if (input.origin && allowed.includes(input.origin)) {
    headers['access-control-allow-origin'] = input.origin;
    headers['access-control-allow-credentials'] = 'true';
  }

  return headers;
}
