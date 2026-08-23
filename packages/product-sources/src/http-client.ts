export interface HttpRetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly timeoutMs: number;
}

export const DEFAULT_HTTP_RETRY_POLICY: HttpRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  timeoutMs: 30_000,
};

export class HttpRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * SSRF-safe outbound fetch with timeout and exponential backoff.
 * Caller must validate URLs before passing them in.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit & { readonly signal?: AbortSignal } = {},
  policy: HttpRetryPolicy = DEFAULT_HTTP_RETRY_POLICY,
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, policy.timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: init.signal ?? controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok && isRetryableStatus(response.status) && attempt < policy.maxAttempts) {
        const delay = Math.min(
          policy.baseDelayMs * 2 ** (attempt - 1),
          policy.maxDelayMs,
        );
        await sleep(delay);
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= policy.maxAttempts) {
        break;
      }
      const delay = Math.min(
        policy.baseDelayMs * 2 ** (attempt - 1),
        policy.maxDelayMs,
      );
      await sleep(delay);
    }
  }
  throw lastError ?? new Error('HTTP request failed');
}
