/**
 * End-to-end customer journey validation against a running API.
 * Usage: API_BASE_URL=http://127.0.0.1:3005 node ./scripts/dev/journey-validation.mjs
 */
const base = (process.env.API_BASE_URL || 'http://127.0.0.1:3005').replace(
  /\/$/,
  '',
);
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:3001';

function cookieJar() {
  /** @type {Map<string, string>} */
  const jar = new Map();
  return {
    apply(response) {
      const anyHeaders = response.headers;
      const raw =
        typeof anyHeaders.getSetCookie === 'function'
          ? anyHeaders.getSetCookie()
          : [response.headers.get('set-cookie')].filter(Boolean);
      for (const cookie of raw) {
        if (!cookie) continue;
        const [pair] = cookie.split(';');
        if (!pair) continue;
        const eq = pair.indexOf('=');
        if (eq <= 0) continue;
        const name = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1).trim();
        if (!value || /Max-Age=0/i.test(cookie)) jar.delete(name);
        else jar.set(name, value);
      }
    },
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
  };
}

async function request(path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      origin,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep text
  }
  return { status: response.status, body, ok: response.ok, response };
}

function pass(label) {
  console.log(`PASS ${label}`);
  return true;
}

function fail(label, detail) {
  console.error(`FAIL ${label}: ${detail}`);
  return 1;
}

function findOfferId(products) {
  if (!Array.isArray(products)) return null;
  for (const product of products) {
    for (const variant of product?.variants ?? []) {
      const offer = variant?.sku?.offers?.[0];
      if (offer?.id) return offer.id;
    }
  }
  return null;
}

async function resolvePurchasableOfferId() {
  const staging = await request('/v1/products/staging-smoke-sample');
  if (
    staging.status === 200 &&
    typeof staging.body === 'object' &&
    staging.body
  ) {
    const fromStaging = findOfferId([staging.body]);
    if (fromStaging) return fromStaging;
  }
  const catalog = await request('/v1/products?pageSize=50');
  if (catalog.status !== 200) return null;
  const items =
    typeof catalog.body === 'object' && catalog.body && 'items' in catalog.body
      ? catalog.body.items
      : [];
  return findOfferId(items);
}

