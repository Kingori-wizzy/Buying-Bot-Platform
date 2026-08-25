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
  readonly categorySlug?: string;
  readonly brandId?: string;
  readonly q?: string;
  readonly priceMinMinor?: number;
  readonly priceMaxMinor?: number;
  readonly productKind?: 'DIGITAL' | 'PHYSICAL';
  readonly digitalType?: string;
  readonly sort?: 'newest' | 'price_asc' | 'price_desc';
  readonly inStock?: boolean;
}

export interface ProductProvenance {
  readonly sourceCode: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly sellerName: string;
  readonly priceMinor: number | null;
  readonly currency: string | null;
  readonly availabilityStatus: string;
  readonly contentOrigin: string;
  readonly priceObservedAt: string | null;
  readonly priceFreshness: 'FRESH' | 'RECENT' | 'STALE' | 'EXPIRED';
  readonly priceFreshnessLabel: string;
  readonly imageUrl: string | null;
  readonly imageAttribution: string | null;
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
  readonly productKind?: string;
  readonly digitalType?: string | null;
  readonly contentOrigin?: string;
  readonly brand?: { readonly id: string; readonly name: string } | null;
  readonly primaryCategory?: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly parentId?: string | null;
  } | null;
  readonly primaryImageUrl?: string | null;
  readonly primaryImageAttribution?: string | null;
  readonly provenance?: ProductProvenance | null;
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

export type AiStreamEvent =
  | { readonly type: 'status'; readonly text: string }
  | { readonly type: 'delta'; readonly text: string }
  | {
      readonly type: 'done';
      readonly citations?: unknown;
      readonly usage?: unknown;
    }
  | { readonly type: 'error'; readonly message: string };

