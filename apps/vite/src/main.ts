/**
 * apps/vite/src/main.ts
 *
 * Vanilla TypeScript playground for @masonrykit/browser. Mirrors the React
 * demo's feature set — same controls, same visual language — so the two
 * demos compare like-for-like and users can see exactly what the React
 * bindings are doing under the hood.
 *
 * Every feature here composes primitives from @masonrykit/core and
 * @masonrykit/browser by hand; the React hook wraps the same pieces.
 */

import {
  aspectCell,
  computeLayout,
  createMeasuredHeightTracker,
  filterVisibleCells,
  heightCell,
  measuredCell,
  observeElementWidth,
  resolveBreakpoint,
  startViewTransition,
  type Breakpoint,
  type Cell,
  type HeightCell,
  type Stamp,
} from '@masonrykit/browser'

import './style.css'

// Feature detect View Transitions once at module load. Used below to gate
// `data-animate` so browsers without VT fall back to CSS transitions instead
// of "no motion at all" (suppressing CSS while VT silently no-ops).
const VT_SUPPORTED = typeof document.startViewTransition === 'function'

/* -- Types ---------------------------------------------------------------- */

interface PhotoMeta {
  title: string
  src: string
  colorA: string
  colorB: string
  text?: string
}

type DemoCell = Cell<PhotoMeta>

const MAX_ITEMS = 200

const PRESETS = {
  Compact: { columnWidth: 160, gap: 8 },
  Cozy: { columnWidth: 200, gap: 12 },
  Spacious: { columnWidth: 280, gap: 16 },
  Gallery: { columnWidth: 240, gap: 4 },
} as const

type PresetName = keyof typeof PRESETS | 'Custom'

const BREAKPOINTS: Breakpoint[] = [
  { minWidth: 0, columnWidth: 160, gap: 8 },
  { minWidth: 640, columnWidth: 180, gap: 10 },
  { minWidth: 1024, columnWidth: 220, gap: 12 },
  { minWidth: 1440, columnWidth: 280, gap: 16 },
]

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'

// Two-stop HSL gradient palette — matches the React demo's color-block mode.
const COLOR_SEEDS: Array<[number, number]> = [
  [8, 48], // rose
  [28, 68], // orange
  [45, 85], // amber
  [155, 195], // emerald
  [175, 215], // teal
  [205, 245], // sky
  [235, 275], // indigo
  [300, 340], // fuchsia
]

/* -- State ---------------------------------------------------------------- */

const state = {
  // Layout
  columnWidth: 200,
  gap: 12,
  itemCount: 24,
  preset: 'Cozy' as PresetName,
  // Content
  showPhotos: true,
  useStamps: false,
  horizontalOrder: false,
  useMeasured: false,
  // Opt-in features
  useBreakpoints: false,
  animate: false,
  virtualize: false,
}

let cells: DemoCell[] = []
const measuredHeights = new Map<string, number>()

const tracker = createMeasuredHeightTracker((id, h) => {
  if (measuredHeights.get(id) === h) return
  measuredHeights.set(id, h)
  requestUpdate()
})

/* -- Data generation ------------------------------------------------------ */

function generateCells(count: number, startIndex = 0, useMeasured = false): DemoCell[] {
  const out: DemoCell[] = []
  let seed = 1337 + startIndex * 97
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  for (let i = 0; i < count; i++) {
    const n = startIndex + i + 1
    const id = `item-${n}`
    const title = `No. ${String(n).padStart(3, '0')}`
    const src = `https://picsum.photos/seed/${id}/800/600`
    const seeds = COLOR_SEEDS[Math.floor(rnd() * COLOR_SEEDS.length)]!
    const meta: PhotoMeta = { title, src, colorA: String(seeds[0]), colorB: String(seeds[1]) }

    const kind = i % 4
    if (useMeasured && kind === 3) {
      const reps = 1 + Math.floor(rnd() * 4)
      const text = Array.from({ length: reps }, () => LOREM).join(' ')
      out.push(
        measuredCell(id, {
          estimatedHeight: 160 + reps * 80,
          meta: { ...meta, text },
        }),
      )
    } else if (kind === 0) {
      const ratios = [4 / 3, 1, 16 / 9, 3 / 4, 2, 0.75, 1.25, 1.5]
      out.push(aspectCell(id, ratios[Math.floor(rnd() * ratios.length)]!, { meta }))
    } else {
      out.push(heightCell(id, 120 + Math.floor(rnd() * 200), { meta }))
    }
  }
  return out
}

