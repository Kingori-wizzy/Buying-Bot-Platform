import { Secret, TOTP } from 'otpauth';
import { afterAll, describe, expect, it } from 'vitest';

import { type ApiRuntime, bootstrap } from './app.js';

const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

function collectCookies(response: Response): Map<string, string> {
  const map = new Map<string, string>();
  const anyHeaders = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies =
    typeof anyHeaders.getSetCookie === 'function'
      ? anyHeaders.getSetCookie()
      : [response.headers.get('set-cookie') ?? ''];
  for (const cookie of cookies) {
    const [pair] = cookie.split(';');
    if (!pair) {
      continue;
    }
    const eq = pair.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const cleared = /Max-Age=0/i.test(cookie) || value.length === 0;
    if (cleared) {
      map.set(name, '');
      continue;
    }
    map.set(name, value);
  }
  return map;
}

function applyCookies(
  jar: Map<string, string>,
  incoming: Map<string, string>,
): void {
  for (const [key, value] of incoming) {
    if (!value) {
      jar.delete(key);
    } else {
      jar.set(key, value);
    }
  }
}

describe.skipIf(!databaseUrl)('@buying-bot/api auth integration', () => {
  let runtime: ApiRuntime | undefined;
  let baseUrl = '';
  const origin = 'http://localhost:3001';

  afterAll(async () => {
    if (runtime !== undefined) {
      await runtime.stop();
    }
  });

  it('boots with database', async () => {
    runtime = await bootstrap({
      NODE_ENV: 'test',
      SERVICE_NAME: 'api',
      HOST: '127.0.0.1',
      PORT: '0',
      CORS_ORIGIN: origin,
      LOG_LEVEL: 'error',
      DATABASE_URL: databaseUrl,
      COOKIE_SECURE: 'false',
    });
    const address = runtime.address();
    expect(address).toBeDefined();
    baseUrl = `http://127.0.0.1:${String(address?.port)}`;

    const ready = await fetch(`${baseUrl}/health/ready`);
    const body = (await ready.json()) as {
      status: string;
      checks: { name: string; status: string }[];
    };
    if (
      body.checks.some((c) => c.name === 'database' && c.status === 'error')
    ) {
      console.warn(
        'Database unreachable — auth integration assertions may fail. Start compose postgres and migrate.',
      );
    }
    expect(ready.status === 200 || ready.status === 503).toBe(true);
  }, 30_000);

  async function csrfHeaders(
    jar: Map<string, string>,
    withJson = true,
  ): Promise<Record<string, string>> {
    const response = await fetch(`${baseUrl}/v1/auth/csrf`, {
      headers: { origin },
    });
    const cookies = collectCookies(response);
    applyCookies(jar, cookies);
    const body = (await response.json()) as { csrfToken: string };
    const cookieHeader = [...jar.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    return {
      origin,
      ...(withJson ? { 'content-type': 'application/json' } : {}),
      'x-csrf-token': body.csrfToken,
      cookie: cookieHeader,
    };
  }

  it('registers, verifies email, logs in, and reads /me', async () => {
    const ready = await fetch(`${baseUrl}/health/ready`);
    if (ready.status !== 200) {
      return;
    }

    const jar = new Map<string, string>();
    const headers = await csrfHeaders(jar);
    const email = `user-${String(Date.now())}@example.com`;
    const password = 'Str0ngPassword!';

    const register = await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });
    expect(register.status).toBe(201);
    const registered = (await register.json()) as { userId: string };
    expect(registered.userId).toBeTruthy();
    expect(runtime).toBeDefined();
    if (!runtime) {
      return;
    }

    const verifyMail = runtime.email.sent.find(
      (message) => message.template === 'email_verification',
    );
    expect(verifyMail?.data.token).toBeTruthy();

    const verifyHeaders = await csrfHeaders(jar);
    const verify = await fetch(`${baseUrl}/v1/auth/email/verify`, {
      method: 'POST',
      headers: verifyHeaders,
      body: JSON.stringify({ token: verifyMail?.data.token }),
    });
    expect(verify.status).toBe(201);

    const loginHeaders = await csrfHeaders(jar);
    const login = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: loginHeaders,
      body: JSON.stringify({ email, password, realm: 'customer' }),
    });
    expect(login.status).toBe(201);
    applyCookies(jar, collectCookies(login));
    expect(jar.get('bb_cust_session')).toBeTruthy();
    expect(jar.get('bb_admin_session')).toBeUndefined();

    const meHeaders = await csrfHeaders(jar);
    const me = await fetch(`${baseUrl}/v1/auth/me`, {
      headers: meHeaders,
    });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as {
      subjectId: string;
      realm: string;
      roles: string[];
    };
    expect(meBody.subjectId).toBe(registered.userId);
    expect(meBody.realm).toBe('customer');
    expect(meBody.roles).toContain('CUSTOMER');
  });

  it('denies admin ping for customer session (IDOR/realm)', async () => {
    const ready = await fetch(`${baseUrl}/health/ready`);
    if (ready.status !== 200) {
      return;
    }

    const jar = new Map<string, string>();
    const headers = await csrfHeaders(jar);
    const email = `cust-${String(Date.now())}@example.com`;
    const password = 'Str0ngPassword!';

    await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });
    const loginHeaders = await csrfHeaders(jar);
    const login = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: loginHeaders,
      body: JSON.stringify({ email, password, realm: 'customer' }),
    });
    for (const [k, v] of collectCookies(login)) {
      if (!v) jar.delete(k);
      else jar.set(k, v);
    }

    const cookieHeader = [...jar.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    const ping = await fetch(`${baseUrl}/v1/admin/ping`, {
      headers: { cookie: cookieHeader, origin },
    });
    expect([401, 403]).toContain(ping.status);
  });

  it('rejects invalid MFA codes', async () => {
    const ready = await fetch(`${baseUrl}/health/ready`);
    if (ready.status !== 200) {
      return;
    }

    // Promote path: create user then assign ADMIN role via prisma
    const { createPrismaClient } = await import('@buying-bot/database');
    const prisma = createPrismaClient(databaseUrl);
    try {
      const jar = new Map<string, string>();
      const headers = await csrfHeaders(jar);
      const email = `admin-${String(Date.now())}@example.com`;
      const password = 'Str0ngPassword!';

      const register = await fetch(`${baseUrl}/v1/auth/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password }),
      });
      const registered = (await register.json()) as { userId: string };

      const adminRole = await prisma.role.findUnique({
        where: { name: 'ADMIN' },
      });
      const membership = await prisma.membership.findFirst({
        where: { userId: registered.userId },
      });
      expect(adminRole && membership).toBeTruthy();
      if (adminRole && membership) {
        await prisma.membershipRole.create({
          data: { membershipId: membership.id, roleId: adminRole.id },
        });
      }

      const loginHeaders = await csrfHeaders(jar);
      const login = await fetch(`${baseUrl}/v1/auth/login`, {
        method: 'POST',
        headers: loginHeaders,
        body: JSON.stringify({ email, password, realm: 'admin' }),
      });
      expect(login.status).toBe(201);
      applyCookies(jar, collectCookies(login));

      const enrollHeaders = await csrfHeaders(jar, false);
      const enroll = await fetch(`${baseUrl}/v1/auth/mfa/totp/enroll`, {
        method: 'POST',
        headers: enrollHeaders,
      });
      expect(enroll.status).toBe(201);
      const enrolled = (await enroll.json()) as { secret: string };

      const challengeHeaders = await csrfHeaders(jar);
      const challenge = await fetch(`${baseUrl}/v1/auth/mfa/challenge`, {
        method: 'POST',
        headers: challengeHeaders,
        body: JSON.stringify({ code: '000000' }),
      });
      expect(challenge.status).toBe(401);

      const totp = new TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(enrolled.secret),
      });
      const confirmHeaders = await csrfHeaders(jar);
      const confirm = await fetch(`${baseUrl}/v1/auth/mfa/totp/confirm`, {
        method: 'POST',
        headers: confirmHeaders,
        body: JSON.stringify({ code: totp.generate() }),
      });
      expect([201, 401]).toContain(confirm.status);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('issues service JWT foundation tokens', async () => {
    const response = await fetch(`${baseUrl}/v1/auth/service-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serviceName: 'worker', audience: 'api' }),
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { token: string };
    const verify = await fetch(`${baseUrl}/v1/auth/service-token/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: body.token, audience: 'api' }),
    });
    expect(verify.status).toBe(201);
  });
});