export interface CheckoutBody {
  readonly msisdnE164?: string;
  readonly couponCode?: string;
  readonly shippingMethodCode?: string;
  readonly returnUrl?: string;
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
  readonly listPriceMinor?: number;
  readonly currency?: string;
  readonly initialStock?: number;
  readonly contentOrigin?: 'ADMIN' | 'DEMO' | 'IMPORT';
  readonly productKind?: 'DIGITAL' | 'PHYSICAL';
  readonly digitalType?:
    | 'DIGITAL_ACCOUNT'
    | 'DIGITAL_SUBSCRIPTION'
    | 'DIGITAL_SERVICE'
    | 'DIGITAL_ACCESS'
    | 'DIGITAL_LICENSE'
    | 'DIGITAL_CREDENTIAL'
    | 'DIGITAL_REWARD'
    | 'OTHER'
    | null;
  readonly features?: readonly string[];
  readonly requirementsText?: string | null;
  readonly instructionsText?: string | null;
  readonly inventoryMode?: 'FINITE' | 'UNLIMITED' | 'MANUAL';
  readonly deliveryMethod?:
    | 'MANUAL'
    | 'ENTITLEMENT'
    | 'LICENSE_CODE'
    | 'ACCESS_INSTRUCTIONS'
    | 'DOWNLOAD'
    | 'NONE';
  readonly validityDays?: number | null;
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
      categorySlug: query.categorySlug,
      brandId: query.brandId,
      q: query.q,
      priceMinMinor: query.priceMinMinor,
      priceMaxMinor: query.priceMaxMinor,
      productKind: query.productKind,
      digitalType: query.digitalType,
      sort: query.sort,
      inStock:
        query.inStock === undefined
          ? undefined
          : query.inStock
            ? 'true'
            : 'false',
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
      categorySlug: query.categorySlug,
      brandId: query.brandId,
      q: query.q,
      priceMinMinor: query.priceMinMinor,
      priceMaxMinor: query.priceMaxMinor,
      productKind: query.productKind,
      digitalType: query.digitalType,
      sort: query.sort,
      inStock:
        query.inStock === undefined
          ? undefined
          : query.inStock
            ? 'true'
            : 'false',
    });
    const response = await this.request(`/v1/search/products${qs}`);
    return (await response.json()) as ProductListResponse;
  }

  async compareProducts(productIds: readonly string[]): Promise<unknown> {
    const response = await this.request('/v1/products/compare', {
      method: 'POST',
      json: { productIds },
      csrf: true,
    });
    return response.json();
  }

  async chat(message: string): Promise<AiChatResponse> {
    const response = await this.request('/v1/ai/chat', {
      method: 'POST',
      json: { message },
      csrf: true,
    });
    return (await response.json()) as AiChatResponse;
  }

  async *chatStream(
    message: string,
    options: { readonly signal?: AbortSignal } = {},
  ): AsyncGenerator<AiStreamEvent> {
    const response = await this.request('/v1/ai/chat/stream', {
      method: 'POST',
      json: { message },
      csrf: true,
      stream: true,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (!response.body) {
      return;
    }
    for await (const event of parseSseJsonStream(
      response.body,
      options.signal,
    )) {
      const type = event.type;
      if (type === 'delta' && typeof event.text === 'string') {
        yield { type: 'delta', text: event.text };
      } else if (type === 'status' && typeof event.text === 'string') {
        yield { type: 'status', text: event.text };
      } else if (type === 'done') {
        yield {
          type: 'done',
          ...(event.citations !== undefined
            ? { citations: event.citations }
            : {}),
          ...(event.usage !== undefined ? { usage: event.usage } : {}),
        };
      } else if (type === 'error') {
        yield {
          type: 'error',
          message:
            typeof event.message === 'string' ? event.message : 'stream failed',
        };
      }
    }
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

  async adminListOrders(
    query: {
      page?: number;
      pageSize?: number;
      status?: string;
    } = {},
  ): Promise<unknown> {
    const qs = toQuery({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
    });
    const response = await this.request(`/v1/admin/orders${qs}`);
    return response.json();
  }

  async adminGetOrder(id: string): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/orders/${encodeURIComponent(id)}`,
    );
    return response.json();
  }

  async adminListOrderFulfillments(orderId: string): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/orders/${encodeURIComponent(orderId)}/fulfillments`,
    );
    return response.json();
  }

  async adminMarkFulfillmentReady(
    fulfillmentId: string,
    payload: Record<string, unknown> = {},
  ): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/orders/fulfillments/${encodeURIComponent(fulfillmentId)}/ready`,
      { method: 'POST', json: { payload }, csrf: true },
    );
    return response.json();
  }

  async adminMarkFulfillmentDelivered(fulfillmentId: string): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/orders/fulfillments/${encodeURIComponent(fulfillmentId)}/delivered`,
      { method: 'POST', json: {}, csrf: true },
    );
    return response.json();
  }

  async adminGetProduct(id: string): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/catalog/products/${encodeURIComponent(id)}`,
    );
    return response.json();
  }

  async adminListProducts(
    query: {
      page?: number;
      pageSize?: number;
      status?: string;
      q?: string;
      categoryId?: string;
      digitalType?: string;
    } = {},
  ): Promise<ProductListResponse> {
    const qs = toQuery({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      q: query.q,
      categoryId: query.categoryId,
      digitalType: query.digitalType,
    });
    const response = await this.request(`/v1/admin/catalog/products${qs}`);
    return (await response.json()) as ProductListResponse;
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

  async adminPublishProduct(id: string): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/catalog/products/${encodeURIComponent(id)}/publish`,
      { method: 'POST', json: {}, csrf: true },
    );
    return response.json();
  }

  async adminUnpublishProduct(id: string): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/catalog/products/${encodeURIComponent(id)}/unpublish`,
      { method: 'POST', json: {}, csrf: true },
    );
    return response.json();
  }

  async adminArchiveProduct(id: string): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/catalog/products/${encodeURIComponent(id)}/archive`,
      { method: 'POST', json: {}, csrf: true },
    );
    return response.json();
  }

  async adminDeleteMedia(id: string): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/catalog/media/${encodeURIComponent(id)}`,
      { method: 'DELETE', csrf: true },
    );
    return response.json();
  }

  async adminCreateOffer(body: {
    skuId: string;
    listPriceMinor: number;
    currency?: string;
    active?: boolean;
  }): Promise<unknown> {
    const response = await this.request('/v1/admin/catalog/offers', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async adminUpdateOffer(
    id: string,
    body: {
      listPriceMinor?: number;
      currency?: string;
      active?: boolean;
    },
  ): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/catalog/offers/${encodeURIComponent(id)}`,
      { method: 'PATCH', json: body, csrf: true },
    );
    return response.json();
  }

  async adminCreateMedia(body: {
    objectKey: string;
    mimeType: string;
    productId?: string;
    variantId?: string;
    externalUrl?: string;
    attribution?: string;
    sortOrder?: number;
  }): Promise<unknown> {
    const response = await this.request('/v1/admin/catalog/media', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async adminUploadMedia(body: {
    dataBase64: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    fileName?: string;
    productId?: string;
    variantId?: string;
    sortOrder?: number;
    attribution?: string;
    altText?: string;
  }): Promise<unknown> {
    const response = await this.request('/v1/admin/catalog/media/upload', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async adminCreateBrand(body: {
    name: string;
    slug?: string;
    description?: string;
  }): Promise<unknown> {
    const response = await this.request('/v1/admin/catalog/brands', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async adminCreateCategory(body: {
    name: string;
    slug?: string;
    parentId?: string | null;
    description?: string;
    sortOrder?: number;
    active?: boolean;
  }): Promise<unknown> {
    const response = await this.request('/v1/admin/catalog/categories', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async listBrands(): Promise<unknown> {
    const response = await this.request('/v1/brands');
    return response.json();
  }

  async listCategories(): Promise<unknown> {
    const response = await this.request('/v1/categories');
    return response.json();
  }

  async getCategory(slug: string): Promise<unknown> {
    const response = await this.request(
      `/v1/categories/${encodeURIComponent(slug)}`,
    );
    return response.json();
  }

  async adminUpdateCategory(
    id: string,
    body: {
      name?: string;
      slug?: string;
      parentId?: string | null;
      description?: string;
      sortOrder?: number;
      active?: boolean;
      archived?: boolean;
    },
  ): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/catalog/categories/${encodeURIComponent(id)}`,
      { method: 'PATCH', json: body, csrf: true },
    );
    return response.json();
  }

  async adminSubmitCatalogImport(body: {
    filename: string;
    csvText: string;
    dryRun: boolean;
  }): Promise<unknown> {
    const response = await this.request('/v1/admin/catalog/imports', {
      method: 'POST',
      json: body,
      csrf: true,
    });
    return response.json();
  }

  async adminListCatalogImports(): Promise<unknown> {
    const response = await this.request('/v1/admin/catalog/imports');
    return response.json();
  }

  async adminGetCatalogImport(id: string): Promise<unknown> {
    const response = await this.request(
      `/v1/admin/catalog/imports/${encodeURIComponent(id)}`,
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
      stream?: boolean;
    } = {},
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set(
      'accept',
      init.stream ? 'text/event-stream' : 'application/json',
    );
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

    const { json, csrf: _csrf, stream: _stream, ...rest } = init;
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
          const nested =
            record.error && typeof record.error === 'object'
              ? (record.error as Record<string, unknown>)
              : undefined;
          if (typeof nested?.code === 'string') code = nested.code;
          else if (typeof record.code === 'string') code = record.code;
          if (typeof nested?.message === 'string') message = nested.message;
          else if (typeof record.message === 'string') message = record.message;
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

/** Parse SSE `data:` JSON lines from an HTTP stream. */
export async function* parseSseJsonStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        for (const line of part.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) {
            continue;
          }
          const json = trimmed.slice(5).trim();
          if (!json || json === '[DONE]') {
            continue;
          }
          try {
            yield JSON.parse(json) as Record<string, unknown>;
          } catch {
            // ignore malformed SSE frames
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
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