/* -- UI primitives -------------------------------------------------------- */

function sectionLabel(text: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-3'
  el.textContent = text
  return el
}

function rangeField(
  labelText: string,
  min: number,
  max: number,
  value: number,
  unit: string,
  onChange: (v: number) => void,
): {
  label: HTMLLabelElement
  input: HTMLInputElement
  val: HTMLSpanElement
  name: HTMLSpanElement
} {
  const label = document.createElement('label')
  label.className = 'block mb-3'

  const header = document.createElement('div')
  header.className = 'flex items-baseline justify-between mb-1.5'

  const name = document.createElement('span')
  name.className = 'text-xs text-zinc-400'
  name.textContent = labelText

  const val = document.createElement('span')
  val.className = 'font-mono text-[11px] text-zinc-500'
  val.textContent = `${value}${unit}`

  header.append(name, val)

  const input = document.createElement('input')
  input.type = 'range'
  input.className = 'mk-range'
  input.min = String(min)
  input.max = String(max)
  input.value = String(value)
  input.addEventListener('input', () => {
    const n = parseInt(input.value, 10)
    if (!Number.isNaN(n)) {
      val.textContent = `${n}${unit}`
      onChange(n)
    }
  })

  label.append(header, input)
  return { label, input, val, name }
}

function toggle(
  labelText: string,
  checked: boolean,
  onChange: (v: boolean) => void,
  hint?: string,
): { label: HTMLLabelElement; input: HTMLInputElement } {
  const label = document.createElement('label')
  label.className = 'flex items-center justify-between gap-3 py-2 cursor-pointer group'

  const left = document.createElement('span')
  left.className = 'min-w-0'

  const nameEl = document.createElement('span')
  nameEl.className = 'block text-sm text-zinc-200 group-hover:text-white transition-colors'
  nameEl.textContent = labelText
  left.append(nameEl)

  if (hint !== undefined) {
    const hintEl = document.createElement('span')
    hintEl.className = 'block text-[11px] text-zinc-500 mt-0.5'
    hintEl.textContent = hint
    left.append(hintEl)
  }

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.className = 'mk-switch'
  input.checked = checked
  input.addEventListener('change', () => {
    onChange(input.checked)
  })

  label.append(left, input)
  return { label, input }
}

function button(
  text: string,
  onClick: () => void,
  variant: 'primary' | 'ghost' = 'ghost',
): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = text
  // Same button recipe as the React demo — inline Tailwind instead of a
  // component class in style.css.
  const base =
    'w-full inline-flex items-center justify-center px-3 py-2 rounded-md text-xs font-medium border cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500/60 focus-visible:outline-offset-2'
  const variantClasses =
    variant === 'primary'
      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 hover:bg-white hover:border-white'
      : 'bg-white/4 text-zinc-300 border-white/10 hover:bg-white/8 hover:border-white/15'
  btn.className = `${base} ${variantClasses}`
  btn.addEventListener('click', onClick)
  return btn
}

function statusPill(label: string, value: string, live = false): HTMLElement {
  const el = document.createElement('div')
  el.className =
    'inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/4 border border-white/8'
  if (live) {
    const ring = document.createElement('span')
    ring.className = 'relative flex items-center justify-center'
    ring.innerHTML = `
      <span class="absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400/60 animate-ping"></span>
      <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
    `
    el.append(ring)
  }
  const labelEl = document.createElement('span')
  labelEl.className = 'text-[10px] uppercase tracking-widest text-zinc-500'
  labelEl.textContent = label
  const valueEl = document.createElement('span')
  valueEl.className = 'font-mono text-[11px] text-zinc-200'
  valueEl.textContent = value
  el.append(labelEl, valueEl)
  return el
}

function featureBadge(text: string): HTMLElement {
  const el = document.createElement('span')
  el.className =
    'font-mono text-[10px] uppercase tracking-widest text-emerald-400/90 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20'
  el.textContent = text
  return el
}

/* -- DOM setup ------------------------------------------------------------ */

const root = document.querySelector('#root')
if (!root) throw new Error('Missing #root element')

