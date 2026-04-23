import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [react()],
  define: {
    'globalThis.IS_REACT_ACT_ENVIRONMENT': 'true',
  },
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },

    include: ['src/**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.test.{ts,tsx}'],
    typecheck: {
      enabled: true,
      include: ['**/__tests__/**/*.test-d.ts', '**/*.test-d.ts'],
    },
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
        '**/*.config.*',
        '**/*.d.ts',
        '**/vitest.config.*',
      ],
    },
  },
})
