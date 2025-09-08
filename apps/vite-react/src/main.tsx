import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as Masonry from '@masonrykit/react'

import './style.css'

type DemoMeta = { src: string }
type DemoItem = {
  id: string
  height?: number
  aspectRatio?: number
  columnSpan?: number
  meta: DemoMeta
}

function makeDemoItems(count: number, offset = 0): DemoItem[] {
  const out: DemoItem[] = []
  // deterministic-ish pseudo-random so HMR refreshes feel stable
  let seed = 1337 + offset * 97
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const img = (id: string) => `https://picsum.photos/seed/${encodeURIComponent(id)}/800/600`

  for (let i = 0; i < count; i++) {
    const id = `cell-${offset + i + 1}`
    const src = img(id)

    if (i % 3 === 0) {
      // aspect-ratio item
      const ratios = [4 / 3, 1, 16 / 9, 3 / 4, 2, 0.75, 1.25, 1.5, 0.5, 1.1, 1.3]
      out.push({
        id,
        aspectRatio: ratios[Math.floor(rnd() * ratios.length)]!,
        ...(i % 9 === 0 ? { columnSpan: 2 } : i % 23 === 0 ? { columnSpan: 3 } : {}),
        meta: { src },
      })
    } else {
      // fixed-height item (80..320)
      const h = 80 + Math.floor(rnd() * 240)
      out.push({
        id,
        height: h,
        ...(i % 9 === 0 ? { columnSpan: 2 } : i % 23 === 0 ? { columnSpan: 3 } : {}),
        meta: { src },
      })
    }
  }
  return out
}

const PRESETS = {
  Compact: { columnWidth: 160, gap: 8 },
  Cozy: { columnWidth: 200, gap: 12 },
  Spacious: { columnWidth: 280, gap: 16 },
  Gallery: { columnWidth: 240, gap: 0 },
} as const
type PresetName = keyof typeof PRESETS | 'Custom'

