import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: '.',
  plugins: [react(), tailwindcss()],
  // Pick up tsdown's `devExports: true` source conditions — when a workspace
  // package exposes a `source` condition (pointing at `src/*.ts`), Vite
  // resolves through it so HMR updates library source directly with no
  // intermediate rebuild.
  // Add `source` to the default conditions so tsdown's devExports resolve
  // to src/ during dev. Vite auto-adds `development` or `production` based
  // on mode; no need to list either here.
  resolve: {
    conditions: ['source'],
  },
  server: {
    host: true,
    port: 5174,
    open: true,
    // Pre-transform the entry + heavy modules on server start so the first
    // request doesn't wait on cold compilation.
    warmup: { clientFiles: ['./src/main.tsx'] },
  },
  preview: { host: true, port: 5174, open: true },
})
