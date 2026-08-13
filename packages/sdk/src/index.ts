/**
 * Typed API client for Buying Bot Platform (Nest REST under /v1).
 * Auth is cookie-based; pass credentials: 'include' from browsers.
 */

export interface SdkClientOptions {
  readonly baseUrl: string;
  readonly getAccessToken?: () =>
    Promise<string | undefined> | string | undefined;
  /** Browser cookie sessions; default 'omit'. */
  readonly credentials?: RequestCredentials;
  readonly fetchImpl?: typeof fetch;
  /** Optional CSRF provider; otherwise fetched via GET /v1/auth/csrf. */
  readonly getCsrfToken?: () =>
    Promise<string | undefined> | string | undefined;
}

export class PlatformApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly body?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      code: string;
      requestId?: string;
      body?: unknown;
    },
  ) {
    super(message);
    this.name = 'PlatformApiError';
    this.status = options.status;
    this.code = options.code;
    if (options.requestId !== undefined) {
      this.requestId = options.requestId;
    }
    if (options.body !== undefined) {
      this.body = options.body;
    }
  }
}

export interface HealthResponse {
  readonly status: string;
  readonly service: string;
}

export interface ProductListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly categoryId?: string;
  readonly brandId?: string;
  readonly q?: string;
}

export interface MoneyOffer {
  readonly id: string;
  readonly listPriceMinor: number;
  readonly currency: string;
  readonly active?: boolean;
}

export interface ProductSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription?: string | null;
  readonly status?: string;
  readonly brand?: { readonly id: string; readonly name: string } | null;
  readonly variants?: readonly {
    readonly id: string;
    readonly sku?: {
      readonly id: string;
      readonly offers?: readonly MoneyOffer[];
    } | null;
  }[];
}

export interface ProductListResponse {
  readonly items: readonly ProductSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly total?: number;
}

export interface CartLine {
  readonly id: string;
  readonly offerId: string;
  readonly skuId: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly currency: string;
  readonly lineTotalMinor: number;
  readonly productName: string;
}

export interface CartView {
  readonly id: string;
  readonly currency: string;
  readonly status: string;
  readonly pricedAt: string;
  readonly lines: readonly CartLine[];
}

export interface AuthMe {
  readonly subjectId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly {
    readonly resource: string;
    readonly action: string;
  }[];
  readonly realm: 'customer' | 'admin';
  readonly mfaSatisfied: boolean;
  readonly steppedUp: boolean;
}

export interface LoginResult {
  readonly userId: string;
  readonly realm: 'customer' | 'admin';
  readonly mfaRequired: boolean;
}

export interface AiChatResponse {
  readonly conversationId: string;
  readonly result: {
    readonly content?: string;
  };
}

export interface CheckoutBody {
  readonly msisdnE164: string;
  readonly couponCode?: string;
  readonly shippingMethodCode?: string;
}

export interface CreateProductBody {
  readonly name: string;
  readonly slug?: string;
  readonly shortDescription?: string;
  readonly description?: string;
  readonly status?:
    'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  readonly brandId?: string | null;
  readonly primaryCategoryId?: string | null;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
  readonly variantName?: string;
  readonly internalSku?: string;
}

export type UpdateProductBody = Partial<CreateProductBody>;

export interface AdjustInventoryBody {
  readonly skuId: string;
  readonly locationId?: string;
  readonly quantityDelta: number;
  readonly reason: string;
  readonly idempotencyKey: string;
}

export interface CreatePromotionBody {
  readonly name: string;
  readonly code?: string;
  readonly type:
    | 'PERCENT_OFF_ITEM'
    | 'FIXED_OFF_ITEM'
    | 'PERCENT_OFF_CART'
    | 'FIXED_OFF_CART';
  readonly percentBps?: number;
  readonly amountMinor?: number;
  readonly currency?: string;
  readonly stackable?: boolean;
  readonly priority?: number;
  readonly minSpendMinor?: number;
  readonly active?: boolean;
}

export interface CreateCouponBody {
  readonly code: string;
  readonly promotionId: string;
  readonly maxRedemptions?: number;
  readonly startsAt?: string;
  readonly endsAt?: string;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs.length > 0 ? `?${qs}` : '';
}

export class PlatformSdk {
  private readonly baseUrl: string;
  private readonly getAccessToken?: SdkClientOptions['getAccessToken'];
  private readonly getCsrfToken?: SdkClientOptions['getCsrfToken'];
  private readonly credentials: RequestCredentials;
  private readonly fetchImpl: typeof fetch;
  private csrfCache: string | undefined;