const prev = root.querySelector('.app-root')
if (prev) prev.remove()

const main = document.createElement('div')
main.className =
  'app-root relative min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-emerald-500/30'

const bg = document.createElement('div')
bg.setAttribute('aria-hidden', 'true')
bg.className =
  'pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_50%)]'
main.append(bg)

const shell = document.createElement('div')
shell.className = 'grid lg:grid-cols-[320px_1fr] min-h-screen'

/* Sidebar ---------------------------------------------------------------- */

const sidebar = document.createElement('aside')
sidebar.className =
  'border-b lg:border-b-0 lg:border-r border-white/6 bg-zinc-950/80 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto [view-transition-name:mk-sidebar]'

const brand = document.createElement('div')
brand.className = 'p-5 border-b border-white/6'
brand.innerHTML = `
  <div class="flex items-baseline gap-2">
    <h1 class="text-lg font-semibold tracking-tight">MasonryKit</h1>
    <span class="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">browser</span>
  </div>
  <p class="text-xs text-zinc-500 mt-1">@masonrykit/browser playground</p>
`
sidebar.append(brand)

const sidebarBody = document.createElement('div')
sidebarBody.className = 'p-5 space-y-6'
sidebar.append(sidebarBody)

/* Layout section --------------------------------------------------------- */

const layoutSection = document.createElement('section')
layoutSection.append(sectionLabel('Layout'))

// Preset
const presetField = document.createElement('label')
presetField.className = 'block mb-3'
const presetHeader = document.createElement('div')
presetHeader.className = 'flex items-baseline justify-between mb-1.5'
const presetLabelEl = document.createElement('span')
presetLabelEl.className = 'text-xs text-zinc-400'
presetLabelEl.textContent = 'Preset'
presetHeader.append(presetLabelEl)
const presetSelect = document.createElement('select')
presetSelect.className = 'mk-select w-full'
;(['Custom', ...(Object.keys(PRESETS) as PresetName[])] as const).forEach((name) => {
  const opt = document.createElement('option')
  opt.value = name
  opt.textContent = name
  presetSelect.append(opt)
})
presetSelect.value = state.preset
presetSelect.addEventListener('change', () => {
  applyPreset(presetSelect.value as PresetName)
})
presetField.append(presetHeader, presetSelect)
layoutSection.append(presetField)

const colField = rangeField('Column width', 120, 400, state.columnWidth, 'px', (v) => {
  state.columnWidth = v
  syncPreset()
  requestUpdate()
})
const gapField = rangeField('Gap', 0, 32, state.gap, 'px', (v) => {
  state.gap = v
  syncPreset()
  requestUpdate()
})
const itemsField = rangeField('Items', 6, MAX_ITEMS, state.itemCount, '', (v) => {
  update(() => {
    state.itemCount = v
    cells = generateCells(v, 0, state.useMeasured)
  })
})

layoutSection.append(colField.label, gapField.label, itemsField.label)

/* Content section -------------------------------------------------------- */

const contentSection = document.createElement('section')
contentSection.append(sectionLabel('Content'))
const contentBody = document.createElement('div')
contentBody.className = 'divide-y divide-white/4'

const photosToggle = toggle('Photos', state.showPhotos, (v) => {
  state.showPhotos = v
  requestUpdate()
})
const stampsToggle = toggle(
  'Stamps',
  state.useStamps,
  (v) => {
    state.useStamps = v
    requestUpdate()
  },
  'Reserved rectangles cells flow around',
)
const horizontalToggle = toggle(
  'Horizontal order',
  state.horizontalOrder,
  (v) => {
    state.horizontalOrder = v
    requestUpdate()
  },
  'Fill rows before columns',
)
const measuredToggle = toggle(
  'Measured cells',
  state.useMeasured,
  (v) => {
    update(() => {
      state.useMeasured = v
      cells = generateCells(state.itemCount, 0, v)
    })
  },
  'Content drives height via ResizeObserver',
)

contentBody.append(
  photosToggle.label,
  stampsToggle.label,
  horizontalToggle.label,
  measuredToggle.label,
)
contentSection.append(contentBody)

/* Features section ------------------------------------------------------- */

