import { useState, useMemo, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  useMasonry,
  createHeightCell,
  createAspectCell,
  createGridCssVarsStyle,
  createCellCssVarsStyle,
  type Cell,
} from '@masonrykit/react'

import './style.css'

// ============================================================================
// TYPES & DATA
// ============================================================================

interface PhotoMeta {
  title: string
  src: string
  color: string
}

type DemoCell = Cell<PhotoMeta>

// ============================================================================
// DATA GENERATION
// ============================================================================

function generateCells(count: number, startId = 0): DemoCell[] {
  const cells: DemoCell[] = []

  // Deterministic pseudo-random for stable demos
  let seed = 1337 + startId * 97
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ]

  for (let i = 0; i < count; i++) {
    const id = `item-${startId + i + 1}`
    const title = `Item ${startId + i + 1}`
    const src = `https://picsum.photos/seed/${id}/800/600`
    const color = colors[Math.floor(rnd() * colors.length)]!

    const meta: PhotoMeta = { title, src, color }

    // Create different types of cells
    if (i % 3 === 0) {
      // Aspect ratio cells
      const ratios = [4 / 3, 1, 16 / 9, 3 / 4, 2, 0.75, 1.25, 1.5]
      const aspectRatio = ratios[Math.floor(rnd() * ratios.length)]!
      cells.push(createAspectCell(id, aspectRatio, meta))
    } else {
      // Fixed height cells
      const height = 120 + Math.floor(rnd() * 200) // 120-320px
      cells.push(createHeightCell(id, height, meta))
    }
  }

  return cells
}

// ============================================================================
// LAYOUT PRESETS
// ============================================================================

const PRESETS = {
  Compact: { columnWidth: 160, gap: 8 },
  Cozy: { columnWidth: 200, gap: 12 },
  Spacious: { columnWidth: 280, gap: 16 },
  Gallery: { columnWidth: 240, gap: 4 },
} as const

type PresetName = keyof typeof PRESETS

// ============================================================================
// COMPONENTS
// ============================================================================