  constructor(options: SdkClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAccessToken = options.getAccessToken;
    this.getCsrfToken = options.getCsrfToken;
    this.credentials = options.credentials ?? 'omit';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async health(): Promise<HealthResponse> {
    const response = await this.request('/health');
    return (await response.json()) as HealthResponse;
  }

  async getCsrf(): Promise<{ csrfToken: string }> {
    const response = await this.request('/v1/auth/csrf');
    const data = (await response.json()) as { csrfToken: string };
    this.csrfCache = data.csrfToken;
    return data;
  }

  async register(body: {
    email: string;
    password: string;
  }): Promise<{ userId: string; email: string }> {
    const response = await this.request('/v1/auth/register', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return (await response.json()) as { userId: string; email: string };
  }

  async login(body: {
    email: string;
    password: string;
    realm?: 'customer' | 'admin';
  }): Promise<LoginResult> {
    const response = await this.request('/v1/auth/login', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return (await response.json()) as LoginResult;
  }

  async logout(): Promise<{ ok: true }> {
    const response = await this.request('/v1/auth/logout', {
      method: 'POST',
      json: {},
      csrf: true,
    });
    return (await response.json()) as { ok: true };
  }

  async me(): Promise<AuthMe> {
    const response = await this.request('/v1/auth/me');
    return (await response.json()) as AuthMe;
  }

  async mfaEnroll(): Promise<{
    factorId: string;
    otpauthUrl: string;
    secret: string;
  }> {
    const response = await this.request('/v1/auth/mfa/totp/enroll', {
      method: 'POST',
      json: {},
      csrf: true,
    });
    return (await response.json()) as {
      factorId: string;
      otpauthUrl: string;
      secret: string;
    };
  }

  async mfaConfirm(body: { code: string }): Promise<unknown> {
    const response = await this.request('/v1/auth/mfa/totp/confirm', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async mfaChallenge(body: { code: string }): Promise<unknown> {
    const response = await this.request('/v1/auth/mfa/challenge', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async listProducts(
    query: ProductListQuery = {},
  ): Promise<ProductListResponse> {
    const qs = toQuery({
      page: query.page,
      pageSize: query.pageSize,
      categoryId: query.categoryId,
      brandId: query.brandId,
      q: query.q,
    });
    const response = await this.request(`/v1/products${qs}`);
    return (await response.json()) as ProductListResponse;
  }

  async getProduct(idOrSlug: string): Promise<ProductSummary> {
    const response = await this.request(
      `/v1/products/${encodeURIComponent(idOrSlug)}`,
    );
    return (await response.json()) as ProductSummary;
  }

  async searchProducts(
    query: ProductListQuery = {},
  ): Promise<ProductListResponse> {
    const qs = toQuery({
      page: query.page,
      pageSize: query.pageSize,
      categoryId: query.categoryId,
      brandId: query.brandId,
      q: query.q,
    });
    const response = await this.request(`/v1/search/products${qs}`);
    return (await response.json()) as ProductListResponse;
  }

  async chat(message: string): Promise<AiChatResponse> {
    const response = await this.request('/v1/ai/chat', {
      method: 'POST',
      json: { message },
      csrf: true,
    });
    return (await response.json()) as AiChatResponse;
  }

  async getCart(): Promise<CartView> {
    const response = await this.request('/v1/cart');
    return (await response.json()) as CartView;
  }

  async addCartItem(body: {
    offerId: string;
    quantity: number;
  }): Promise<CartView> {
    const response = await this.request('/v1/cart/items', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return (await response.json()) as CartView;
  }

  async updateCartItem(
    lineId: string,
    body: { quantity: number },
  ): Promise<CartView> {
    const response = await this.request(
      `/v1/cart/items/${encodeURIComponent(lineId)}`,
      {
        method: 'PATCH',
        json: body,
        csrf: true,
      },
    );
    return (await response.json()) as CartView;
  }

  async removeCartItem(lineId: string): Promise<CartView> {
    const response = await this.request(
      `/v1/cart/items/${encodeURIComponent(lineId)}`,
      {
        method: 'DELETE',
        csrf: true,
      },
    );
    return (await response.json()) as CartView;
  }

  async mergeCart(): Promise<unknown> {
    const response = await this.request('/v1/cart/merge', {
      method: 'POST',
      json: {},
      csrf: true,
    });
    return response.json();
  }

  async checkout(body: CheckoutBody, idempotencyKey: string): Promise<unknown> {
    const response = await this.request('/v1/checkout', {
      method: 'POST',
      json: body,
      csrf: true,
      headers: { 'idempotency-key': idempotencyKey },
    });
    return response.json();
  }

  async listMyOrders(): Promise<unknown> {
    const response = await this.request('/v1/orders/me');
    return response.json();
  }

  async getOrder(id: string): Promise<unknown> {
    const response = await this.request(`/v1/orders/${encodeURIComponent(id)}`);
    return response.json();
  }

  async adminGetProduct(id: string): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/catalog/products/${encodeURIComponent(id)}`,
    );
    return response.json();
  }

  async adminCreateProduct(body: CreateProductBody): Promise<unknown> {
    const response = await this.request('/v1/admin/catalog/products', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async adminUpdateProduct(
    id: string,
    body: UpdateProductBody,
  ): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/catalog/products/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        json: body,
        csrf: true,
      },
    );
    return response.json();
  }

  async adminListInventory(
    query: {
      page?: number;
      pageSize?: number;
      skuId?: string;
      locationId?: string;
    } = {},
  ): Promise<unknown> {
    const qs = toQuery({
      page: query.page,
      pageSize: query.pageSize,
      skuId: query.skuId,
      locationId: query.locationId,
    });
    const response = await this.request(`/v1/admin/inventory${qs}`);
    return response.json();
  }

  async adminAdjustInventory(body: AdjustInventoryBody): Promise<unknown> {
    const response = await this.request('/v1/admin/inventory/adjust', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async adminCreatePromotion(body: CreatePromotionBody): Promise<unknown> {
    const response = await this.request('/v1/admin/pricing/promotions', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async adminCreateCoupon(body: CreateCouponBody): Promise<unknown> {
    const response = await this.request('/v1/admin/pricing/coupons', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async adminPing(): Promise<unknown> {
    const response = await this.request('/v1/admin/ping');
    return response.json();
  }

  private async resolveCsrf(): Promise<string> {
    if (this.getCsrfToken) {
      const provided = await this.getCsrfToken();
      if (provided) return provided;
    }
    if (this.csrfCache) return this.csrfCache;
    const { csrfToken } = await this.getCsrf();
    return csrfToken;
  }

  private async request(
    path: string,
    init: RequestInit & {
      json?: unknown;
      csrf?: boolean;
    } = {},
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json');
    }

    const token = this.getAccessToken ? await this.getAccessToken() : undefined;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    if (init.csrf) {
      const csrf = await this.resolveCsrf();
      headers.set('x-csrf-token', csrf);
    }

    const { json, csrf: _csrf, ...rest } = init;
    const body =
      json !== undefined
        ? JSON.stringify(json)
        : rest.body !== undefined
          ? rest.body
          : null;
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...rest,
      credentials: this.credentials,
      headers,
      body,
    });

    if (!response.ok) {
      const requestId = response.headers.get('x-request-id') ?? undefined;
      let body: unknown;
      let code = 'HTTP_ERROR';
      let message = `API request failed with ${String(response.status)}`;
      try {
        body = await response.json();
        if (body && typeof body === 'object') {
          const record = body as Record<string, unknown>;
          if (typeof record.code === 'string') code = record.code;
          if (typeof record.message === 'string') message = record.message;
        }
      } catch {
        // ignore non-JSON error bodies
      }
      throw new PlatformApiError(message, {
        status: response.status,
        code,
        ...(requestId ? { requestId } : {}),
        ...(body !== undefined ? { body } : {}),
      });
    }

    return response;
  }
}

/** Format API money (minor units) for display — never invent prices client-side. */
export function formatMoneyMinor(
  minor: number,
  currency: string,
  locale = 'en-KE',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(minor / 100);
}

/** First active offer list price from a product payload, if present. */
export function firstOfferPrice(product: ProductSummary): {
  offerId: string;
  listPriceMinor: number;
  currency: string;
} | null {
  for (const variant of product.variants ?? []) {
    for (const offer of variant.sku?.offers ?? []) {
      if (offer.active === false) continue;
      return {
        offerId: offer.id,
        listPriceMinor: offer.listPriceMinor,
        currency: offer.currency,
      };
    }
  }
  return null;
}
