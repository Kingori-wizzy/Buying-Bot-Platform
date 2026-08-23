/**
 * Live Option B demo: API session + browser checkout steps printed,
 * then sandbox webhook → PAID.
 *
 * Usage: node scripts/dev/live-checkout-demo.mjs
 */
const webBase = (process.env.WEB_BASE_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const apiBase = (process.env.API_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const origin = webBase;

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
  const response = await fetch(`${apiBase}${path}`, {
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

function findOfferId(product) {
  for (const variant of product?.variants ?? []) {
    const offer = variant?.sku?.offers?.[0];
    if (offer?.id) return offer.id;
  }
  return null;
}

async function main() {
  console.log('Live checkout demo (Option B)');
  console.log(`  Storefront: ${webBase}`);
  console.log(`  API:        ${apiBase}\n`);

  const live = await request('/health/live');
  if (!live.ok) {
    console.error('API not running. Start stack first.');
    process.exit(1);
  }

  const jar = cookieJar();
  const csrf = await request('/v1/auth/csrf');
  jar.apply(csrf.response);
  const csrfToken =
    typeof csrf.body === 'object' && csrf.body && 'csrfToken' in csrf.body
      ? String(csrf.body.csrfToken)
      : '';

  const email = `live_demo_${Date.now()}@example.com`;
  const password = 'LiveDemoTest1!';

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
    console.error('Register failed', register.status, register.body);
    process.exit(1);
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
    console.error('Login failed', login.status, login.body);
    process.exit(1);
  }

  const product = await request('/v1/products/staging-smoke-sample');
  const offerId = findOfferId(
    typeof product.body === 'object' ? product.body : null,
  );
  if (!offerId) {
    console.error('No purchasable offer. Run staging seed.');
    process.exit(1);
  }

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
    console.error('Add to cart failed', add.status, add.body);
    process.exit(1);
  }

  const checkout = await request('/v1/checkout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': loginToken,
      cookie: jar.header(),
      'idempotency-key': `live-demo-${String(Date.now())}`,
    },
    body: JSON.stringify({
      msisdnE164: '+254712345678',
      shippingMethodCode: 'FLAT',
    }),
  });
  jar.apply(checkout.response);
  if (![200, 201].includes(checkout.status)) {
    console.error('Checkout failed', checkout.status, checkout.body);
    process.exit(1);
  }

  const checkoutBody =
    typeof checkout.body === 'object' && checkout.body ? checkout.body : {};
  const orderId = checkoutBody.orderId ?? checkoutBody.id;
  const payableMinor = checkoutBody.payableMinor;

  console.log('--- Account (use in browser if you want to replay UI) ---');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log('');
  console.log('--- Order created (PENDING_PAYMENT) ---');
  console.log(`Order ID:      ${orderId}`);
  console.log(`Payable minor: ${payableMinor}`);
  console.log(`Open now:      ${webBase}/orders/${orderId}`);
  console.log('');
  console.log('Simulating M-Pesa sandbox webhook…');

  const ts = String(Date.now());
  const webhook = await request('/v1/webhooks/payments/mpesa', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: jar.header() },
    body: JSON.stringify({
      eventId: `live-demo-${ts}`,
      orderId,
      providerTxnId: `sandbox_live_${ts}`,
      amountMinor: payableMinor,
      currency: checkoutBody.currency ?? 'KES',
      Body: {
        stkCallback: {
          ResultCode: 0,
          CheckoutRequestID: `ws_live_${ts}`,
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: payableMinor / 100 },
              { Name: 'MpesaReceiptNumber', Value: `SANDBOX${ts}` },
            ],
          },
        },
      },
    }),
  });

  if (![200, 201, 202].includes(webhook.status)) {
    console.error('Webhook failed', webhook.status, webhook.body);
    process.exit(1);
  }

  let paid = false;
  for (let i = 0; i < 10; i += 1) {
    await new Promise((r) => setTimeout(r, 300));
    const order = await request(`/v1/orders/${encodeURIComponent(String(orderId))}`, {
      headers: { cookie: jar.header() },
    });
    const status =
      typeof order.body === 'object' && order.body && 'status' in order.body
        ? order.body.status
        : null;
    if (status === 'PAID') {
      paid = true;
      break;
    }
  }

  if (!paid) {
    console.error('Webhook accepted but order not PAID yet (check worker).');
    process.exit(1);
  }

  console.log('');
  console.log('SUCCESS — order is PAID');
  console.log(`Refresh in browser: ${webBase}/orders/${orderId}`);
  console.log('');
  console.log('Manual browser replay (optional):');
  console.log(`  1. ${webBase}/login  → use credentials above`);
  console.log(`  2. ${webBase}/products/staging-smoke-sample → Add to cart`);
  console.log(`  3. ${webBase}/checkout → M-Pesa +254712345678 → Place order`);
  console.log(
    `  4. node scripts/dev/simulate-mpesa-webhook.mjs <order-id> <payableMinor>`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
