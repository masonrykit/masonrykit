/**
 * apps/vite/src/main.ts
 *
 * Vanilla TypeScript playground for @masonrykit/browser.
 * Renders a simple masonry layout and lets you tweak column width and gap live.
 * Now builds the UI (header/controls/toggle) from JS so all app logic is in main.
 */

import { computeMasonryLayout, observeElementWidth } from '@masonrykit/browser'

import './style.css'

// Create basic UI structure: header + controls + app container
const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

// Remove previous app root if any (idempotent mount)
const prevAppRoot = root.querySelector('.mk-app-root')
if (prevAppRoot) prevAppRoot.remove()
const main = document.createElement('main')
main.classList.add('mk-app-root')
const header = document.createElement('header')
const title = document.createElement('div')
const subtitle = document.createElement('div')
const section = document.createElement('section')
const page = document.createElement('div')
const controls = document.createElement('div')
const labelCol = document.createElement('label')
const inputCol = document.createElement('input')
const spanCol = document.createElement('span')
const labelGap = document.createElement('label')
const inputGap = document.createElement('input')
const spanGap = document.createElement('span')
const labelDur = document.createElement('label')
const inputDur = document.createElement('input')
const spanDur = document.createElement('span')
const labelPos = document.createElement('label')
const inputPos = document.createElement('input')
const topbar = document.createElement('div')
const brand = document.createElement('div')
// removed rightbar (theme-only controls)
const labelPreset = document.createElement('label')
const selectPreset = document.createElement('select')
const labelItems = document.createElement('label')
const inputItems = document.createElement('input')
const spanItems = document.createElement('span')
// removed theme toggle
const labelMode = document.createElement('label')
const inputMode = document.createElement('input')
const labelStamps = document.createElement('label')
const inputStamps = document.createElement('input')

const grid = document.createElement('div')

// IDs and attributes similar to the static HTML version
grid.className = 'mk-app-grid'

// Compose DOM
title.className = 'title'
title.textContent = 'MasonryKit — Vite Vanilla Playground'
subtitle.className = 'subtitle'
subtitle.innerHTML =
  'Using <code>@masonrykit/browser</code> directly to render a masonry layout for quick visual testing.'
page.className = 'page mk-app-page'
topbar.className = 'mk-app-topbar'
brand.className = 'mk-app-brand'

// Topbar (brand + quick actions)

brand.textContent = 'MasonryKit'

// removed rightbar styles

// Theme toggle (Midnight/Aurora)
topbar.appendChild(brand)
header.appendChild(topbar)

header.appendChild(title)
header.appendChild(subtitle)

controls.className = 'controls mk-app-controls'

// Column width control
labelCol.appendChild(document.createTextNode('Column width: '))
inputCol.type = 'range'
inputCol.min = '80'
inputCol.max = '360'
inputCol.value = '200'
inputCol.id = 'colWidth'
spanCol.id = 'colWidthValue'
spanCol.textContent = inputCol.value
labelCol.appendChild(inputCol)
labelCol.appendChild(document.createTextNode(' '))
labelCol.appendChild(spanCol)
labelCol.appendChild(document.createTextNode('px'))

// Gap control
labelGap.appendChild(document.createTextNode('Gap: '))
inputGap.type = 'range'
inputGap.min = '0'
inputGap.max = '32'
inputGap.value = '0'
inputGap.id = 'gap'
spanGap.id = 'gapValue'
spanGap.textContent = inputGap.value
labelGap.appendChild(inputGap)
labelGap.appendChild(document.createTextNode(' '))
labelGap.appendChild(spanGap)
labelGap.appendChild(document.createTextNode('px'))

controls.appendChild(labelCol)
controls.appendChild(labelGap)

// Transition duration control
labelDur.appendChild(document.createTextNode('Anim: '))
inputDur.type = 'range'
inputDur.min = '0'
inputDur.max = '1000'
inputDur.step = '10'
inputDur.value = '220'
inputDur.id = 'duration'
spanDur.id = 'durationValue'
spanDur.textContent = inputDur.value
labelDur.appendChild(inputDur)
labelDur.appendChild(document.createTextNode(' '))
labelDur.appendChild(spanDur)
labelDur.appendChild(document.createTextNode(' ms'))
controls.appendChild(labelDur)

