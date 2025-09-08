import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

/**
 * Vite config for the React + TypeScript playground at apps/vite-react
 *
 * Notes:
 * - This app is for quick manual testing of @masonrykit/react + @masonrykit/browser.
 * - We alias the package names to local source for instant iteration without building.
 *
 * Expected companion files:
 * - apps/vite-react/index.html
 *   <!doctype html>
 *   <html lang="en">
 *     <head>
 *       <meta charset="UTF-8" />
 *       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
 *       <title>MasonryKit — Vite React Playground</title>
 *     </head>
 *     <body>
 *       <div id="root"></div>
 *       <script type="module" src="/src/main.tsx"></script>
 *     </body>
 *   </html>
 *
 * - apps/vite-react/src/main.tsx
 *   import React from 'react'
 *   import { createRoot } from 'react-dom/client'
 *   import { Masonry } from '@masonrykit/react'
 *
 *   const items = [
 *     { id: 'a', aspectRatio: 4/3 },
 *     { id: 'b', height: 180 },
 *     { id: 'c', aspectRatio: 16/9 },
 *     { id: 'd', aspectRatio: 1.2 },
 *   ]
 *
 *   function App() {
 *     return (
 *       <div style={{ padding: 16 }}>
 *         <h1 style={{ margin: '8px 0 16px' }}>MasonryKit — React Playground</h1>
 *         <Masonry
 *           items={items}
 *           columnWidth={220}
 *           gap={12}
 *           render={(item) => (
 *             <div
 *               style={{
 *                 width: '100%',
 *                 height: '100%',
 *                 borderRadius: 8,
 *                 background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(14,165,233,0.25))',
 *                 border: '1px solid rgba(148,163,184,0.25)',
 *                 display: 'flex',
 *                 alignItems: 'center',
 *                 justifyContent: 'center',
 *                 color: '#0f172a',
 *                 fontWeight: 700,
 *               }}
 *             >
 *               {item.id}
 *             </div>
 *           )}
 *         />
 *       </div>
 *     )
 *   }
 *
 *   const root = createRoot(document.getElementById('root')!)
 *   root.render(<App />)
 */

const aliasReact = fileURLToPath(new URL('../../packages/react/src/index.tsx', import.meta.url))
const aliasBrowser = fileURLToPath(new URL('../../packages/browser/src/index.ts', import.meta.url))
const aliasCore = fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url))

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
    alias: {
      // Use local sources for fast iteration
      '@masonrykit/react': aliasReact,
      '@masonrykit/browser': aliasBrowser,
      '@masonrykit/core': aliasCore,
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
})
