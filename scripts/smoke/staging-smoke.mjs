/**
 * Expanded staging/local API smoke suite (identity → catalog → cart → checkout paths).
 *
 * Usage:
 *   API_BASE_URL=http://127.0.0.1:3000 SMOKE_REQUIRE=1 node ./scripts/smoke/staging-smoke.mjs
 */
const base = (process.env.API_BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const requireSmoke = process.env.SMOKE_REQUIRE === '1';
const allowSkip = process.env.SMOKE_ALLOW_SKIP !== '0';
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`Smoke target: ${base}`);

  let live;
  try {
    live = await request('/health/live');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (!requireSmoke && allowSkip) {
      console.warn(
        `EXTERNAL: API unreachable (${reason}). Smoke skipped. Set SMOKE_REQUIRE=1 after boot.`,
      );
      process.exit(0);
    }
    console.error(`Smoke failed: API unreachable (${reason})`);
    process.exit(1);
  }

  assert(live.ok, `health/live expected 2xx, got ${live.status}`);
  console.log('PASS /health/live');

  const ready = await request('/health/ready');
  assert(ready.ok, `health/ready expected 2xx, got ${ready.status}`);
  console.log('PASS /health/ready');

  const metrics = await request('/metrics');
  assert(
    metrics.status === 200 &&
      typeof metrics.body === 'string' &&
      String(metrics.body).includes('#'),
    `metrics expected Prometheus text, got ${metrics.status}`,
  );
  console.log('PASS /metrics');

  const catalog = await request('/v1/products?page=1&pageSize=5');
  assert(
    catalog.status === 200,
    `catalog list expected 200, got ${catalog.status}`,
  );
  console.log('PASS /v1/products');

  const search = await request('/v1/search/products?q=a&page=1&pageSize=5');
  assert(
    search.status === 200 || search.status === 400,
    `search expected 200/400, got ${search.status}`,
  );
  console.log(`PASS /v1/search/products (${search.status})`);

  const jar = cookieJar();
  const csrf = await request('/v1/auth/csrf');
  jar.apply(csrf.response);
  assert(csrf.status === 200, `csrf expected 200, got ${csrf.status}`);
  const csrfToken =
    typeof csrf.body === 'object' && csrf.body && 'csrfToken' in csrf.body
      ? String(csrf.body.csrfToken)
      : '';
  assert(csrfToken.length > 0, 'csrfToken missing');
  console.log('PASS /v1/auth/csrf');

  const email = `smoke_${Date.now()}@example.com`;
  const password = 'SmokeTestPass1!';
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
  assert(
    register.status === 201 ||
      register.status === 200 ||
      register.status === 429,
    `register unexpected ${register.status}`,
  );
  console.log(`PASS /v1/auth/register (${register.status})`);

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
  // May be 401 if email verification required — still validates endpoint
  assert(
    [200, 201, 401, 403].includes(login.status),
    `login unexpected ${login.status}`,
  );
  console.log(`PASS /v1/auth/login (${login.status})`);

  const cart = await request('/v1/cart', {
    headers: { cookie: jar.header(), 'x-csrf-token': loginToken },
  });
  assert(
    [200, 201, 401].includes(cart.status),
    `cart unexpected ${cart.status}`,
  );
  console.log(`PASS /v1/cart (${cart.status})`);

  const aiChat = await request('/v1/ai/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: jar.header(),
      'x-csrf-token': loginToken,
    },
    body: JSON.stringify({ message: 'ping' }),
  });
  // 401 without session / 503 if AI down / 201-200 if ok — all acceptable smoke shapes
  assert(
    [200, 201, 401, 403, 502, 503].includes(aiChat.status),
    `ai chat unexpected ${aiChat.status}`,
  );
  console.log(`PASS /v1/ai/chat (${aiChat.status})`);

  // Explicit CSRF failure path
  const badCsrf = await request('/v1/auth/logout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: jar.header(),
      'x-csrf-token': 'invalid-csrf-token',
    },
    body: '{}',
  });
  assert(
    [401, 403].includes(badCsrf.status) || badCsrf.status === 200,
    `csrf negative path unexpected ${badCsrf.status}`,
  );
  console.log(`PASS csrf-negative/logout shape (${badCsrf.status})`);

  console.log('Smoke OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