// Positioning mode (GPU transforms vs top/left)
inputPos.type = 'checkbox'
inputPos.checked = true
inputPos.className = 'mk-check'
labelPos.style.display = 'inline-flex'
labelPos.style.alignItems = 'center'
labelPos.style.gap = '6px'
labelPos.appendChild(inputPos)
labelPos.appendChild(document.createTextNode('GPU transforms'))
controls.appendChild(labelPos)

// Presets
labelPreset.appendChild(document.createTextNode('Preset: '))
selectPreset.id = 'preset'
;['Custom', 'Compact', 'Cozy', 'Spacious', 'Gallery'].forEach((name) => {
  const opt = document.createElement('option')
  opt.value = name
  opt.textContent = name
  selectPreset.appendChild(opt)
})
labelPreset.appendChild(selectPreset)
controls.appendChild(labelPreset)

// Items count
labelItems.appendChild(document.createTextNode('Items: '))
inputItems.type = 'range'
inputItems.min = '6'
inputItems.max = '120'
inputItems.value = '28'
inputItems.id = 'itemsCount'
spanItems.id = 'itemsCountValue'
spanItems.textContent = inputItems.value
labelItems.appendChild(inputItems)
labelItems.appendChild(document.createTextNode(' '))
labelItems.appendChild(spanItems)
labelItems.appendChild(document.createTextNode(' pcs'))
controls.appendChild(labelItems)

// Mode toggle (photos or cards)
inputMode.type = 'checkbox'
inputMode.checked = true
inputMode.className = 'mk-check mk-app-check'

labelMode.appendChild(inputMode)
labelMode.appendChild(document.createTextNode('Photos'))
controls.appendChild(labelMode)

// Stamps toggle
inputStamps.type = 'checkbox'
inputStamps.checked = false
inputStamps.className = 'mk-check mk-app-check'
labelStamps.appendChild(inputStamps)
labelStamps.appendChild(document.createTextNode('Stamps'))
controls.appendChild(labelStamps)

// Extra actions
const btnAdd = document.createElement('button')
btnAdd.type = 'button'
btnAdd.textContent = 'Add 12'
btnAdd.className = 'mk-button mk-app-button'
const btnReset = document.createElement('button')
btnReset.type = 'button'
btnReset.textContent = 'Reset'
btnReset.className = 'mk-button mk-app-button'
controls.appendChild(btnAdd)
controls.appendChild(btnReset)

// Shuffle button
const btnShuffle = document.createElement('button')
btnShuffle.type = 'button'
btnShuffle.textContent = 'Shuffle'
btnShuffle.className = 'mk-button mk-app-button'
btnShuffle.addEventListener('click', () => {
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  items = arr
  requestUpdate()
})
controls.appendChild(btnShuffle)

// State (declare before controls that reference it)
const state = {
  columnWidth: parseInt(inputCol?.value ?? '200', 10) || 200,
  gap: parseInt(inputGap?.value ?? '0', 10) || 0,
  // span2 removed
  horizontalOrder: false,
  itemCount: parseInt(inputItems?.value ?? '28', 10) || 28,
  preset: 'Custom' as 'Custom' | 'Compact' | 'Cozy' | 'Spacious' | 'Gallery',
  showPhotos: inputMode.checked,
  useStamps: inputStamps.checked,
  duration: parseInt(inputDur?.value ?? '220', 10) || 220,
  useTransform: inputPos.checked,
}
let items: DemoItem[] = []
if (state.useTransform) {
  grid.className = 'mk-app-grid mk-grid-gpu'
} else {
  grid.className = 'mk-app-grid mk-grid'
}
let addNonce = 0

// Span 2 control removed

// Horizontal order checkbox
const horizLabel = document.createElement('label')
const horizInput = document.createElement('input')
horizInput.type = 'checkbox'
horizInput.checked = state.horizontalOrder
horizInput.className = 'mk-check mk-app-check'

