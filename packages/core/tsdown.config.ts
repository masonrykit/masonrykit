import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm'],
  outDir: 'dist',
  dts: true,
  // Core has no DOM or Node APIs — it's pure math, safe to use anywhere.
  platform: 'neutral',
  clean: true,
  // Preserve source structure in dist so consumers tree-shake cleanly.
  unbundle: true,
  // Post-build gates: catches package.json shape bugs and type-resolution
  // problems before publishing. The `esm-only` profile skips `node10` and
  // `node16-cjs` resolution checks since we deliberately don't ship CJS.
  publint: true,
  attw: { profile: 'esm-only' },
  // tsdown writes `exports` to package.json; `devExports: true` makes every
  // condition point to source during dev (for Vite/Vitest "source"/"development"
  // conditions) and moves the dist exports under `publishConfig.exports` at
  // publish time — so there is no rebuild step in the dev loop.
  exports: { devExports: true },
})
