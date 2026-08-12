/**
 * Typed API client foundation. Endpoint methods are added with OpenAPI contracts.
 */

export interface SdkClientOptions {
  readonly baseUrl: string;
  readonly getAccessToken?: () =>
    Promise<string | undefined> | string | undefined;
  readonly fetchImpl?: typeof fetch;
}

export class PlatformApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(
    message: string,
    options: { status: number; code: string; requestId?: string },
  ) {
    super(message);
    this.name = 'PlatformApiError';
    this.status = options.status;
    this.code = options.code;
    if (options.requestId !== undefined) {
      this.requestId = options.requestId;
    }
  }
}

export class PlatformSdk {
  private readonly baseUrl: string;
  private readonly getAccessToken?: SdkClientOptions['getAccessToken'];
  private readonly fetchImpl: typeof fetch;

  constructor(options: SdkClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAccessToken = options.getAccessToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async health(): Promise<{ status: string; service: string }> {
    const response = await this.request('/health');
    return (await response.json()) as { status: string; service: string };
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    const token = this.getAccessToken ? await this.getAccessToken() : undefined;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const requestId = response.headers.get('x-request-id') ?? undefined;
      throw new PlatformApiError(
        `API request failed with ${String(response.status)}`,
        {
          status: response.status,
          code: 'HTTP_ERROR',
          ...(requestId ? { requestId } : {}),
        },
      );
    }

    return response;
  }
}