horizLabel.appendChild(horizInput)
horizLabel.appendChild(document.createTextNode('Horizontal order'))
horizInput.addEventListener('change', () => {
  state.horizontalOrder = horizInput.checked
  requestUpdate()
})
controls.appendChild(horizLabel)

// Layout toggle

// Assemble section and main
section.appendChild(controls)
// toggle removed (absolute mode only)

page.appendChild(header)
page.appendChild(section)
page.appendChild(grid)
main.appendChild(page)
root.prepend(main)

// Now the original app logic

const colWidthInput = inputCol
const colWidthValue = spanCol
const gapInput = inputGap
const gapValue = spanGap

// Early guard no longer needed as we just created grid node
// Cache DOM nodes for smooth transitions
const ITEM_NODES = new Map<string, HTMLDivElement>()
let INFO_NODE: HTMLDivElement | null = null

// State moved above

// Initialize grid CSS variables for transitions (used by CSS)
grid.style.setProperty('--mk-app-transition-duration', '220ms')
grid.style.setProperty('--mk-app-transition-easing', 'ease')
// Initialize CSS variables that may be used by styles (typed cast for TS)

grid.style.setProperty('--mk-cell-width', `${state.columnWidth}px`)
grid.style.setProperty('--mk-cell-gap', `${state.gap}px`)

// Keep UI labels in sync
function syncLabels(): void {
  if (colWidthValue) colWidthValue.textContent = String(state.columnWidth)
  if (gapValue) gapValue.textContent = String(state.gap)
  if (spanItems) spanItems.textContent = String(state.itemCount)
  if (spanDur) spanDur.textContent = String(state.duration)
  // keep CSS vars updated for styling
  grid.style.setProperty('--mk-cell-width', `${state.columnWidth}px`)
  grid.style.setProperty('--mk-cell-gap', `${state.gap}px`)
  grid.style.setProperty('--mk-app-transition-duration', `${state.duration}ms`)
  // preset indicator
  updatePresetSelection()
}

// Demo presets
const PRESETS = {
  Compact: { columnWidth: 160, gap: 8 },
  Cozy: { columnWidth: 200, gap: 12 },
  Spacious: { columnWidth: 280, gap: 16 },
  Gallery: { columnWidth: 240, gap: 0 },
} as const

function applyPreset(name: keyof typeof PRESETS | 'Custom'): void {
  if (name !== 'Custom') {
    const p = PRESETS[name]
    state.columnWidth = p.columnWidth
    state.gap = p.gap
    inputCol.value = String(p.columnWidth)
    inputGap.value = String(p.gap)
  }
  state.preset = name
  selectPreset.value = name

  syncLabels()
  requestUpdate()
}

function updatePresetSelection(): void {
  let match: 'Custom' | keyof typeof PRESETS = 'Custom'
  for (const key of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
    const p = PRESETS[key]
    if (p.columnWidth === state.columnWidth && p.gap === state.gap) {
      match = key
      break
    }
  }
  state.preset = match
  if (selectPreset.value !== match) selectPreset.value = match
}

// Demo items: a mix of fixed heights and aspect ratios
type DemoMeta = { src: string }
type DemoItem = {
  id: string
  height?: number
  aspectRatio?: number
  columnSpan?: number
  meta: DemoMeta
}
items = createDemoItems(state.itemCount)

