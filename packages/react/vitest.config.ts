import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@masonrykit/browser': resolvePath(__dirname, '../browser/src/index.ts'),
    },
  },
  test: {
    // Enable Browser Mode with Playwright provider
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
    // Browser mode provides DOM, no separate environment required
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', '__tests__/**/*.{ts,tsx}'],
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
