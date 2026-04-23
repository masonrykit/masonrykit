import { defineConfig } from 'vitest/config'

/**
 * Vitest config for @masonrykit/core
 *
 * - Runs unit tests in a Node environment (no DOM).
 * - Allows passing with no tests so the workspace CI can succeed before tests exist.
 */

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.ts', '__tests__/**/*.{test,spec}.ts'],
    // `vitest bench` picks up `bench/**/*.bench.ts` via the default benchmark
    // glob; no extra config needed.
    environment: 'node',
    passWithNoTests: true,

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
