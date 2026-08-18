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
  return false;
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

  const catalog = await request('/v1/products?pageSize=5');
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

  const products =
    typeof catalog.body === 'object' && catalog.body && 'items' in catalog.body
      ? catalog.body.items
      : [];
  const first = products[0];
  let offerId = null;
  if (first?.variants?.[0]?.sku?.offers?.[0]?.id) {
    offerId = first.variants[0].sku.offers[0].id;
  }

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
  if (cart.status !== 200) {
    failures += fail('get cart', String(cart.status));
  } else {
    const lines =
      typeof cart.body === 'object' && cart.body && 'lines' in cart.body
        ? cart.body.lines
        : [];
    if (!Array.isArray(lines) || lines.length === 0) {
      failures += fail('cart lines', 'empty after add');
    } else {
      pass(`cart has ${lines.length} line(s)`);
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
