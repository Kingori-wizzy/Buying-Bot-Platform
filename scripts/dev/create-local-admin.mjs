/**
 * One-shot local admin bootstrap (dev only).
 * Usage (from repo root):
 *   node --env-file=.env scripts/dev/create-local-admin.mjs
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const { createPrismaClient, seedIdentityCatalog } = await import(
  pathToFileURL(path.join(root, 'packages/database/dist/index.js')).href
);

const api =
  process.env.API_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3000';
const origin = process.env.ADMIN_ORIGIN || 'http://localhost:3004';
const email = process.env.LOCAL_ADMIN_EMAIL || 'local-admin@example.com';
const password = process.env.LOCAL_ADMIN_PASSWORD || 'LocalAdmin1!';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
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
  console.error(
    'User already exists — promoting SUPER_ADMIN and checking MFA…',
  );
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
  throw new Error('SUPER_ADMIN role or membership missing — seed failed');
}
const already = await prisma.membershipRole.findFirst({
  where: { membershipId: membership.id, roleId: adminRole.id },
});
if (!already) {
  await prisma.membershipRole.create({
    data: { membershipId: membership.id, roleId: adminRole.id },
  });
}

const verified = await prisma.mfaFactor.findFirst({
  where: { userId, type: 'TOTP', verifiedAt: { not: null } },
});

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

// MFA factors are optional — ADMIN_MFA_REQUIRED defaults to false.
if (verified) {
  await prisma.mfaFactor.deleteMany({ where: { userId, type: 'TOTP' } });
  await prisma.mfaRecoveryCode.deleteMany({ where: { userId } });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      url: 'http://localhost:3004/login',
      email,
      password,
      realm: 'admin',
      role: 'SUPER_ADMIN',
      userId,
      mfa: 'disabled (ADMIN_MFA_REQUIRED=false)',
      howToLogin: [
        'Open http://localhost:3004/login',
        'Enter email + password only',
      ],
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