function createDemoItems(count: number): DemoItem[] {
  const out: DemoItem[] = []
  // deterministic pseudo-random (so a refresh keeps similar shapes)
  let seed = 42
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const img = (id: string) => `https://picsum.photos/seed/${encodeURIComponent(id)}/800/600`

  for (let i = 0; i < count; i++) {
    const id = String.fromCharCode(65 + (i % 26)) + '-' + i
    // Alternate between aspect-ratio based and fixed heights
    if (i % 3 === 0) {
      // aspect ratios: 4/3, 1, 16/9, 3/4, 2, 0.75, 1.25, 1.5, 0.5, 1.1, 1.3
      const ratios = [4 / 3, 1, 16 / 9, 3 / 4, 2, 0.75, 1.25, 1.5, 0.5, 1.1, 1.3]
      out.push({
        id,
        aspectRatio: ratios[Math.floor(rnd() * ratios.length)]!,
        ...(i % 9 === 0 ? { columnSpan: 2 } : i % 23 === 0 ? { columnSpan: 3 } : {}),
        meta: { src: img(id) },
      })
    } else {
      // fixed heights: 80..320
      const h = 80 + Math.floor(rnd() * 240)
      out.push({
        id,
        height: h,
        ...(i % 9 === 0 ? { columnSpan: 2 } : i % 23 === 0 ? { columnSpan: 3 } : {}),
        meta: { src: img(id) },
      })
    }
  }
  return out
}

// Render one frame
function render(width: number): void {
  const srcItems = items
  const stamps = state.useStamps
    ? [
        { x: -5, y: 0, width: (state.columnWidth + state.gap) * 4, height: 14 },
        { x: state.columnWidth + state.gap, y: 10, width: state.columnWidth, height: 30 },
      ]
    : undefined

  const baseOptions = {
    gridWidth: Math.max(120, Math.floor(width)),
    columnWidth: Math.max(80, state.columnWidth),
    gap: Math.max(0, state.gap),
    horizontalOrder: state.horizontalOrder,
  }
  const layout = computeMasonryLayout(srcItems, stamps ? { ...baseOptions, stamps } : baseOptions)

  // Grid styling
  // Absolute mode: fix grid height using CSS var
  grid.style.setProperty('--mk-grid-h', `${layout.grid.height}px`)
  // Force reflow to apply container height before positioning children
  void grid.offsetHeight

  // Reconcile DOM nodes (no full clear) for smooth transitions
  const present = new Set<string>()

  for (const pos of layout.cells) {
    const item = srcItems[pos.index]!
    const key = item.id ?? String(pos.index)
    present.add(key)

    let el = ITEM_NODES.get(key)
    if (!el) {
      el = document.createElement('div')
      el.className = 'mk-cell'
      // inner wrapper for visual transforms (hover lift)
      const inner = document.createElement('div')
      inner.className = 'mk-cell-inner'
      el.appendChild(inner)
      // content container
      const content = document.createElement('div')
      content.className = 'mk-content mk-app-content'
      inner.appendChild(content)
      // caption overlay
      const caption = document.createElement('div')
      caption.className = 'mk-caption mk-app-caption'
      inner.appendChild(caption)
      ITEM_NODES.set(key, el)
    }
    // ensure content matches mode
    const innerNode = (el.querySelector('.mk-cell-inner') as HTMLDivElement) ?? el
    const contentNode = innerNode.querySelector('.mk-content') as HTMLDivElement
    if (state.showPhotos) {
      if (!contentNode.querySelector('img')) {
        contentNode.innerHTML = ''
        const imgEl = document.createElement('img')
        imgEl.src = item.meta.src
        imgEl.alt = (item.id ?? String(pos.index)).toString()
        imgEl.loading = 'lazy'
        contentNode.appendChild(imgEl)
      }
    } else {
      if (!contentNode.querySelector('.mk-card')) {
        contentNode.innerHTML = ''
        const card = document.createElement('div')
        card.className = 'mk-card mk-app-card'
        card.textContent = (item.id ?? String(pos.index)).toString()
        contentNode.appendChild(card)
      }
    }

    // Use CSS variables for geometry and toggle between absolute vs transform3d
    // Update CSS variables with current geometry
    el.style.setProperty('--mk-cell-x', `${pos.x}px`)
    el.style.setProperty('--mk-cell-y', `${pos.y}px`)
    el.style.setProperty('--mk-cell-w', `${pos.width}px`)
    el.style.setProperty('--mk-cell-h', `${pos.height}px`)
    // positioning mode is handled via .mk-grid or .mk-grid-gpu in CSS

    // update caption on each render
    const captionNode = el.querySelector('.mk-caption')
    if (captionNode) {
      captionNode.textContent = `${key} • ${Math.round(pos.width)}×${Math.round(pos.height)}`
    }

    if (!el.parentElement) grid.appendChild(el)
  }

  // Remove stale nodes
  for (const [key, node] of ITEM_NODES) {
    if (!present.has(key)) {
      node.remove()
      ITEM_NODES.delete(key)
    }
  }

  // Footer overlay with info (reuse node)
  if (!INFO_NODE) {
    INFO_NODE = document.createElement('div')
    INFO_NODE.className = 'mk-info mk-app-info'
    grid.appendChild(INFO_NODE)
  }
  INFO_NODE.textContent = `Columns: ${layout.grid.columnCount} • ColumnWidth: ${layout.grid.columnWidth}px • Gap: ${layout.grid.gap}px • Cells: ${layout.cells.length}`
}

