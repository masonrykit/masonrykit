import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: '.',
  plugins: [tailwindcss()],
  resolve: {
    conditions: ['source'],
  },
  server: {
    host: true,
    port: 5173,
    open: true,
    warmup: { clientFiles: ['./src/main.ts'] },
  },
  preview: { host: true, port: 5173, open: true },
})
