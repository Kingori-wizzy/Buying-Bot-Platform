#!/usr/bin/env node
/**
 * Cross-platform production preflight (static + optional live checks).
 * Usage: node scripts/deployment/production-preflight.mjs [--env-file PATH] [--live]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const live = args.includes('--live');
const envArgIdx = args.indexOf('--env-file');
const envFile =
  envArgIdx >= 0
    ? args[envArgIdx + 1]
    : (process.env.BUYINGBOT_ENV_FILE ?? join(root, '.env.production.local'));

const compose = join(
  root,
  'infrastructure/docker/compose/docker-compose.production.yml',
);

let failed = 0;
function fail(msg) {
  console.error(`FAIL ${msg}`);
  failed += 1;
}
function ok(msg) {
  console.log(`OK ${msg}`);
}
function warn(msg) {
  console.warn(`WARN ${msg}`);
}

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

console.log('=== Production preflight ===');
console.log(`env: ${envFile}`);

if (!existsSync(compose)) fail(`missing ${compose}`);
else ok('production compose file exists');

if (!existsSync(envFile)) {
  fail(
    `env file missing: ${envFile} — run BOOTSTRAP_INFRA_PASSWORD=… node scripts/deployment/bootstrap-env.mjs or copy .env.production.example`,
  );
} else {
  ok('env file exists');
}

const env = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {};

const required = [
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'REDIS_PASSWORD',
  'SESSION_SECRET',
  'SERVICE_JWT_SECRET',
  'CORS_ORIGIN',
  'NEXT_PUBLIC_API_BASE_URL',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'PUBLIC_WEB_URL',
  'PUBLIC_ADMIN_URL',
  'PUBLIC_API_URL',
];

if (!env.S3_ACCESS_KEY_ID && env.S3_ACCESS_KEY) {
  env.S3_ACCESS_KEY_ID = env.S3_ACCESS_KEY;
}
if (!env.S3_SECRET_ACCESS_KEY && env.S3_SECRET_KEY) {
  env.S3_SECRET_ACCESS_KEY = env.S3_SECRET_KEY;
}

for (const key of required) {
  if (!env[key]) fail(`${key} is empty or missing`);
  else ok(`${key} set`);
}

if ((env.SESSION_SECRET ?? '').length < 32) {
  fail('SESSION_SECRET must be >= 32 characters');
}
if ((env.SERVICE_JWT_SECRET ?? '').length < 32) {
  fail('SERVICE_JWT_SECRET must be >= 32 characters');
}

if (env.NODE_ENV && env.NODE_ENV !== 'production') {
  fail(`NODE_ENV must be production (got a non-production value)`);
} else if (env.NODE_ENV === 'production') {
  ok('NODE_ENV=production');
} else {
  warn(
    'NODE_ENV unset in env file — Compose injects production for app services',
  );
}

if ((env.CORS_ORIGIN ?? '').includes('*')) {
  fail('CORS_ORIGIN must not contain a wildcard in production');
} else if (env.CORS_ORIGIN) {
  ok('CORS_ORIGIN is an explicit allowlist');
}

for (const key of ['PUBLIC_WEB_URL', 'PUBLIC_ADMIN_URL', 'PUBLIC_API_URL']) {
  const value = env[key] ?? '';
  if (
    value &&
    !value.startsWith('https://') &&
    !value.includes('example.com')
  ) {
    warn(`${key} is not https — TLS should be enabled before go-live`);
  }
}

if (env.SHOP_DOMAIN || env.ADMIN_DOMAIN || env.API_DOMAIN) {
  ok('domain hostnames present (SHOP_DOMAIN/ADMIN_DOMAIN/API_DOMAIN)');
}

if (env.COOKIE_SECURE !== 'true') {
  fail('COOKIE_SECURE must be true in production');
} else ok('COOKIE_SECURE=true');

if (env.MEDIA_DRIVER !== 's3' && env.MEDIA_DRIVER !== 'minio') {
  warn(
    `MEDIA_DRIVER=${env.MEDIA_DRIVER ?? 'unset'} — production should use s3/minio`,
  );
} else ok(`MEDIA_DRIVER=${env.MEDIA_DRIVER}`);

if (env.ADMIN_MFA_REQUIRED !== 'true') {
  fail('ADMIN_MFA_REQUIRED must be true in production');
} else {
  ok('ADMIN_MFA_REQUIRED=true');
}

if (env.ESCROW_ALLOW_TEST_DOUBLE === 'true') {
  fail('ESCROW_ALLOW_TEST_DOUBLE must be false in production');
} else {
  ok('ESCROW_ALLOW_TEST_DOUBLE is not enabled');
}

if (env.PAYMENTS_ENABLED === 'true') {
  for (const key of [
    'ESCROW_API_KEY',
    'ESCROW_API_SECRET',
    'ESCROW_BASE_URL',
    'ESCROW_WEBHOOK_SECRET',
  ]) {
    if (!env[key]) fail(`${key} required when PAYMENTS_ENABLED=true`);
    else ok(`${key} set (Escrow)`);
  }
  if (env.ESCROW_ALLOW_TEST_DOUBLE === 'true') {
    fail('ESCROW_ALLOW_TEST_DOUBLE must be false in production');
  }
  if (env.PAYMENT_PROVIDER && env.PAYMENT_PROVIDER !== 'escrow') {
    fail('PAYMENT_PROVIDER must be escrow for production customer checkout');
  }
} else {
  ok('PAYMENTS_ENABLED=false (Escrow EXTERNAL_PREREQUISITE until configured)');
}

if (env.MPESA_ENABLED === 'true') {
  fail(
    'MPESA_ENABLED must be false — M-Pesa is deferred from customer checkout',
  );
} else {
  ok('MPESA_ENABLED is not enabled');
}

if (env.MARKETPLACE_INGESTION_ENABLED === 'true') {
  fail(
    'MARKETPLACE_INGESTION_ENABLED must be false — production catalog is admin-managed',
  );
} else {
  ok('MARKETPLACE_INGESTION_ENABLED is not enabled');
}

if (!env.ESCROW_API_KEY) {
  ok('Escrow credentials absent — ESCROW_NOT_CONFIGURED expected (safe)');
}

for (const ext of ['OPENAI_API_KEY', 'SMTP_URL', 'SMS_PROVIDER_API_KEY']) {
  if (!env[ext]) ok(`${ext} not set — EXTERNAL_PREREQUISITE`);
}

const docker = spawnSync(
  'docker',
  ['compose', '-f', compose, '--env-file', envFile, 'config'],
  {
    encoding: 'utf8',
    cwd: root,
  },
);
if (docker.status !== 0) {
  fail(`docker compose config: ${docker.stderr || docker.stdout}`);
} else ok('docker compose config validates');

const bannedInRepo = ['@364VTPjose', 'sk-live-', 'BEGIN RSA PRIVATE KEY'];
for (const pattern of bannedInRepo) {
  if (
    existsSync(join(root, '.env.example')) &&
    readFileSync(join(root, '.env.example'), 'utf8').includes(pattern)
  ) {
    fail(`.env.example contains forbidden pattern`);
  }
  if (
    existsSync(join(root, '.env.production.example')) &&
    readFileSync(join(root, '.env.production.example'), 'utf8').includes(
      pattern,
    )
  ) {
    fail(`.env.production.example contains forbidden pattern`);
  }
}
ok('example env files do not contain bootstrap/live secrets');

async function runLiveChecks() {
  console.log('\n=== Live checks (stack must be running) ===');
  const apiUrl =
    env.PUBLIC_API_URL ??
    env.NEXT_PUBLIC_API_BASE_URL ??
    'http://127.0.0.1:8080';
  const liveBase = apiUrl.replace(/\/$/, '');
  for (const path of ['/health/live', '/health/ready']) {
    try {
      const res = await fetch(`${liveBase}${path}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) ok(`GET ${path} → ${res.status}`);
      else fail(`GET ${path} → ${res.status}`);
    } catch (e) {
      fail(`GET ${path} unreachable (${String(e)})`);
    }
  }
}

if (live) {
  await runLiveChecks();
}

console.log('\n=== Summary ===');
if (failed > 0) {
  console.error(`Preflight FAILED (${failed} issue(s))`);
  process.exit(1);
}
console.log('Preflight PASSED');
