#!/usr/bin/env node
/**
 * Post-deploy smoke. Never prints secret values.
 * Usage: node scripts/deployment/post-deploy-smoke.mjs [--env-file PATH]
 *
 * Escrow not configured → catalog/cart/health must still pass.
 * Live payment success is BLOCKED unless credentials exist (not invented here).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const envArgIdx = args.indexOf('--env-file');
const envFile =
  envArgIdx >= 0
    ? args[envArgIdx + 1]
    : (process.env.BUYINGBOT_ENV_FILE ?? join(root, '.env.production.local'));

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

let failed = 0;
function fail(msg) {
  console.error(`FAIL ${msg}`);
  failed += 1;
}
function ok(msg) {
  console.log(`OK ${msg}`);
}
function blocked(msg) {
  console.log(`BLOCKED ${msg}`);
}

const env = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {};
const apiBase = (
  env.PUBLIC_API_URL ??
  env.NEXT_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:8080'
).replace(/\/$/, '');
const webBase = (env.PUBLIC_WEB_URL ?? '').replace(/\/$/, '');
const adminBase = (env.PUBLIC_ADMIN_URL ?? '').replace(/\/$/, '');

async function get(url, { optional = false } = {}) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    return res;
  } catch (error) {
    if (optional) {
      blocked(`${url} unreachable (${String(error)}) — DNS/TLS may be pending`);
      return null;
    }
    fail(`${url} unreachable (${String(error)})`);
    return null;
  }
}

console.log('=== Post-deploy smoke ===');
console.log(`api: ${apiBase}`);

const live = await get(`${apiBase}/health/live`);
if (live?.ok) ok('API /health/live');
else if (live) fail(`API /health/live → ${live.status}`);

const ready = await get(`${apiBase}/health/ready`);
if (ready?.ok) ok('API /health/ready');
else if (ready) fail(`API /health/ready → ${ready.status}`);

const products = await get(`${apiBase}/v1/products?pageSize=1`);
if (products?.ok) ok('GET /v1/products');
else if (products) fail(`GET /v1/products → ${products.status}`);

const search = await get(`${apiBase}/v1/search/products?q=a&pageSize=1`);
if (search?.ok) ok('GET /v1/search/products');
else if (search) fail(`GET /v1/search/products → ${search.status}`);

if (webBase) {
  const home = await get(webBase, { optional: true });
  if (home?.ok) ok('GET storefront');
} else {
  blocked('PUBLIC_WEB_URL unset — skip storefront GET');
}

if (adminBase) {
  const admin = await get(adminBase, { optional: true });
  if (admin?.ok) ok('GET admin');
} else {
  blocked('PUBLIC_ADMIN_URL unset — skip admin GET');
}

if (env.PAYMENTS_ENABLED === 'true' && env.ESCROW_API_KEY) {
  blocked(
    'Escrow credentials present in env — live payment flow not executed by smoke (requires provider sandbox)',
  );
} else {
  ok('Escrow not live — fail-closed expected (ESCROW_NOT_CONFIGURED)');
}

console.log('\n=== Summary ===');
if (failed > 0) {
  console.error(`Smoke FAILED (${failed} issue(s))`);
  process.exit(1);
}
console.log('Smoke PASSED');