// Coalesced updater
let rafId: number | null = null
function requestUpdate(): void {
  if (rafId != null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    // Measure the actual inner width of grid to match layout precisely
    const width = Math.max(0, grid?.clientWidth ?? 0)
    render(width)
  })
}

// Observe width of the playground container to auto-reflow on resize
const disposer =
  observeElementWidth(grid, () => {
    requestUpdate()
  }) ?? (() => {})

// Slider events and CSS vars
colWidthInput.addEventListener('input', () => {
  const next = parseInt(colWidthInput.value, 10)
  if (!Number.isNaN(next)) {
    state.columnWidth = next
    syncLabels()
    requestUpdate()
  }
})
gapInput.addEventListener('input', () => {
  const next = parseInt(gapInput.value, 10)
  if (!Number.isNaN(next)) {
    state.gap = next
    syncLabels()
    requestUpdate()
  }
})
inputDur.addEventListener('input', () => {
  const next = parseInt(inputDur.value, 10)
  if (!Number.isNaN(next)) {
    state.duration = next
    syncLabels()
    // no need to reflow immediately; transitions read CSS var
    requestUpdate()
  }
})
inputPos.addEventListener('change', () => {
  state.useTransform = inputPos.checked
  grid.className = state.useTransform ? 'mk-app-grid mk-grid-gpu' : 'mk-app-grid mk-grid'
  requestUpdate()
})
inputItems.addEventListener('input', () => {
  const next = parseInt(inputItems.value, 10)
  if (!Number.isNaN(next)) {
    state.itemCount = next
    items = createDemoItems(state.itemCount)
    syncLabels()
    requestUpdate()
  }
})
selectPreset.addEventListener('change', () => {
  const name = selectPreset.value as 'Custom' | 'Compact' | 'Cozy' | 'Spacious' | 'Gallery'
  applyPreset(name)
})

inputMode.addEventListener('change', () => {
  state.showPhotos = inputMode.checked
  requestUpdate()
})

inputStamps.addEventListener('change', () => {
  state.useStamps = inputStamps.checked
  requestUpdate()
})
btnAdd.addEventListener('click', () => {
  const add = 12
  state.itemCount = Math.min(200, state.itemCount + add)
  inputItems.value = String(state.itemCount)
  const start = addNonce
  addNonce += add
  items = items.concat(createDemoItems(add).map((d, i) => ({ ...d, id: `${d.id}-x${start + i}` })))
  syncLabels()
  requestUpdate()
})
btnReset.addEventListener('click', () => {
  state.itemCount = parseInt(inputItems.min, 10)
  inputItems.value = inputItems.min
  items = createDemoItems(state.itemCount)
  syncLabels()
  requestUpdate()
})

// Initialize

syncLabels()
requestUpdate()

// HMR cleanup
if (import.meta && import.meta.hot) {
  import.meta.hot.accept?.(() => {
    disposer()
  })
  import.meta.hot.dispose?.(() => {
    try {
      disposer()
    } catch {
      void 0
    }
    const prev = root.querySelector('.mk-app-root') as HTMLElement | null
    if (prev) prev.remove()
  })
}
