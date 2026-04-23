import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm'],
  outDir: 'dist',
  dts: true,
  platform: 'browser',
  clean: true,
  deps: {
    // Keep @masonrykit/core as an external dep — consumers install it alongside.
    skipNodeModulesBundle: true,
  },
  unbundle: true,
  publint: true,
  attw: { profile: 'esm-only' },
  exports: { devExports: true },
})
