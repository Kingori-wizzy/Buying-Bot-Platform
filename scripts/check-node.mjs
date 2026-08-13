#!/usr/bin/env node
/**
 * Fails fast when the active Node major version does not match the repo pin.
 * Pin source: .nvmrc / package.json engines / Docker NODE_VERSION.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nvmrc = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
const expectedMajor = Number.parseInt(nvmrc.split('.')[0] ?? nvmrc, 10);
const actualMajor = Number.parseInt(
  process.versions.node.split('.')[0] ?? '',
  10,
);

if (!Number.isFinite(expectedMajor) || !Number.isFinite(actualMajor)) {
  console.error(
    `[check:node] Unable to parse Node versions (expected from .nvmrc=${nvmrc}, actual=${process.versions.node})`,
  );
  process.exit(1);
}

if (actualMajor !== expectedMajor) {
  console.error(
    `[check:node] Node.js ${String(expectedMajor)}.x required (see .nvmrc). Current: ${process.versions.node}`,
  );
  process.exit(1);
}

console.log(
  `[check:node] OK — Node ${process.versions.node} matches major ${String(expectedMajor)}`,
);
