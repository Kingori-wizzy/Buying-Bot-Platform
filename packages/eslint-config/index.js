import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Creates the repository ESLint flat config.
 *
 * @param {{ tsconfigRootDir: string }} options
 * @returns {import("eslint").Linter.Config[]}
 */
export function createConfig({ tsconfigRootDir }) {
  return tseslint.config(
    {
      name: 'buying-bot/ignores',
      ignores: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.turbo/**',
        '**/.next/**',
        '**/coverage/**',
        'pnpm-lock.yaml',
        '**/*.tsbuildinfo',
        '**/vitest.config.ts',
        '**/next-env.d.ts',
        'infrastructure/perf/k6/**',
        'e2e/**',
        'playwright-report/**',
        'test-results/**',
      ],
    },

    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
      name: 'buying-bot/typescript',
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
          allowDefaultProject: ['*.mjs', '*.js'],
        },
      },
    },
    {
      name: 'buying-bot/javascript-globals',
      files: ['**/*.{js,mjs,cjs}'],
      languageOptions: {
        globals: {
          ...globals.node,
        },
      },
      extends: [tseslint.configs.disableTypeChecked],
    },
    {
      name: 'buying-bot/import-quality',
      plugins: {
        'simple-import-sort': simpleImportSort,
        'unused-imports': unusedImports,
      },
      rules: {
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'error',
          {
            args: 'after-used',
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    eslintConfigPrettier,
  );
}

export default createConfig;