const featuresSection = document.createElement('section')
featuresSection.append(sectionLabel('Features'))
const featuresBody = document.createElement('div')
featuresBody.className = 'divide-y divide-white/4'

const breakpointsToggle = toggle(
  'Breakpoints',
  state.useBreakpoints,
  (v) => {
    state.useBreakpoints = v
    colField.input.disabled = v
    gapField.input.disabled = v
    presetSelect.disabled = v
    // Mirror the React demo's "(overridden)" label hint so users know the
    // column-width / gap sliders are inert while breakpoints is on.
    colField.name.textContent = v ? 'Column width (overridden)' : 'Column width'
    gapField.name.textContent = v ? 'Gap (overridden)' : 'Gap'
    requestUpdate()
  },
  'Responsive columnWidth & gap',
)
const animateToggle = toggle(
  'Animate',
  state.animate,
  (v) => {
    state.animate = v
    requestUpdate()
  },
  'Animate state changes via View Transitions',
)
const virtualizeToggle = toggle(
  'Virtualize',
  state.virtualize,
  (v) => {
    state.virtualize = v
    requestUpdate()
  },
  'Render only viewport cells',
)

featuresBody.append(breakpointsToggle.label, animateToggle.label, virtualizeToggle.label)
featuresSection.append(featuresBody)

/* Actions section -------------------------------------------------------- */

const actionsSection = document.createElement('section')
actionsSection.append(sectionLabel('Actions'))
const actionsBody = document.createElement('div')
actionsBody.className = 'space-y-2'

const shuffleBtn = button(
  'Shuffle',
  () => {
    update(() => {
      const arr = cells.slice()
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
      }
      cells = arr
    })
  },
  'primary',
)

const pairRow = document.createElement('div')
pairRow.className = 'grid grid-cols-2 gap-2'
const addBtn = button('Add 12', () => {
  update(() => {
    const add = Math.min(12, MAX_ITEMS - state.itemCount)
    if (add <= 0) return
    cells = cells.concat(generateCells(add, cells.length, state.useMeasured))
    state.itemCount += add
    itemsField.input.value = String(state.itemCount)
    itemsField.val.textContent = `${state.itemCount}`
  })
})
const resetBtn = button('Reset', () => {
  update(() => {
    state.itemCount = 6
    cells = generateCells(6, 0, state.useMeasured)
    itemsField.input.value = '6'
    itemsField.val.textContent = '6'
  })
})
pairRow.append(addBtn, resetBtn)

actionsBody.append(shuffleBtn, pairRow)
actionsSection.append(actionsBody)

sidebarBody.append(layoutSection, contentSection, featuresSection, actionsSection)

/* Main area -------------------------------------------------------------- */

const mainArea = document.createElement('main')
mainArea.className = 'min-w-0'

const statusStrip = document.createElement('div')
statusStrip.className =
  'sticky top-0 z-10 flex items-center gap-2 px-6 py-3 border-b border-white/6 bg-zinc-950/80 backdrop-blur-xl [view-transition-name:mk-statusbar]'

const colsPill = statusPill('Cols', '0')
const cellsPill = statusPill('Cells', '0')
const heightPill = statusPill('Height', '0px')
statusStrip.append(colsPill, cellsPill, heightPill)

const activeWrap = document.createElement('div')
activeWrap.className = 'ml-auto flex items-center gap-1.5'
statusStrip.append(activeWrap)

const gridWrap = document.createElement('div')
gridWrap.className = 'p-6'
const grid = document.createElement('div')
// `data-animate` (set in the render loop) flips every descendant cell's
// CSS transition off via `group-data-[animate=true]:transition-none`, so
// View Transitions own the motion when animating. `h-(--mk-grid-h)` pulls
// the height from the CSS var the render loop sets. `w-full` gives
// ResizeObserver something to measure; `min-h-80` avoids a zero-height
// grid on first paint.
grid.className = 'relative group w-full min-h-80 h-(--mk-grid-h)'
gridWrap.append(grid)

mainArea.append(statusStrip, gridWrap)
shell.append(sidebar, mainArea)
main.append(shell)
root.prepend(main)

/* -- Cell rendering ------------------------------------------------------- */

/**
 * Per-cell DOM handles. `mode` tracks the current card variant so we only
 * rebuild the inner content when it actually needs to change. `sizeText`
 * and `metaText` are stored once so we can update them on rerender without
 * a fragile className query. `observed` guards against calling
 * `tracker.observe` more than once per id.
 */
