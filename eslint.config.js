/**
 * ESLint 9 Flat Config for MasonryKit monorepo
 * - Supports TypeScript, JSX, Vitest/Jest-style test globals
 * - Compatible with pnpm workspaces
 */

import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import globals from 'globals'
import prettier from 'eslint-config-prettier'

export default [
  // Ignore build artifacts and vendor dirs
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.tsdown/**',
      '**/.turbo/**',
      '**/.next/**',
    ],
  },

  // Report unused eslint-disable comments
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },

  // Base JS recommended rules
  js.configs.recommended,

  // Global language options for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.es2022,
        ...globals.node,
      },
    },
  },

  // Browser globals for browser-specific code
  {
    files: [
      'apps/**/*.{js,jsx,ts,tsx}',
      'packages/react/**/*.{js,jsx,ts,tsx}',
      'packages/browser/**/*.{js,jsx,ts,tsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // TypeScript and JSX rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Prefer TS rules over JS equivalents
      'no-unused-vars': 'off',
      // TS handles undefined variables and type-only imports; avoid false positives
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // Type import/style consistency
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Ensure type-only imports have no side effects
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // Useful correctness rules
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
    },
  },

  // Test files (Vitest uses Jest-like globals)
  {
    files: [
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // Test runners provide globals; avoid false positives
      'no-undef': 'off',
    },
  },

  // Disable formatting-related lint rules (use Prettier for formatting)
  prettier,
]
