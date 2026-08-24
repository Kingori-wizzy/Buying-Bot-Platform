#!/usr/bin/env node
/**
 * Bootstrap a gitignored production env file for VPS/local stack testing.
 * NEVER commits secrets. Password must be supplied at runtime:
 *
 *   BOOTSTRAP_INFRA_PASSWORD='***' node scripts/deployment/bootstrap-env.mjs
 *
 * Writes: .env.production.local (gitignored)
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outPath = join(root, '.env.production.local');
const infraPassword = process.env.BOOTSTRAP_INFRA_PASSWORD ?? '';

if (!infraPassword || infraPassword.length < 8) {
  console.error(
    'FAIL: set BOOTSTRAP_INFRA_PASSWORD (min 8 chars) in your shell — never commit it.',
  );
  process.exit(1);
}

const sessionSecret =
  process.env.SESSION_SECRET ?? randomBytes(48).toString('base64').slice(0, 48);
const serviceJwt =
  process.env.SERVICE_JWT_SECRET ??
  randomBytes(48).toString('base64').slice(0, 48);
const s3Access = process.env.S3_ACCESS_KEY_ID ?? 'buyingbot_minio';
const s3Secret = process.env.S3_SECRET_ACCESS_KEY ?? infraPassword;

const webHost =
  process.env.SHOP_DOMAIN ?? process.env.WEB_HOST ?? 'shop.example.com';
const adminHost =
  process.env.ADMIN_DOMAIN ?? process.env.ADMIN_HOST ?? 'admin.example.com';
const apiHost =
  process.env.API_DOMAIN ?? process.env.API_HOST ?? 'api.example.com';

const publicWeb = `https://${webHost}`;
const publicAdmin = `https://${adminHost}`;
const publicApi = `https://${apiHost}`;

const lines = [
  '# AUTO-GENERATED — gitignored. Rotate before real production cutover.',
  'NODE_ENV=production',
  'LOG_LEVEL=info',
  'TZ=Africa/Nairobi',
  '',
  'POSTGRES_USER=buyingbot',
  `POSTGRES_PASSWORD=${infraPassword}`,
  'POSTGRES_DB=buyingbot',
  `REDIS_PASSWORD=${infraPassword}`,
  '',
  `SESSION_SECRET=${sessionSecret}`,
  `SERVICE_JWT_SECRET=${serviceJwt}`,
  'COOKIE_SECURE=true',
  'ADMIN_MFA_REQUIRED=false',
  '',
  `CORS_ORIGIN=${publicWeb},${publicAdmin}`,
  `NEXT_PUBLIC_API_BASE_URL=${publicApi}`,
  `PUBLIC_API_BASE_URL=${publicApi}`,
  `PUBLIC_WEB_URL=${publicWeb}`,
  `PUBLIC_ADMIN_URL=${publicAdmin}`,
  `PUBLIC_API_URL=${publicApi}`,
  `SHOP_DOMAIN=${webHost}`,
  `ADMIN_DOMAIN=${adminHost}`,
  `API_DOMAIN=${apiHost}`,
  `MEDIA_PUBLIC_BASE_URL=${publicApi}/v1/media/files`,
  '',
  'DEFAULT_CURRENCY=KES',
  'TAX_REQUIRED=true',
  'TAX_DEFAULT_RATE_BPS=1600',
  'PAYMENTS_ENABLED=false',
  'PAYMENT_PROVIDER=escrow',
  'ESCROW_ALLOW_TEST_DOUBLE=false',
  '',
  'MEDIA_DRIVER=s3',
  'S3_ENDPOINT=http://minio:9000',
  'S3_REGION=us-east-1',
  'S3_BUCKET=buyingbot-media',
  `S3_ACCESS_KEY_ID=${s3Access}`,
  `S3_SECRET_ACCESS_KEY=${s3Secret}`,
  'S3_FORCE_PATH_STYLE=true',
  '',
  'AI_PROVIDER=deterministic',
  '',
  'HTTP_PORT=8080',
  'HTTPS_PORT=8443',
  'TLS_CERT_HOST_DIR=./infrastructure/docker/compose/certs',
  '',
  `# fingerprint (no secrets): ${createHash('sha256').update(infraPassword).digest('hex').slice(0, 12)}`,
];

if (existsSync(outPath)) {
  console.error(`WARN: overwriting ${outPath}`);
}
writeFileSync(outPath, `${lines.join('\n')}\n`, { mode: 0o600 });
console.log(
  `OK wrote ${outPath} (chmod 600). Use: --env-file .env.production.local`,
);
console.log(
  'Rotate POSTGRES_PASSWORD, REDIS_PASSWORD, and MinIO keys before live cutover.',
);