function App() {
  const [columnWidth, setColumnWidth] = useState<number>(220)
  const [gap, setGap] = useState<number>(12)
  const [duration, setDuration] = useState<number>(220)
  const [useGpu, setUseGpu] = useState<boolean>(true)
  const [horizontalOrder, setHorizontalOrder] = useState(false)
  const [showPhotos, setShowPhotos] = useState<boolean>(true)
  const [useStamps, setUseStamps] = useState<boolean>(false)
  const [preset, setPreset] = useState<PresetName>('Custom')
  const [items, setItems] = useState<DemoItem[]>(() => makeDemoItems(28))
  const [itemsCount, setItemsCount] = useState<number>(28)
  const gridRef = React.useRef<HTMLElement | null>(null)

  const applyPreset = (name: PresetName) => {
    if (name !== 'Custom') {
      const p = PRESETS[name]
      setColumnWidth(p.columnWidth)
      setGap(p.gap)
    }
    setPreset(name)
  }

  // Keep preset in sync with current width/gap
  useMemo(() => {
    let match: PresetName = 'Custom'
    for (const key of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
      const p = PRESETS[key]
      if (p.columnWidth === columnWidth && p.gap === gap) {
        match = key
        break
      }
    }
    if (preset !== match) setPreset(match)
  }, [columnWidth, gap])

  // Demo stamps aligned to column multiples for clarity

  // Update items when itemsCount changes
  const setCount = (next: number) => {
    setItemsCount(next)
    setItems(makeDemoItems(next))
  }

  // UI helpers
  const shuffle = () => {
    setItems((prev) => {
      const arr = prev.slice()
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = arr[i]!
        arr[i] = arr[j]!
        arr[j] = tmp
      }
      return arr
    })
  }

  const addMore = (n = 12) => {
    setItems((prev) => {
      const next = makeDemoItems(n, prev.length).map((d) => ({ ...d, id: `${d.id}` }))
      return prev.concat(next)
    })
    setItemsCount((c) => Math.min(200, c + n))
  }

  const resetItems = () => {
    setItems(makeDemoItems(6))
    setItemsCount(6)
  }

  // Debug overlay: collect cell inputs/outputs when enabled (immediately and next RAF)

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/70 border-b border-white/10 px-5 py-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="font-extrabold tracking-tight">MasonryKit</div>
          </div>
          <div className="text-lg font-extrabold tracking-tight mt-1">
            MasonryKit — Vite React Playground
          </div>
          <div className="text-sm opacity-80 mt-1">
            Using the <code>@masonrykit/react</code> declarative CSS API to render a masonry layout.
          </div>
        </header>

        <section>
          <div className="flex flex-wrap items-start gap-x-4 gap-y-3 mb-4 p-3 rounded-md border border-slate-700/40 shadow-sm bg-white/5 dark:bg-slate-900/40">
            <label>
              Column width:{' '}
              <input
                id="colWidth"
                type="range"
                min={80}
                max={360}
                value={columnWidth}
                onChange={(e) => setColumnWidth(parseInt(e.currentTarget.value, 10))}
              />{' '}
              <span id="colWidthValue">{columnWidth}</span>px
            </label>

            <label>
              Gap:{' '}
              <input
                type="range"
                id="gap"
                min={0}
                max={32}
                value={gap}
                onChange={(e) => setGap(parseInt(e.currentTarget.value, 10))}
              />{' '}
              <span id="gapValue">{gap}</span>px
            </label>

            <label>
              Anim:{' '}
              <input
                type="range"
                min={0}
                max={1000}
                step={10}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.currentTarget.value, 10))}
                id="duration"
              />{' '}
              <span id="durationValue">{duration}</span> ms
            </label>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={useGpu}
                onChange={() => setUseGpu((v) => !v)}
                className="accent-slate-400"
              />
              GPU transforms
            </label>

            <label>
              Preset:{' '}
              <select
                value={preset}
                onChange={(e) => applyPreset(e.currentTarget.value as PresetName)}
                id="preset"
              >
                <option value="Custom">Custom</option>
                <option value="Compact">Compact</option>
                <option value="Cozy">Cozy</option>
                <option value="Spacious">Spacious</option>
                <option value="Gallery">Gallery</option>
              </select>
            </label>

            <label>
              Items:{' '}
              <input
                type="range"
                min={6}
                max={120}
                value={itemsCount}
                onChange={(e) => setCount(parseInt(e.currentTarget.value, 10))}
                id="itemsCount"
              />{' '}
              <span id="itemsCountValue">{itemsCount}</span> pcs
            </label>

            <label>
              <input
                type="checkbox"
                checked={showPhotos}
                onChange={() => setShowPhotos((v) => !v)}
                className="accent-slate-400"
              />
              Photos
            </label>

            <label>
              <input
                type="checkbox"
                checked={useStamps}
                onChange={() => setUseStamps((v) => !v)}
                className="accent-slate-400"
              />
              Stamps
            </label>

            <button
              type="button"
              className="px-3 py-2 rounded-md border border-slate-700/50 shadow-sm bg-white/5 hover:bg-white/10 transition"
              onClick={() => addMore(12)}
            >
              Add 12
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-md border border-slate-700/50 shadow-sm bg-white/5 hover:bg-white/10 transition"
              onClick={resetItems}
            >
              Reset
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-md border border-slate-700/50 shadow-sm bg-white/5 hover:bg-white/10 transition"
              onClick={shuffle}
            >
              Shuffle
            </button>

            <label>
              <input
                type="checkbox"
                checked={horizontalOrder}
                onChange={() => setHorizontalOrder((v) => !v)}
                className="accent-slate-400"
              />
              Horizontal order
            </label>
          </div>
        </section>

        <Masonry.Grid
          ref={gridRef}
          className="relative w-full min-h-80 h-[var(--mk-grid-height)] border border-slate-800/50 rounded-xl p-4 bg-white/5 transition-all duration-[var(--mk-app-transition-duration)] ease-[var(--mk-app-transition-easing)]"
          style={
            {
              ['--mk-app-transition-duration']: `${duration}ms`,
              ['--mk-app-transition-easing']: 'ease',
              ['--mk-column-width']: `${columnWidth}`,
              ['--mk-gap']: `${gap}px`,
              ['--mk-horizontal-order']: horizontalOrder ? 1 : 0,
              ['--mk-use-transform']: useGpu ? 1 : 0,
            } as React.CSSProperties
          }
          {...(useStamps
            ? {
                stampsCols: [
                  { startCol: 0, span: 4, top: 0, height: 14 },
                  { startCol: 1, span: 1, top: 10, height: 30 },
                ],
              }
            : {})}
        >
          {items.map((item) => (
            <Masonry.Cell
              key={item.id}
              className="absolute box-border w-[var(--mk-cell-width)] h-[var(--mk-cell-height)] left-[calc((1-var(--mk-use-transform,1))*var(--mk-cell-x))] top-[calc((1-var(--mk-use-transform,1))*var(--mk-cell-y))] translate-x-[calc(var(--mk-use-transform,1)*var(--mk-cell-x))] translate-y-[calc(var(--mk-use-transform,1)*var(--mk-cell-y))] transform transition-all duration-[var(--mk-app-transition-duration)] ease-[var(--mk-app-transition-easing)] [will-change:left,top,width,height,transform]"
              style={
                {
                  ['--mk-cell-span']: item.columnSpan,
                  ['--mk-cell-height']: item.height !== undefined ? `${item.height}px` : undefined,
                  ['--mk-cell-aspect-ratio']:
                    item.height === undefined ? item.aspectRatio : undefined,
                } as React.CSSProperties
              }
            >
              <div className="absolute inset-0 overflow-hidden rounded-md">
                <div className="absolute inset-0 block rounded-md bg-slate-800/30 dark:bg-slate-800/50">
                  {showPhotos ? (
                    <img
                      className="w-full h-full object-cover rounded-md transition-transform duration-[var(--mk-app-transition-duration)] ease-[var(--mk-app-transition-easing)]"
                      src={item.meta.src}
                      alt={item.id}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full rounded-md border border-slate-700/50 text-slate-100 flex items-center justify-center font-extrabold tracking-wide select-none bg-white/5">
                      {item.id}
                    </div>
                  )}
                </div>
              </div>
            </Masonry.Cell>
          ))}

          <div className="absolute right-2 bottom-2 text-xs rounded px-2 py-1 border border-white/10 bg-black/50">{`Items: ${items.length}`}</div>
        </Masonry.Grid>
      </div>
    </main>
  )
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  console.error('Missing #root element')
} else {
  const root = createRoot(rootEl)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
