/**
 * tsdown config for @masonrykit/core
 * - Builds ESM and CJS outputs with type declarations
 * - Targets Node platform (runtime-agnostic math)
 * - Externalizes peer dependencies (if any)
 *
 * Docs: https://tsdown.dev
 */

import { defineConfig } from 'tsdown'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('./package.json') as {
  version?: string
  peerDependencies?: Record<string, string>
}
const VERSION = pkg.version ?? ''
const peerDeps = Object.keys(pkg.peerDependencies ?? {})

// Externalize peer dependencies if present

export default defineConfig({
  // Entry
  entry: 'src/index.ts',

  // Outputs
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,

  // Target and platform
  platform: 'node',
  target: ['es2020'],

  // Clean dist before building
  clean: true,

  // Minify only in production to keep DX nice in dev
  minify: process.env.NODE_ENV === 'production',

  // Inject package version for build-time replacement
  define: {
    __MK_VERSION__: JSON.stringify(VERSION),
    'process.env.MASONRYKIT_VERSION': JSON.stringify(VERSION),
  },

  // Don't bundle peer dependencies
  external: peerDeps,
})