type CellNode = {
  el: HTMLDivElement
  mode: 'photo' | 'color' | 'measured' | null
  sizeText: HTMLSpanElement | null
  metaText: HTMLDivElement | null
  observed: boolean
}
const nodes = new Map<string, CellNode>()

function buildCell(): CellNode {
  const el = document.createElement('div')
  // className is stable across renders. The per-frame churn lives in the
  // `--mk-cell-*` custom properties set by the render loop, which the
  // `translate-x-(--mk-cell-x)` / `w-(--mk-cell-w)` / etc. utilities
  // consume. Unset vars resolve to the property's initial value — `auto`
  // for height, `none` for view-transition-name.
  //
  // Deliberately no `will-change`: it would promote every cell to its own
  // compositor layer permanently, which is wasteful when the grid is idle.
  // Modern browsers auto-promote elements that are actually transitioning,
  // which is the behaviour we want here.
  el.className =
    'absolute top-0 left-0 box-border w-(--mk-cell-w) h-(--mk-cell-h) translate-x-(--mk-cell-x) translate-y-(--mk-cell-y) [view-transition-name:var(--mk-cell-vt-name)] transition-all duration-300 ease-smooth group-data-[animate=true]:transition-none'
  return { el, mode: null, sizeText: null, metaText: null, observed: false }
}

function renderPhotoCard(
  node: CellNode,
  meta: PhotoMeta,
  width: number,
  height: number,
  showPhotos: boolean,
): void {
  const mode = showPhotos ? 'photo' : 'color'
  if (node.mode !== mode) {
    node.el.innerHTML = ''
    const card = document.createElement('article')
    card.className = 'relative w-full h-full rounded-lg overflow-hidden bg-zinc-900'

    if (showPhotos) {
      const img = document.createElement('img')
      img.src = meta.src
      img.alt = meta.title
      img.loading = 'lazy'
      img.className = 'w-full h-full object-cover'
      card.append(img)
    } else {
      const fill = document.createElement('div')
      fill.className = 'w-full h-full'
      fill.style.background = `linear-gradient(135deg, hsl(${meta.colorA} 70% 55% / 0.9), hsl(${meta.colorB} 70% 45% / 0.9))`
      card.append(fill)
    }

    const overlay = document.createElement('div')
    overlay.className =
      'absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/70 via-black/30 to-transparent flex items-center justify-between pointer-events-none'
    const titleEl = document.createElement('span')
    titleEl.className = 'font-mono text-[11px] text-white/90'
    titleEl.textContent = meta.title
    const sizeEl = document.createElement('span')
    sizeEl.className = 'font-mono text-[10px] text-white/60'
    sizeEl.textContent = `${width}×${height}`
    overlay.append(titleEl, sizeEl)
    card.append(overlay)

    node.el.append(card)
    node.mode = mode
    node.sizeText = sizeEl
    node.metaText = null
  } else if (node.sizeText) {
    // Fast path: only the dimensions changed.
    node.sizeText.textContent = `${width}×${height}`
  }
}

function renderMeasuredCard(node: CellNode, meta: PhotoMeta, width: number): void {
  if (node.mode !== 'measured') {
    node.el.innerHTML = ''
    const card = document.createElement('article')
    card.className = 'rounded-lg bg-white/4 border border-white/8 p-4 backdrop-blur-[2px]'

    const head = document.createElement('div')
    head.className = 'flex items-center justify-between mb-2'
    const titleEl = document.createElement('div')
    titleEl.className = 'font-mono text-[11px] text-zinc-400'
    titleEl.textContent = meta.title
    const badge = document.createElement('div')
    badge.className = 'text-[10px] uppercase tracking-widest text-emerald-400/80'
    badge.textContent = 'measured'
    head.append(titleEl, badge)

    const body = document.createElement('p')
    body.className = 'text-[13px] text-zinc-300 leading-relaxed'
    body.textContent = meta.text ?? ''

    const meta2 = document.createElement('div')
    meta2.className = 'font-mono text-[10px] text-zinc-500 mt-3'
    meta2.textContent = `${width}px wide · content-driven height`

    card.append(head, body, meta2)
    node.el.append(card)
    node.mode = 'measured'
    node.metaText = meta2
    node.sizeText = null
  } else if (node.metaText) {
    node.metaText.textContent = `${width}px wide · content-driven height`
  }
}

