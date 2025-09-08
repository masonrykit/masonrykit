import { defineConfig } from 'vitest/config'

/**
 * Vitest config for @masonrykit/browser
 *
 * - Unit tests run in Node (no DOM globals).
 */

export default defineConfig({
  test: {
    // Run tests only from dedicated test directories (TypeScript only)
    include: ['tests/**/*.{test,spec}.ts', '__tests__/**/*.{test,spec}.ts'],
    // Node environment for unit tests (faster, no JSDOM)
    environment: 'node',

    clearMocks: true,
    restoreMocks: true,
    isolate: true,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        '**/dist/**',
        '**/build/**',
        '**/__tests__/**',
        '**/tests/**',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
  },
})
