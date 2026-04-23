import { defineConfig } from 'vitest/config'

/**
 * Root Vitest config — aggregates every package's config into a single
 * run via the `projects` API (Vitest 4+). One Vite server serves them all,
 * so module transforms and dep resolution are cached across packages.
 *
 * Use `pnpm vitest` at the repo root to run everything; per-package
 * `pnpm --filter <pkg> test` still works because each package retains its
 * own `vitest.config.ts`.
 */
export default defineConfig({
  test: {
    projects: ['packages/core', 'packages/browser', 'packages/react'],
  },
})