function CellCard({ cell, showPhotos }: { cell: DemoCell; showPhotos: boolean }) {
  return (
    <div className="absolute w-[var(--mk-cell-width)] h-[var(--mk-cell-height)] translate-x-[var(--mk-cell-x)] translate-y-[var(--mk-cell-y)] translate-z-0 transition-all duration-300 ease-out">
      <div className="w-full h-full rounded-lg overflow-hidden shadow-lg bg-white/10 backdrop-blur-sm border border-white/20">
        {showPhotos ? (
          <img
            src={cell.meta.src}
            alt={cell.meta.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={`w-full h-full ${cell.meta.color} flex items-center justify-center text-white font-bold text-lg`}
          >
            {cell.meta.title}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="text-white text-sm font-semibold">{cell.meta.title}</div>
          <div className="text-white/80 text-xs">
            {cell.type === 'height' ? `${cell.height}px` : `${cell.aspectRatio.toFixed(2)}:1`}
          </div>
        </div>
      </div>
    </div>
  )
}

function MasonryGrid({
  cells,
  gap,
  columnWidth,
  horizontalOrder,
  stamps,
  showPhotos,
}: {
  cells: DemoCell[]
  gap: number
  columnWidth: number
  horizontalOrder: boolean
  stamps: any[]
  showPhotos: boolean
}) {
  const { gridRef, stableCells } = useMasonry(cells, {
    gap,
    columnWidth,
    horizontalOrder,
    stamps,
    getGridStyle: createGridCssVarsStyle(),
    getCellStyle: createCellCssVarsStyle(),
  })

  return (
    <div className="border border-white/10 rounded-xl p-6 bg-white/5 backdrop-blur-sm">
      <div ref={gridRef} className="relative h-[var(--mk-grid-height)]">
        {stableCells.map((cell) => (
          <CellCard key={cell.id} cell={cell} showPhotos={showPhotos} />
        ))}
      </div>
    </div>
  )
}

function Controls({
  gap,
  setGap,
  columnWidth,
  setColumnWidth,
  count,
  setCount,
  preset,
  setPreset,
  showPhotos,
  setShowPhotos,
  useStamps,
  setUseStamps,
  horizontalOrder,
  setHorizontalOrder,
  onShuffle,
  onAddMore,
  onReset,
}: {
  gap: number
  setGap: (gap: number) => void
  columnWidth: number
  setColumnWidth: (width: number) => void
  count: number
  setCount: (count: number) => void
  preset: PresetName | 'Custom'
  setPreset: (preset: PresetName | 'Custom') => void
  showPhotos: boolean
  setShowPhotos: (show: boolean) => void
  useStamps: boolean
  setUseStamps: (use: boolean) => void
  horizontalOrder: boolean
  setHorizontalOrder: (order: boolean) => void
  onShuffle: () => void
  onAddMore: () => void
  onReset: () => void
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Preset */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">Preset</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as PresetName | 'Custom')}
            className="w-full bg-white/10 border border-white/20 rounded text-white text-sm p-2"
          >
            <option value="Custom">Custom</option>
            {Object.keys(PRESETS).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Column Width */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">
            Column Width: {columnWidth}px
          </label>
          <input
            type="range"
            min={120}
            max={400}
            value={columnWidth}
            onChange={(e) => setColumnWidth(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Gap */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">Gap: {gap}px</label>
          <input
            type="range"
            min={0}
            max={32}
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Item Count */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">Items: {count}</label>
          <input
            type="range"
            min={6}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <label className="flex items-center text-sm text-white/80">
            <input
              type="checkbox"
              checked={showPhotos}
              onChange={(e) => setShowPhotos(e.target.checked)}
              className="mr-2"
            />
            Show Photos
          </label>
          <label className="flex items-center text-sm text-white/80">
            <input
              type="checkbox"
              checked={useStamps}
              onChange={(e) => setUseStamps(e.target.checked)}
              className="mr-2"
            />
            Use Stamps
          </label>
          <label className="flex items-center text-sm text-white/80">
            <input
              type="checkbox"
              checked={horizontalOrder}
              onChange={(e) => setHorizontalOrder(e.target.checked)}
              className="mr-2"
            />
            Horizontal Order
          </label>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onShuffle}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            Shuffle
          </button>
          <button
            onClick={onAddMore}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            Add 12
          </button>
          <button
            onClick={onReset}
            className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  // Layout settings
  const [gap, setGap] = useState(12)
  const [columnWidth, setColumnWidth] = useState(200)
  const [horizontalOrder, setHorizontalOrder] = useState(false)
  const [useStamps, setUseStamps] = useState(false)
  const [preset, setPreset] = useState<PresetName | 'Custom'>('Cozy')

  // Display settings
  const [showPhotos, setShowPhotos] = useState(true)
  const [count, setCount] = useState(24)

  // Cells
  const [cells, setCells] = useState(() => generateCells(24))

  // Apply preset when selected
  const applyPreset = (presetName: PresetName | 'Custom') => {
    if (presetName !== 'Custom') {
      const presetConfig = PRESETS[presetName]
      setColumnWidth(presetConfig.columnWidth)
      setGap(presetConfig.gap)
    }
    setPreset(presetName)
  }

  // Update cells when count changes
  const updateCount = (newCount: number) => {
    setCount(newCount)
    setCells(generateCells(newCount))
  }

  // Stamps configuration
  const stamps = useMemo(() => {
    return useStamps
      ? [
          { x: 0, y: 0, width: columnWidth * 2 + gap, height: 40 },
          { x: columnWidth + gap, y: 60, width: columnWidth, height: 80 },
        ]
      : []
  }, [useStamps, columnWidth, gap])

  // Actions
  const shuffle = () => {
    setCells((prev) => {
      const shuffled = [...prev]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
      }
      return shuffled
    })
  }

  const addMore = () => {
    setCount((prev) => {
      const newCount = Math.min(prev + 12, 100)
      setCells((prevCells) => [...prevCells, ...generateCells(newCount - prev, prevCells.length)])
      return newCount
    })
  }

  const reset = () => {
    const newCells = generateCells(6)
    setCells(newCells)
    setCount(6)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            MasonryKit React
          </h1>
          <p className="text-white/60 text-lg">Beautiful, performant masonry layouts made simple</p>
        </header>

        {/* Controls */}
        <Controls
          gap={gap}
          setGap={setGap}
          columnWidth={columnWidth}
          setColumnWidth={setColumnWidth}
          count={count}
          setCount={updateCount}
          preset={preset}
          setPreset={applyPreset}
          showPhotos={showPhotos}
          setShowPhotos={setShowPhotos}
          useStamps={useStamps}
          setUseStamps={setUseStamps}
          horizontalOrder={horizontalOrder}
          setHorizontalOrder={setHorizontalOrder}
          onShuffle={shuffle}
          onAddMore={addMore}
          onReset={reset}
        />

        {/* Masonry Layout */}
        <MasonryGrid
          cells={cells}
          gap={gap}
          columnWidth={columnWidth}
          horizontalOrder={horizontalOrder}
          stamps={stamps}
          showPhotos={showPhotos}
        />

        {/* Stats */}
        <div className="mt-6 text-center text-white/60 text-sm">
          {cells.length} cells • {gap}px gap • {columnWidth}px columns
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

const rootEl = document.getElementById('root')
if (!rootEl) {
  console.error('Missing #root element')
} else {
  const root = createRoot(rootEl)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
