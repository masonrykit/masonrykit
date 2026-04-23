import { useMemo, useState, StrictMode, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  aspectCell,
  heightCell,
  measuredCell,
  startViewTransition,
  useMasonry,
  type Breakpoint,
  type Cell,
  type LayoutCell,
  type Stamp,
} from '@masonrykit/react'

import './style.css'

interface PhotoMeta {
  title: string
  src: string
  color: string
  text?: string
}

type DemoCell = Cell<PhotoMeta>

const PRESETS = {
  Compact: { columnWidth: 160, gap: 8 },
  Cozy: { columnWidth: 200, gap: 12 },
  Spacious: { columnWidth: 280, gap: 16 },
  Gallery: { columnWidth: 240, gap: 4 },
} as const

type PresetName = keyof typeof PRESETS | 'Custom'

// Responsive sizing rules used when "Breakpoints" is on. The entry with the
// largest minWidth <= grid width wins; unset fields fall through.
const BREAKPOINTS: Breakpoint[] = [
  { minWidth: 0, columnWidth: 160, gap: 8 },
  { minWidth: 640, columnWidth: 180, gap: 10 },
  { minWidth: 1024, columnWidth: 220, gap: 12 },
  { minWidth: 1440, columnWidth: 280, gap: 16 },
]

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'

const COLORS = [
  'from-rose-500/80 to-rose-600/80',
  'from-orange-400/80 to-orange-600/80',
  'from-amber-400/80 to-amber-600/80',
  'from-emerald-400/80 to-emerald-600/80',
  'from-teal-400/80 to-teal-600/80',
  'from-sky-400/80 to-sky-600/80',
  'from-indigo-400/80 to-indigo-600/80',
  'from-fuchsia-400/80 to-fuchsia-600/80',
] as const

function generateCells(count: number, startIndex = 0, useMeasured = false): DemoCell[] {
  const out: DemoCell[] = []
  let seed = 1337 + startIndex * 97
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  for (let i = 0; i < count; i++) {
    const n = startIndex + i + 1
    const id = `item-${n}`
    const title = `No. ${String(n).padStart(3, '0')}`
    const src = `https://picsum.photos/seed/${id}/800/600`
    const color = COLORS[Math.floor(rnd() * COLORS.length)]!

    const kind = i % 4
    if (useMeasured && kind === 3) {
      const reps = 1 + Math.floor(rnd() * 4)
      const text = Array.from({ length: reps }, () => LOREM).join(' ')
      out.push(
        measuredCell(id, {
          estimatedHeight: 160 + reps * 80,
          meta: { title, src, color, text },
        }),
      )
    } else if (kind === 0) {
      const ratios = [4 / 3, 1, 16 / 9, 3 / 4, 2, 0.75, 1.25, 1.5]
      out.push(
        aspectCell(id, ratios[Math.floor(rnd() * ratios.length)]!, { meta: { title, src, color } }),
      )
    } else {
      out.push(heightCell(id, 120 + Math.floor(rnd() * 200), { meta: { title, src, color } }))
    }
  }
  return out
}

/* ---------- Primitives ---------------------------------------------------- */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-3">
      {children}
    </div>
  )
}

function Field({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-zinc-400">{label}</span>
        {value !== undefined && (
          <span className="font-mono text-[11px] text-zinc-500">{value}</span>
        )}
      </div>
      {children}
    </label>
  )
}

function Switch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  hint?: string
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer group">
      <span className="min-w-0">
        <span className="block text-sm text-zinc-200 group-hover:text-white transition-colors">
          {label}
        </span>
        {hint !== undefined && (
          <span className="block text-[11px] text-zinc-500 mt-0.5">{hint}</span>
        )}
      </span>
      <input
        type="checkbox"
        className="mk-switch"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked)
        }}
      />
    </label>
  )
}

function Button({
  children,
  onClick,
  variant = 'ghost',
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'primary' | 'ghost'
}) {
  const base =
    'mk-btn inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors'
  const styles =
    variant === 'primary'
      ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
      : 'bg-white/4 text-zinc-200 border border-white/10 hover:bg-white/8 hover:border-white/15'
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  )
}

/* ---------- Cell renderers ----------------------------------------------- */

function MeasuredCard({ cell }: { cell: LayoutCell<PhotoMeta> }) {
  return (
    <article className="rounded-lg bg-white/4 border border-white/8 p-4 backdrop-blur-[2px]">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[11px] text-zinc-400">{cell.meta.title}</div>
        <div className="text-[10px] uppercase tracking-wider text-emerald-400/80">measured</div>
      </div>
      <p className="text-[13px] text-zinc-300 leading-relaxed">{cell.meta.text}</p>
    </article>
  )
}

