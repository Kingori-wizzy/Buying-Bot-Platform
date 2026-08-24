function notPlaywrightE2e(files) {
  return files.filter((file) => {
    const normalized = file.replaceAll('\\', '/');
    return !normalized.includes('/e2e/') && !normalized.startsWith('e2e/');
  });
}

/** @type {import("lint-staged").Configuration} */
const config = {
  '*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}': (files) => {
    const targets = notPlaywrightE2e(files);
    if (targets.length === 0) {
      return [];
    }
    return [
      `eslint --fix --max-warnings=0 ${targets.map((file) => `"${file}"`).join(' ')}`,
      `prettier --write ${targets.map((file) => `"${file}"`).join(' ')}`,
    ];
  },
  '*.{json,jsonc,md,yml,yaml,css,scss,html}': ['prettier --write'],
  '*.{ts,tsx,mts,cts}': () => 'pnpm run typecheck',
};

export default config;
