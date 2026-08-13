/**
 * Writes artifacts/BUILD_METADATA.json with git sha, node version, and date.
 * Does not invent remote deploy evidence.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, 'artifacts');
mkdirSync(outDir, { recursive: true });

function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

const metadata = {
  generatedAt: new Date().toISOString(),
  version: process.env.npm_package_version || 'unknown',
  gitSha: git(['rev-parse', 'HEAD']),
  gitBranch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
  gitDescribe: git(['describe', '--tags', '--always', '--dirty']),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  note: 'Record before staging promote. Do not fabricate EXTERNAL host verification.',
};

const outFile = join(outDir, 'BUILD_METADATA.json');
writeFileSync(outFile, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outFile}`);
console.log(JSON.stringify(metadata, null, 2));