function PhotoCard({ cell, showPhotos }: { cell: LayoutCell<PhotoMeta>; showPhotos: boolean }) {
  return (
    <article className="relative w-full h-full rounded-lg overflow-hidden bg-zinc-900">
      {showPhotos ? (
        <img
          src={cell.meta.src}
          alt={cell.meta.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full bg-linear-to-br ${cell.meta.color}`} aria-hidden />
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/70 via-black/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[11px] text-white/90">{cell.meta.title}</div>
          <div className="font-mono text-[10px] text-white/60">
            {cell.width}×{cell.height}
          </div>
        </div>
      </div>
    </article>
  )
}

/* ---------- Status strip ------------------------------------------------- */

function StatusPill({
  label,
  value,
  live = false,
}: {
  label: string
  value: string
  live?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/4 border border-white/8">
      {live && (
        <span className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400/60 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="font-mono text-[11px] text-zinc-200">{value}</span>
    </div>
  )
}

/* ---------- App ---------------------------------------------------------- */

function App() {
  const [gap, setGap] = useState(12)
  const [columnWidth, setColumnWidth] = useState(200)
  const [horizontalOrder, setHorizontalOrder] = useState(false)
  const [useStamps, setUseStamps] = useState(false)
  const [preset, setPreset] = useState<PresetName>('Cozy')
  const [showPhotos, setShowPhotos] = useState(true)
  const [count, setCount] = useState(24)
  const [useMeasured, setUseMeasured] = useState(false)
  const [useBreakpoints, setUseBreakpoints] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [virtualize, setVirtualize] = useState(false)
  const [cells, setCells] = useState<DemoCell[]>(() => generateCells(24))

  // Wrap state changes in startViewTransition when `animate` is on.
  // flushSync forces React to commit the DOM update inside the callback —
  // without it, the browser captures identical before/after snapshots.
  const update = (fn: () => void) => {
    if (animate)
      startViewTransition(() => {
        flushSync(fn)
      })
    else fn()
  }

  const applyPreset = (name: PresetName) => {
    if (name !== 'Custom') {
      const p = PRESETS[name]
      setColumnWidth(p.columnWidth)
      setGap(p.gap)
    }
    setPreset(name)
  }

  const updateCount = (newCount: number) => {
    update(() => {
      setCount(newCount)
      setCells(generateCells(newCount, 0, useMeasured))
    })
  }

  const toggleMeasured = (checked: boolean) => {
    update(() => {
      setUseMeasured(checked)
      setCells(generateCells(count, 0, checked))
    })
  }

  const stamps = useMemo<Stamp[] | undefined>(
    () =>
      useStamps
        ? [
            { x: 0, y: 0, width: columnWidth * 2 + gap, height: 40 },
            { x: columnWidth + gap, y: 60, width: columnWidth, height: 80 },
          ]
        : undefined,
    [useStamps, columnWidth, gap],
  )

  const shuffle = () => {
    update(() => {
      setCells((prev) => {
        const arr = [...prev]
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
        }
        return arr
      })
    })
  }

  const addMore = () => {
    // Compute the delta up front so we don't fire setCells as a side effect
    // inside setCount's updater — updater functions must be pure (and StrictMode
    // runs them twice, which would double-append).
    const next = Math.min(count + 12, 200)
    const toAdd = next - count
    if (toAdd === 0) return
    update(() => {
      setCount(next)
      setCells((cs) => [...cs, ...generateCells(toAdd, cs.length, useMeasured)])
    })
  }

  const reset = () => {
    update(() => {
      setCells(generateCells(6, 0, useMeasured))
      setCount(6)
    })
  }

  const { stableCells, visibleCells, getGridProps, getCellProps, layout } = useMasonry<PhotoMeta>(
    cells,
    {
      ...(useBreakpoints ? { breakpoints: BREAKPOINTS } : { gap, columnWidth }),
      horizontalOrder,
      ...(stamps ? { stamps } : {}),
      animate,
      ...(virtualize ? { virtualize: { overscan: 400 } } : {}),
      // `initialGridWidth` seeds the first-render layout so SSR + client
      // hydration produce identical output.
      initialGridWidth: 1200,
    },
  )

  const renderCells = virtualize ? visibleCells : stableCells
  const activeFeatures = [
    useBreakpoints && 'breakpoints',
    animate && 'animate',
    virtualize && 'virtualize',
    useMeasured && 'measured',
    useStamps && 'stamps',
    horizontalOrder && 'h-order',
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-emerald-500/30">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_50%)]"
      />

      <div className="grid lg:grid-cols-[320px_1fr] min-h-screen">
        {/* Sidebar */}
        <aside
          className="border-b lg:border-b-0 lg:border-r border-white/6 bg-zinc-950/80 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto"
          style={{ viewTransitionName: 'mk-sidebar' }}
        >
          <div className="p-5 border-b border-white/6">
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-semibold tracking-tight">MasonryKit</h1>
              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                react
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">@masonrykit/react playground</p>
          </div>

          <div className="p-5 space-y-6">
            {/* Layout */}
            <section>
              <SectionLabel>Layout</SectionLabel>
              <Field label="Preset">
                <select
                  className="mk-select w-full"
                  value={preset}
                  onChange={(e) => {
                    applyPreset(e.target.value as PresetName)
                  }}
                  disabled={useBreakpoints}
                >
                  <option value="Custom">Custom</option>
                  {Object.keys(PRESETS).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={useBreakpoints ? 'Column width (overridden)' : 'Column width'}
                value={`${columnWidth}px`}
              >
                <input
                  type="range"
                  className="mk-range"
                  min={120}
                  max={400}
                  value={columnWidth}
                  onChange={(e) => {
                    setColumnWidth(Number(e.target.value))
                  }}
                  disabled={useBreakpoints}
                />
              </Field>
              <Field label={useBreakpoints ? 'Gap (overridden)' : 'Gap'} value={`${gap}px`}>
                <input
                  type="range"
                  className="mk-range"
                  min={0}
                  max={32}
                  value={gap}
                  onChange={(e) => {
                    setGap(Number(e.target.value))
                  }}
                  disabled={useBreakpoints}
                />
              </Field>
              <Field label="Items" value={`${count}`}>
                <input
                  type="range"
                  className="mk-range"
                  min={6}
                  max={200}
                  value={count}
                  onChange={(e) => {
                    updateCount(Number(e.target.value))
                  }}
                />
              </Field>
            </section>

            {/* Content */}
            <section>
              <SectionLabel>Content</SectionLabel>
              <div className="divide-y divide-white/4">
                <Switch label="Photos" checked={showPhotos} onChange={setShowPhotos} />
                <Switch
                  label="Stamps"
                  hint="Reserved rectangles cells flow around"
                  checked={useStamps}
                  onChange={setUseStamps}
                />
                <Switch
                  label="Horizontal order"
                  hint="Fill rows before columns"
                  checked={horizontalOrder}
                  onChange={setHorizontalOrder}
                />
                <Switch
                  label="Measured cells"
                  hint="Content drives height via ResizeObserver"
                  checked={useMeasured}
                  onChange={toggleMeasured}
                />
              </div>
            </section>

            {/* Features */}
            <section>
              <SectionLabel>Features</SectionLabel>
              <div className="divide-y divide-white/4">
                <Switch
                  label="Breakpoints"
                  hint="Responsive columnWidth & gap"
                  checked={useBreakpoints}
                  onChange={setUseBreakpoints}
                />
                <Switch
                  label="Animate"
                  hint="Animate state changes via View Transitions"
                  checked={animate}
                  onChange={setAnimate}
                />
                <Switch
                  label="Virtualize"
                  hint="Render only viewport cells"
                  checked={virtualize}
                  onChange={setVirtualize}
                />
              </div>
            </section>

            {/* Actions */}
            <section>
              <SectionLabel>Actions</SectionLabel>
              <div className="space-y-2">
                <Button variant="primary" onClick={shuffle}>
                  Shuffle
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={addMore}>Add 12</Button>
                  <Button onClick={reset}>Reset</Button>
                </div>
              </div>
            </section>
          </div>
        </aside>

        {/* Main area */}
        <main className="min-w-0">
          {/* Status strip */}
          <div
            className="sticky top-0 z-10 flex items-center gap-2 px-6 py-3 border-b border-white/6 bg-zinc-950/80 backdrop-blur-xl"
            style={{ viewTransitionName: 'mk-statusbar' }}
          >
            <StatusPill label="Cols" value={String(layout.columns.count)} />
            <StatusPill
              label={virtualize ? 'Rendered' : 'Cells'}
              value={
                virtualize
                  ? `${visibleCells.length}/${stableCells.length}`
                  : `${stableCells.length}`
              }
              live={virtualize}
            />
            <StatusPill label="Height" value={`${Math.round(layout.height)}px`} />
            <div className="ml-auto flex items-center gap-1.5">
              {activeFeatures.length > 0 && (
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 mr-1">
                  Active
                </span>
              )}
              {activeFeatures.map((f) => (
                <span
                  key={f}
                  className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="p-6">
            <div {...getGridProps()}>
              {renderCells.map((cell) => (
                <div
                  key={cell.id}
                  {...getCellProps(cell, {
                    style: animate
                      ? undefined
                      : {
                          transition:
                            'translate 320ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms cubic-bezier(0.22, 1, 0.36, 1), height 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                        },
                  })}
                >
                  {cell.meta.text !== undefined ? (
                    <MeasuredCard cell={cell} />
                  ) : (
                    <PhotoCard cell={cell} showPhotos={showPhotos} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

const rootEl = document.querySelector('#root')
if (!rootEl) {
  console.error('Missing #root element')
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
