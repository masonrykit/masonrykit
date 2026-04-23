import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.tsx',
  format: ['esm'],
  outDir: 'dist',
  // `isolatedDeclarations: true` in tsconfig lets tsdown use oxc-transform
  // for .d.ts emission (fast), so the `eager: true` workaround is no longer
  // needed.
  dts: true,
  platform: 'browser',
  clean: true,
  deps: {
    // Externalize everything from node_modules — that means peer deps
    // (react, react-dom), normal deps (@masonrykit/core, @masonrykit/browser),
    // and sub-path imports like react/jsx-runtime. Consumers install their
    // own copies; we don't want to inline ours.
    skipNodeModulesBundle: true,
  },
  // Preserve source structure in dist (better tree-shaking, traceable diffs).
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
