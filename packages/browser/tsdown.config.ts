/**
 * tsdown config for @masonrykit/browser
 * - Bundles for the browser platform
 * - Emits both ESM and CJS builds with type declarations
 * - Externalizes peer dependencies
 *
 * Docs (Context7): https://tsdown.dev
 */

import { defineConfig } from 'tsdown'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('./package.json') as { version?: string }

export default defineConfig({
  // Explicit entry for clarity (defaults to src/index.ts if present)
  entry: 'src/index.ts',

  // Outputs
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,

  // Target and platform
  platform: 'browser',
  target: ['es2020'],

  // Clean dist before building
  clean: true,

  // Minify only in production to keep DX nice in dev
  minify: process.env.NODE_ENV === 'production',

  // Inject package version for build-time replacement
  define: {
    __MK_VERSION__: JSON.stringify(pkg.version),
    'process.env.MASONRYKIT_VERSION': JSON.stringify(pkg.version),
  },
})
