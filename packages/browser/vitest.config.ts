import { defineConfig } from 'vitest/config'

/**
 * Vitest config for @masonrykit/browser
 *
 * - Tests run in browser environment with Playwright for real browser APIs
 * - Core layout tests still run in Node environment for speed
 */

export default defineConfig({
  test: {
    // Include both Node.js tests and browser tests
    include: ['tests/**/*.{test,spec}.ts', '__tests__/**/*.{test,spec}.ts'],

    // Use browser mode for browser-utils tests
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [
        {
          browser: 'chromium',
        },
      ],
    },

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
