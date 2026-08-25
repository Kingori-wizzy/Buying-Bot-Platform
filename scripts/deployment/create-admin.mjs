/**
 * Production/staging first-admin bootstrap (idempotent).
 *
 * Requires explicit env — refuses defaults:
 *   ADMIN_EMAIL, ADMIN_PASSWORD (min 12), DATABASE_URL
 *   API_BASE_URL, ADMIN_ORIGIN (HTTPS public origins)
 *
 * Usage (on VPS after migrate + API healthy):
 *   export $(grep -v '^#' /etc/buyingbot/env.production | xargs)  # carefully
 *   ADMIN_EMAIL='ops@company.com' ADMIN_PASSWORD='…' \
 *   API_BASE_URL='https://buybot.staging.earnhub.com' \
 *   ADMIN_ORIGIN='https://buybot.staging.earnhub.com' \
 *   node scripts/deployment/create-admin.mjs
 *
 * Or with a local env file that includes DATABASE_URL:
 *   node --env-file=/etc/buyingbot/env.production scripts/deployment/create-admin.mjs
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const { createPrismaClient, seedIdentityCatalog } = await import(
  pathToFileURL(path.join(root, 'packages/database/dist/index.js')).href
);

const api =
  process.env.API_BASE_URL?.replace(/\/$/, '') ||
  process.env.PUBLIC_API_URL?.replace(/\/$/, '') ||
  '';
const origin =
  process.env.ADMIN_ORIGIN?.replace(/\/$/, '') ||
  process.env.PUBLIC_ADMIN_URL?.replace(/\/$/, '') ||
  process.env.PUBLIC_WEB_URL?.replace(/\/$/, '') ||
  '';
const email = (process.env.ADMIN_EMAIL || '').trim();
const password = process.env.ADMIN_PASSWORD || '';
const databaseUrl = process.env.DATABASE_URL;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

if (!databaseUrl) fail('DATABASE_URL is required');
if (!api) fail('API_BASE_URL (or PUBLIC_API_URL) is required');
if (!origin) fail('ADMIN_ORIGIN (or PUBLIC_WEB_URL) is required');
if (!email || !email.includes('@')) fail('ADMIN_EMAIL is required');
if (password.length < 12) fail('ADMIN_PASSWORD must be at least 12 characters');
if (
  password === 'LocalAdmin1!' ||
  /^(password|admin|changeme)/i.test(password)
) {
  fail('ADMIN_PASSWORD looks like a default/dev password — refuse');
}

const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function applySetCookie(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [nv] = c.split(';');
    const i = nv.indexOf('=');
    if (i < 0) continue;
    const name = nv.slice(0, i);
    const value = nv.slice(i + 1);
    if (!value) jar.delete(name);
    else jar.set(name, value);
  }
}

async function csrf() {
  const res = await fetch(`${api}/v1/auth/csrf`, {
    headers: {
      origin,
      ...(jar.size ? { cookie: cookieHeader() } : {}),
    },
  });
  applySetCookie(res);
  if (!res.ok) {
    fail(`CSRF failed HTTP ${String(res.status)}`);
  }
  const body = await res.json();
  return body.csrfToken ?? '';
}

const prisma = createPrismaClient(databaseUrl);
await seedIdentityCatalog(prisma);

let userId;
const existing = await prisma.user.findUnique({
  where: { emailNormalized: email.toLowerCase() },
});

if (existing) {
  userId = existing.id;
  console.error('User already exists — ensuring ACTIVE + SUPER_ADMIN…');
} else {
  const token = await csrf();
  const register = await fetch(`${api}/v1/auth/register`, {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      'x-csrf-token': token,
      cookie: cookieHeader(),
    },
    body: JSON.stringify({ email, password }),
  });
  applySetCookie(register);
  const regBody = await register.json();
  if (![200, 201].includes(register.status) || !regBody.userId) {
    console.error('REGISTER_FAILED', register.status, regBody);
    process.exit(1);
  }
  userId = regBody.userId;
}

await prisma.user.update({
  where: { id: userId },
  data: { status: 'ACTIVE' },
});

const adminRole = await prisma.role.findUnique({
  where: { name: 'SUPER_ADMIN' },
});
const membership = await prisma.membership.findFirst({ where: { userId } });
if (!adminRole || !membership) {
  fail('SUPER_ADMIN role or membership missing — identity seed failed');
}
const already = await prisma.membershipRole.findFirst({
  where: { membershipId: membership.id, roleId: adminRole.id },
});
if (!already) {
  await prisma.membershipRole.create({
    data: { membershipId: membership.id, roleId: adminRole.id },
  });
}

const loginToken = await csrf();
const login = await fetch(`${api}/v1/auth/login`, {
  method: 'POST',
  headers: {
    origin,
    'content-type': 'application/json',
    'x-csrf-token': loginToken,
    cookie: cookieHeader(),
  },
  body: JSON.stringify({ email, password, realm: 'admin' }),
});
applySetCookie(login);
const loginBody = await login.json();
if (![200, 201].includes(login.status)) {
  console.error('LOGIN_FAILED', login.status, loginBody);
  process.exit(1);
}

const adminUrl = `${origin.replace(/\/admin\/?$/, '')}/admin/login`;

console.log(
  JSON.stringify(
    {
      ok: true,
      email,
      realm: 'admin',
      role: 'SUPER_ADMIN',
      userId,
      adminLoginUrl: adminUrl,
      customerRegisterUrl: `${origin.replace(/\/admin\/?$/, '')}/register`,
      notes: [
        'API boot already seeds organization + CUSTOMER/ADMIN/SUPER_ADMIN roles',
        'Customers self-register on the storefront (password min 10)',
        'Do not print or commit ADMIN_PASSWORD',
      ],
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