/* -- Render --------------------------------------------------------------- */

function render(width: number): void {
  // Resolve effective columnWidth + gap via breakpoints (or use state).
  let effectiveColumnWidth = state.columnWidth
  let effectiveGap = state.gap
  if (state.useBreakpoints) {
    const match = resolveBreakpoint(BREAKPOINTS, width)
    if (match?.columnWidth !== undefined) effectiveColumnWidth = match.columnWidth
    if (match?.gap !== undefined) effectiveGap = match.gap
  }

  // Resolve measured cells — swap to HeightCell once we have a measurement,
  // otherwise pass through (computeLayout uses estimatedHeight).
  const measuredIds = new Set<string>()
  const resolvedCells: DemoCell[] = cells.map((c) => {
    if (c.type !== 'measured') return c
    measuredIds.add(c.id)
    const h = measuredHeights.get(c.id)
    if (h === undefined) return c
    const base: HeightCell<PhotoMeta> = { id: c.id, type: 'height', height: h, meta: c.meta }
    if (c.columnSpan !== undefined) base.columnSpan = c.columnSpan
    return base
  })

  // Stamps demo: first two columns reserved at top, one column below.
  const stamps: Stamp[] | undefined = state.useStamps
    ? [
        { x: 0, y: 0, width: effectiveColumnWidth * 2 + effectiveGap, height: 40 },
        { x: effectiveColumnWidth + effectiveGap, y: 60, width: effectiveColumnWidth, height: 80 },
      ]
    : undefined

  const layout = computeLayout<PhotoMeta>(resolvedCells, {
    gridWidth: Math.max(120, Math.floor(width)),
    columnWidth: Math.max(80, effectiveColumnWidth),
    gap: Math.max(0, effectiveGap),
    horizontalOrder: state.horizontalOrder,
    ...(stamps ? { stamps } : {}),
  })

  // Grid height flows through `--mk-grid-h`; the `h-(--mk-grid-h)` class
  // reads it.
  grid.style.setProperty('--mk-grid-h', `${layout.height}px`)
  // `data-animate` flips cells' CSS transition off so View Transitions
  // own the motion without fighting a doubled `transform` transition. Gated
  // on VT support — without it, CSS transitions are the fallback.
  if (state.animate && VT_SUPPORTED) grid.dataset.animate = 'true'
  else delete grid.dataset.animate

  // Which cells to actually render.
  let visible = layout.cells
  if (state.virtualize) {
    const gridRect = grid.getBoundingClientRect()
    const base = filterVisibleCells(
      layout.cells,
      gridRect.top,
      { top: 0, bottom: window.innerHeight },
      400,
    )
    // Always keep unmeasured cells in the DOM so their ResizeObserver can
    // fire before the user scrolls to them — otherwise their real height
    // lands mid-scroll and causes a visible layout shift.
    const inBase = new Set(base.map((c) => c.id))
    visible = layout.cells.filter((c) => {
      if (inBase.has(c.id)) return true
      return measuredIds.has(c.id) && !measuredHeights.has(c.id)
    })
  }

  // Remove nodes for cells no longer rendered, tearing down RO observers.
  const visibleIds = new Set(visible.map((c) => c.id))
  for (const [id, node] of nodes) {
    if (!visibleIds.has(id)) {
      if (node.observed) tracker.unobserve(id)
      node.el.remove()
      nodes.delete(id)
    }
  }

  // Position + paint each visible cell.
  for (const cell of visible) {
    let node = nodes.get(cell.id)
    if (!node) {
      node = buildCell()
      grid.append(node.el)
      nodes.set(cell.id, node)
    }

    const isMeasured = measuredIds.has(cell.id)
    // Layout values flow through `--mk-cell-*` vars. Unset vars resolve to
    // the property's initial value: `auto` height lets content drive
    // measured cells; `none` disables view-transition-name when not
    // animating.
    node.el.style.setProperty('--mk-cell-x', `${cell.x}px`)
    node.el.style.setProperty('--mk-cell-y', `${cell.y}px`)
    node.el.style.setProperty('--mk-cell-w', `${cell.width}px`)
    if (isMeasured) node.el.style.removeProperty('--mk-cell-h')
    else node.el.style.setProperty('--mk-cell-h', `${cell.height}px`)
    if (state.animate) node.el.style.setProperty('--mk-cell-vt-name', `mk-${cell.id}`)
    else node.el.style.removeProperty('--mk-cell-vt-name')

    if (isMeasured) {
      renderMeasuredCard(node, cell.meta, cell.width)
      // Observe once per node lifetime. Calling observe() on every render
      // would disconnect + recreate the ResizeObserver, thrashing layout.
      if (!node.observed) {
        tracker.observe(cell.id, node.el)
        node.observed = true
      }
    } else {
      renderPhotoCard(node, cell.meta, cell.width, cell.height, state.showPhotos)
    }
  }

  // Status pills.
  colsPill.lastElementChild!.textContent = String(layout.columns.count)
  cellsPill.firstElementChild!.textContent = state.virtualize ? 'Rendered' : 'Cells'
  cellsPill.lastElementChild!.textContent = state.virtualize
    ? `${visible.length}/${layout.cells.length}`
    : String(layout.cells.length)
  heightPill.lastElementChild!.textContent = `${Math.round(layout.height)}px`

  // Active-feature badges (right side of status strip).
  activeWrap.innerHTML = ''
  const active = [
    state.useBreakpoints && 'breakpoints',
    state.animate && 'animate',
    state.virtualize && 'virtualize',
    state.useMeasured && 'measured',
    state.useStamps && 'stamps',
    state.horizontalOrder && 'h-order',
  ].filter(Boolean) as string[]
  if (active.length > 0) {
    const prefix = document.createElement('span')
    prefix.className = 'text-[10px] uppercase tracking-widest text-zinc-500 mr-1'
    prefix.textContent = 'Active'
    activeWrap.append(prefix)
    for (const name of active) activeWrap.append(featureBadge(name))
  }
}

