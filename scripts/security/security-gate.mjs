#!/usr/bin/env node
/**
 * Production/staging security gate checks (static + config assertions).
 * Exit non-zero on hard failures. Does not invent EXTERNAL evidence.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = 0;

function fail(message) {
  console.error(`FAIL ${message}`);
  failed += 1;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

const trackedEnv = spawnSync(
  'git',
  ['ls-files', '.env', '.env.*', '**/*.pem', '**/id_rsa'],
  { encoding: 'utf8', cwd: root },
);
const tracked = (trackedEnv.stdout || '')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => !f.endsWith('.example') && !f.includes('.env.example'));
if (tracked.length > 0) {
  fail(`tracked secret-like files: ${tracked.join(', ')}`);
} else {
  pass('no tracked .env / pem secrets');
}

const example = readFileSync(join(root, '.env.example'), 'utf8');
const liveKeyPatterns = [
  /sk-live-[A-Za-z0-9]+/,
  /AKIA[0-9A-Z]{16}/,
  /BEGIN RSA PRIVATE KEY/,
];
for (const pattern of liveKeyPatterns) {
  if (pattern.test(example)) {
    fail(`.env.example matches live secret pattern ${String(pattern)}`);
  }
}
pass('.env.example has no live-key patterns');

const requiredDocs = [
  'docs/project/EXTERNAL_PREREQUISITES.md',
  'docs/project/PRODUCTION_LAUNCH_CHECKLIST.md',
  'docs/project/PRODUCTION_READINESS_REPORT.md',
  'docs/project/FINAL_IMPLEMENTATION_REPORT.md',
  'docs/Deployment/runbooks/DEPLOYMENT_RUNBOOK.md',
  'docs/Deployment/runbooks/ROLLBACK_RUNBOOK.md',
  '.env.staging.example',
  'infrastructure/docker/compose/docker-compose.staging.yml',
];
for (const doc of requiredDocs) {
  if (!existsSync(join(root, doc))) fail(`missing ${doc}`);
  else pass(`exists ${doc}`);
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist') {
        continue;
      }
      walk(full, acc);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const frontendRoots = [join(root, 'apps/web'), join(root, 'apps/admin')];
const banned = [
  'SESSION_SECRET',
  'DATABASE_URL',
  'SERVICE_JWT_SECRET',
  'MPESA_CONSUMER_SECRET',
  'OPENAI_API_KEY',
  'REDIS_URL',
];
for (const fr of frontendRoots) {
  for (const file of walk(fr)) {
    const text = readFileSync(file, 'utf8');
    for (const name of banned) {
      if (
        text.includes(`process.env.${name}`) ||
        text.includes(`process.env['${name}']`)
      ) {
        fail(`${file} references server secret ${name}`);
      }
    }
  }
}
pass('frontend apps do not read server secrets via process.env');

const ci = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
if (!ci.includes('gitleaks')) fail('ci.yml missing gitleaks');
else pass('ci.yml includes gitleaks');
if (!ci.includes('pnpm audit')) fail('ci.yml missing pnpm audit');
else pass('ci.yml includes pnpm audit');

if (failed > 0) {
  console.error(`Security gate failed: ${failed} issue(s)`);
  process.exit(1);
}
console.log('Security gate OK');