async function main() {
  console.log(`Journey validation target: ${base}`);
  let failures = 0;

  const live = await request('/health/live');
  if (!live.ok) {
    failures += fail('health/live', String(live.status));
    process.exit(1);
  }
  pass('health/live');

  const ready = await request('/health/ready');
  if (!ready.ok) {
    failures += fail('health/ready', String(ready.status));
  } else {
    pass('health/ready');
  }

  const catalog = await request('/v1/products?pageSize=50');
  if (catalog.status !== 200) {
    failures += fail('catalog list', String(catalog.status));
  } else {
    const items =
      typeof catalog.body === 'object' &&
      catalog.body &&
      'items' in catalog.body
        ? catalog.body.items
        : [];
    if (!Array.isArray(items) || items.length === 0) {
      failures += fail('catalog list', 'no products returned');
    } else {
      pass(`catalog list (${items.length} items)`);
    }
  }

  const jar = cookieJar();
  const csrf = await request('/v1/auth/csrf');
  jar.apply(csrf.response);
  const csrfToken =
    typeof csrf.body === 'object' && csrf.body && 'csrfToken' in csrf.body
      ? String(csrf.body.csrfToken)
      : '';
  if (!csrfToken) {
    failures += fail('csrf', 'missing token');
  } else {
    pass('csrf token');
  }

  const email = `journey_${Date.now()}@example.com`;
  const password = 'JourneyTest1!';
  const register = await request('/v1/auth/register', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken,
      cookie: jar.header(),
    },
    body: JSON.stringify({ email, password }),
  });
  jar.apply(register.response);
  if (![200, 201].includes(register.status)) {
    failures += fail('register', String(register.status));
  } else {
    pass('register customer');
  }

  const loginCsrf = await request('/v1/auth/csrf');
  jar.apply(loginCsrf.response);
  const loginToken =
    typeof loginCsrf.body === 'object' &&
    loginCsrf.body &&
    'csrfToken' in loginCsrf.body
      ? String(loginCsrf.body.csrfToken)
      : csrfToken;

  const login = await request('/v1/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': loginToken,
      cookie: jar.header(),
    },
    body: JSON.stringify({ email, password, realm: 'customer' }),
  });
  jar.apply(login.response);
  if (![200, 201].includes(login.status)) {
    failures += fail('login', String(login.status));
  } else {
    pass('login customer');
  }

  const me = await request('/v1/auth/me', {
    headers: { cookie: jar.header() },
  });
  if (me.status !== 200) {
    failures += fail('session me', String(me.status));
  } else {
    pass('session me');
  }

  const offerId = await resolvePurchasableOfferId();

  if (!offerId) {
    failures += fail('add to cart', 'no offer id in catalog sample');
  } else {
    const add = await request('/v1/cart/items', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': loginToken,
        cookie: jar.header(),
      },
      body: JSON.stringify({ offerId, quantity: 1 }),
    });
    jar.apply(add.response);
    if (![200, 201].includes(add.status)) {
      failures += fail('add to cart', String(add.status));
    } else {
      pass('add to cart');
    }
  }

  const cart = await request('/v1/cart', {
    headers: { cookie: jar.header(), 'x-csrf-token': loginToken },
  });
  let cartLines = [];
  if (cart.status !== 200) {
    failures += fail('get cart', String(cart.status));
  } else {
    cartLines =
      typeof cart.body === 'object' && cart.body && 'lines' in cart.body
        ? cart.body.lines
        : [];
    if (!Array.isArray(cartLines) || cartLines.length === 0) {
      failures += fail('cart lines', 'empty after add');
    } else {
      pass(`cart has ${cartLines.length} line(s)`);
    }
  }

  const lineId =
    Array.isArray(cartLines) && cartLines[0] && typeof cartLines[0] === 'object'
      ? cartLines[0].id
      : null;
  if (lineId) {
    const updated = await request(
      `/v1/cart/items/${encodeURIComponent(lineId)}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': loginToken,
          cookie: jar.header(),
        },
        body: JSON.stringify({ quantity: 1 }),
      },
    );
    jar.apply(updated.response);
    if (![200, 201].includes(updated.status)) {
      failures += fail('cart update', String(updated.status));
    } else {
      pass('cart update quantity');
    }
  }

  if (offerId) {
    const checkout = await request('/v1/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': loginToken,
        cookie: jar.header(),
        'idempotency-key': `journey-${String(Date.now())}`,
      },
      body: JSON.stringify({
        msisdnE164: '+254712345678',
        shippingMethodCode: 'FLAT',
      }),
    });
    jar.apply(checkout.response);
    if (![200, 201].includes(checkout.status)) {
      failures += fail('checkout', String(checkout.status));
    } else {
      const body =
        typeof checkout.body === 'object' && checkout.body ? checkout.body : {};
      const orderId = body.orderId ?? body.id;
      if (!orderId) {
        failures += fail('checkout', 'missing order id');
      } else if (body.status !== 'PENDING_PAYMENT') {
        failures += fail('checkout status', String(body.status));
      } else if (typeof body.payableMinor !== 'number') {
        failures += fail('checkout totals', 'missing payableMinor');
      } else {
        pass(
          `checkout order ${String(orderId).slice(0, 8)}… (${body.payableMinor} minor)`,
        );

        const webhookPayload = {
          eventId: `journey-${String(Date.now())}`,
          orderId,
          providerTxnId: `sandbox_${String(Date.now())}`,
          amountMinor: body.payableMinor,
          currency: body.currency ?? 'KES',
          Body: {
            stkCallback: {
              ResultCode: 0,
              CheckoutRequestID: `ws_journey_${String(Date.now())}`,
              CallbackMetadata: {
                Item: [
                  { Name: 'Amount', Value: body.payableMinor / 100 },
                  {
                    Name: 'MpesaReceiptNumber',
                    Value: `SANDBOX${String(Date.now())}`,
                  },
                ],
              },
            },
          },
        };
        const webhook = await request('/v1/webhooks/payments/mpesa', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: jar.header(),
          },
          body: JSON.stringify(webhookPayload),
        });
        if (![200, 201, 202].includes(webhook.status)) {
          failures += fail('sandbox webhook', String(webhook.status));
        } else {
          pass('sandbox webhook accepted (not live M-Pesa)');
          let paid = false;
          for (let i = 0; i < 8; i += 1) {
            await new Promise((r) => setTimeout(r, 250));
            const paidOrder = await request(
              `/v1/orders/${encodeURIComponent(String(orderId))}`,
              { headers: { cookie: jar.header() } },
            );
            const status =
              typeof paidOrder.body === 'object' &&
              paidOrder.body &&
              'status' in paidOrder.body
                ? paidOrder.body.status
                : null;
            if (status === 'PAID') {
              paid = true;
              break;
            }
          }
          if (paid) {
            pass('order PAID after sandbox webhook');
          } else {
            failures += fail(
              'order PAID',
              'order did not become PAID after sandbox webhook (worker apply may still be in flight)',
            );
          }
        }
      }
    }
  }

  const search = await request('/v1/search/products?q=product&pageSize=5');
  if (search.status !== 200) {
    failures += fail('search', String(search.status));
  } else {
    pass('search products');
  }

  const aiChat = await request('/v1/ai/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: jar.header(),
      'x-csrf-token': loginToken,
    },
    body: JSON.stringify({
      message: 'I need a laptop under KES 100,000 with 16GB RAM',
    }),
  });
  if ([200, 201].includes(aiChat.status)) {
    pass('ai chat (available)');
  } else if ([502, 503].includes(aiChat.status)) {
    pass(`ai chat unavailable gracefully (${aiChat.status})`);
  } else {
    failures += fail('ai chat', String(aiChat.status));
  }

  const badCsrf = await request('/v1/auth/logout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: jar.header(),
      'x-csrf-token': 'invalid-token',
    },
    body: '{}',
  });
  if ([401, 403].includes(badCsrf.status)) {
    pass('csrf protection blocks invalid token');
  } else {
    failures += fail('csrf negative', String(badCsrf.status));
  }

  const adminMe = await request('/v1/auth/me', {
    headers: { cookie: jar.header() },
  });
  const realm =
    typeof adminMe.body === 'object' && adminMe.body && 'realm' in adminMe.body
      ? adminMe.body.realm
      : null;
  if (realm === 'customer') {
    pass('customer realm confirmed (not admin)');
  } else {
    failures += fail('customer realm', String(realm));
  }

  if (failures > 0) {
    console.error(`Journey validation FAILED (${failures} failures)`);
    process.exit(1);
  }
  console.log('Journey validation OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
