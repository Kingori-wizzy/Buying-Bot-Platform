/** @type {import("lint-staged").Configuration} */
const config = {
  '*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
  ],
  '*.{json,jsonc,md,yml,yaml,css,scss,html}': ['prettier --write'],
  '*.{ts,tsx,mts,cts}': () => 'pnpm run typecheck',
};

export default config;
