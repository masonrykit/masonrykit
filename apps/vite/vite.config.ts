import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const aliasCore = fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url))
const aliasBrowser = fileURLToPath(new URL('../../packages/browser/src/index.ts', import.meta.url))

export default defineConfig({
  root: '.',
  plugins: [tailwindcss()],
  server: {
    host: true,
    port: 5173,
    open: true,
  },
  preview: {
    host: true,
    port: 5173,
    open: true,
  },
  resolve: {
    alias: {
      '@masonrykit/browser': aliasBrowser,
      '@masonrykit/core': aliasCore,
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
})