/* -- Update scheduling ---------------------------------------------------- */

let rafId: number | null = null
function requestUpdate(): void {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    render(Math.max(0, grid.clientWidth))
  })
}

// `update` wraps mutations in startViewTransition when `animate` is on so
// the browser animates the snapshot delta. No-op elsewhere.
function update(fn: () => void): void {
  if (state.animate) {
    // Cancel any frame queued by a previous event (scroll, resize, etc.) —
    // otherwise it'd fire after the View Transition captures the "after"
    // snapshot and trigger a redundant (and potentially flickering) render.
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    startViewTransition(() => {
      fn()
      // Render synchronously inside the callback so VT snapshots the new
      // layout. `requestAnimationFrame` wouldn't work here: VT waits for the
      // callback to resolve, not for the next animation frame.
      render(Math.max(0, grid.clientWidth))
    })
  } else {
    fn()
    requestUpdate()
  }
}

function applyPreset(name: PresetName): void {
  if (name !== 'Custom') {
    const p = PRESETS[name]
    state.columnWidth = p.columnWidth
    state.gap = p.gap
    colField.input.value = String(p.columnWidth)
    colField.val.textContent = `${p.columnWidth}px`
    gapField.input.value = String(p.gap)
    gapField.val.textContent = `${p.gap}px`
  }
  state.preset = name
  presetSelect.value = name
  requestUpdate()
}

function syncPreset(): void {
  let match: PresetName = 'Custom'
  for (const key of Object.keys(PRESETS) as Array<keyof typeof PRESETS>) {
    if (PRESETS[key].columnWidth === state.columnWidth && PRESETS[key].gap === state.gap) {
      match = key
      break
    }
  }
  state.preset = match
  if (presetSelect.value !== match) presetSelect.value = match
}

/* -- Wire it up ----------------------------------------------------------- */

cells = generateCells(state.itemCount, 0, state.useMeasured)

const disposeWidthObserver = observeElementWidth(grid, () => {
  requestUpdate()
})

window.addEventListener(
  'scroll',
  () => {
    if (state.virtualize) requestUpdate()
  },
  { passive: true },
)

requestUpdate()

if (import.meta.hot) {
  import.meta.hot.dispose?.(() => {
    disposeWidthObserver()
    tracker.disconnect()
    root.querySelector('.app-root')?.remove()
  })
}
