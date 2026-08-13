import type { Citation } from '@buying-bot/ai-core';

/**
 * Retrieve knowledge citations via API (never direct DB — ADR-0015).
 */
export async function retrieveCitations(options: {
  readonly apiBaseUrl: string;
  readonly serviceJwt: string;
  readonly query: string;
  readonly limit?: number;
}): Promise<readonly Citation[]> {
  try {
    const response = await fetch(
      `${options.apiBaseUrl.replace(/\/$/, '')}/v1/ai/retrieve`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${options.serviceJwt}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: options.query,
          limit: options.limit ?? 5,
        }),
      },
    );
    if (!response.ok) {
      return [];
    }
    const body = (await response.json()) as {
      citations?: Citation[];
    };
    return body.citations ?? [];
  } catch {
    return [];
  }
}
