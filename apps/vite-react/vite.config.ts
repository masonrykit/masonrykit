import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const toPath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))
const aliasReactEntry = toPath('../../packages/react/src/index.tsx')
const aliasReactDir = toPath('../../packages/react/src/')
const aliasBrowserEntry = toPath('../../packages/browser/src/index.ts')
const aliasBrowserDir = toPath('../../packages/browser/src/')
const aliasCoreEntry = toPath('../../packages/core/src/index.ts')
const aliasCoreDir = toPath('../../packages/core/src/')

export default defineConfig({
  root: '.',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5174,
    open: true,
  },
  preview: {
    host: true,
    port: 5174,
    open: true,
  },
  resolve: {
    alias: [
      { find: '@masonrykit/react/', replacement: `${aliasReactDir}` },
      { find: '@masonrykit/react', replacement: aliasReactEntry },
      { find: '@masonrykit/browser/', replacement: `${aliasBrowserDir}` },
      { find: '@masonrykit/browser', replacement: aliasBrowserEntry },
      { find: '@masonrykit/core/', replacement: `${aliasCoreDir}` },
      { find: '@masonrykit/core', replacement: aliasCoreEntry },
    ],
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
})
