// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Flat config covering both workspaces. The server is Node/CommonJS-flavoured
 * TypeScript; the web app is browser React + TSX.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
      'server/jest.config.js',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ---- Shared rules ---------------------------------------------------------
  {
    rules: {
      // The codebase deliberately uses `any` at the Mongoose/aggregation boundary,
      // where lean documents and raw pipeline rows have no useful static type.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  // ---- Repo tooling (plain ESM, runs on Node) -------------------------------
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
  },

  // ---- Server ---------------------------------------------------------------
  {
    files: ['server/src/**/*.ts', 'server/tests/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      // Lazy `require()` is used intentionally for optional deps (ioredis,
      // mongodb-memory-server) so production images need not install them.
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },

  // ---- Web ------------------------------------------------------------------
  {
    files: ['web/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
);
