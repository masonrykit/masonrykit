# @masonrykit/core

[![npm](https://img.shields.io/npm/v/@masonrykit/core.svg)](https://www.npmjs.com/package/@masonrykit/core)
[![bundle size](https://img.shields.io/bundlejs/size/@masonrykit/core)](https://bundlejs.com/?q=@masonrykit/core)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Pure, framework-agnostic math for masonry-style grid layouts. Zero runtime dependencies, no DOM, no React — just input cells in, positions out.

## Install

```bash
npm install @masonrykit/core
```

## Quick start

```ts
import { computeLayout, heightCell, aspectCell } from '@masonrykit/core'

const cells = [heightCell('a', 100), aspectCell('b', 16 / 9), heightCell('c', 50)]

const layout = computeLayout(cells, {
  gridWidth: 800,
  columnWidth: 200,
  gap: 16,
})

for (const cell of layout.cells) {
  console.log(cell.id, cell.x, cell.y, cell.width, cell.height)
}
// layout.width / layout.height / layout.columns are also set
```

## API

### Cell factories

The simplest way to build cells — each factory produces the right discriminated-union shape and threads a typed `meta` field when supplied.

```ts
heightCell(id: string, height: number, options?: { columnSpan?; meta? }): HeightCell
aspectCell(id: string, aspectRatio: number, options?: { columnSpan?; meta? }): AspectCell
measuredCell(id: string, options?: { columnSpan?; estimatedHeight?; meta? }): MeasuredCell
```

When you pass a concrete `M` type, `meta` is **required**, so `cell.meta.src` type-checks without a non-null assertion:

```ts
interface Photo {
  src: string
  alt: string
}

const cell = heightCell<Photo>('p1', 200, { meta: { src: '/a.jpg', alt: 'A' } })
cell.meta.src // '/a.jpg' — no `!` needed
```

### Cell types

```ts
type HeightCell<M = undefined> = {
  id: string
  type: 'height'
  height: number
  columnSpan?: number
} & Meta<M>

type AspectCell<M = undefined> = {
  id: string
  type: 'aspect'
  aspectRatio: number // width / height; must be > 0
  columnSpan?: number
} & Meta<M>

/**
 * A cell whose height is discovered from the DOM (e.g. via ResizeObserver).
 * Framework bindings attach an observer to the rendered element and either
 * replace the cell with a `HeightCell` once measured, or keep passing it
 * through — `computeLayout` uses `estimatedHeight` until a real measurement
 * lands.
 */
type MeasuredCell<M = undefined> = {
  id: string
  type: 'measured'
  columnSpan?: number
  estimatedHeight?: number
} & Meta<M>

type Cell<M = undefined> = HeightCell<M> | AspectCell<M> | MeasuredCell<M>

// Meta<M> — when M is supplied, `meta` is required; otherwise it's optional.
type Meta<M> = [M] extends [undefined] ? { meta?: M } : { meta: M }
```

### `computeLayout(cells, options)`

```ts
type LayoutOptions = {
  gridWidth: number // required, >= 0
  columnWidth?: number // desired column width; defaults to gridWidth (single column)
  gap?: number // default 0
  horizontalOrder?: boolean // default false — shortest-column placement
  stamps?: readonly Stamp[] // pixel-aligned reserved rectangles
  columnStamps?: readonly ColumnStamp[] // column-aligned reserved rectangles
}

type Layout<M = undefined> = {
  cells: LayoutCell<M>[]
  width: number
  height: number
  columns: Columns
}

type LayoutCell<M = undefined> = {
  index: number
  id: string
  column: number
  span: number
  x: number
  y: number
  width: number
  height: number
} & Meta<M>
```

Throws `Error` if any `AspectCell` has a non-positive `aspectRatio`.

### `computeColumns(options)`

```ts
type Columns = { count: number; width: number; gap: number }

function computeColumns(options: { gridWidth: number; columnWidth?: number; gap?: number }): Columns
```

Resolves how many columns fit. Returns pixel-rounded `width` and `gap`.

### `columnStampsToPixels(stamps, columns)`

```ts
type ColumnStamp = { column: number; span: number; y: number; height: number }
type Stamp = { x: number; y: number; width: number; height: number }

function columnStampsToPixels(
  stamps: readonly ColumnStamp[],
  columns: Pick<Columns, 'width' | 'gap'>,
): Stamp[]
```

Useful for pre-computing pixel stamps. `computeLayout` also accepts `columnStamps` directly.

### `resolveBreakpoint(breakpoints, gridWidth)`

```ts
type Breakpoint = { minWidth: number; columnWidth?: number; gap?: number }

function resolveBreakpoint(
  breakpoints: readonly Breakpoint[],
  gridWidth: number,
): Breakpoint | undefined
```

Returns the entry with the largest `minWidth <= gridWidth`, or `undefined` if none match. Pure — callers merge matched fields with their defaults:

```ts
const tiers: Breakpoint[] = [
  { minWidth: 0, columnWidth: 160, gap: 8 },
  { minWidth: 768, columnWidth: 220, gap: 12 },
  { minWidth: 1280, columnWidth: 280, gap: 16 },
]

const match = resolveBreakpoint(tiers, gridWidth)
const columnWidth = match?.columnWidth ?? defaultColumnWidth
const gap = match?.gap ?? defaultGap
```

### `filterVisibleCells(cells, gridTop, viewport, overscan?)`

```ts
type Viewport = { top: number; bottom: number }

function filterVisibleCells<M>(
  cells: readonly LayoutCell<M>[],
  gridTop: number,
  viewport: Viewport,
  overscan?: number, // default 0
): readonly LayoutCell<M>[]
```

Pure geometry. Given laid-out cells, the grid's top edge, and viewport bounds (all in the same coord space — usually viewport-relative pixels), returns the subset that intersects the viewport ± `overscan`. Browsers read the actual numbers from `getBoundingClientRect()` / `window.innerHeight` and pass them in. Used by the React hook's `virtualize` option.

## Features at a glance

- **Three cell shapes** via discriminated union (`height` / `aspect` / `measured`)
- **Multi-span items** — cells can span multiple columns
- **Stamps** — reserve space with pixel or column-aligned rectangles
- **Horizontal ordering** — optional row-wise placement instead of shortest-column
- **Responsive breakpoints** (`resolveBreakpoint`) and **viewport filtering** (`filterVisibleCells`) primitives
- **Pure & deterministic** — no side effects, no DOM, no hidden state
- **TypeScript-first** — generic `meta` flows from input to output with no casts

## License

MIT
