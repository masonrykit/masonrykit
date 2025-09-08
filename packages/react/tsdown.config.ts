/**
 * tsdown config for @masonrykit/react
 * - Bundles for the browser platform
 * - Emits both ESM and CJS builds with type declarations
 * - Externalizes peer dependencies and underlying browser package
 *
 * Docs (Context7): https://tsdown.dev
 */

import { defineConfig } from 'tsdown'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('./package.json') as {
  peerDependencies?: Record<string, string>
  dependencies?: Record<string, string>
}

const peerDeps = Object.keys(pkg.peerDependencies ?? {})
// Ensure React is never bundled and also keep the base browser utilities external
const extraExternals = ['react', 'react-dom', '@masonrykit/browser']
const external = Array.from(new Set([...peerDeps, ...extraExternals]))

export default defineConfig({
  // Explicit entry for clarity (defaults to src/index.ts if present)
  entry: {
    index: 'src/index.tsx',
    useMasonry: 'src/useMasonry.ts',
  },

  // Outputs
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,

  // Target and platform suitable for modern browsers and React apps
  platform: 'browser',
  target: ['es2020'],

  // Clean dist before building
  clean: true,

  // Minify only in production to keep DX nice in dev
  minify: process.env.NODE_ENV === 'production',

  // Do not bundle peer deps or underlying browser runtime
  external,
})
