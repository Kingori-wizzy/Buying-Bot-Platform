import { createConfig } from '@buying-bot/eslint-config';

/** @type {import("eslint").Linter.Config[]} */
export default createConfig({
  tsconfigRootDir: import.meta.dirname,
});
