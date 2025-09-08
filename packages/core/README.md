# @masonrykit/core

Pure, framework‑agnostic utilities to compute Masonry‑style grid layouts. No DOM work is performed by the core algorithm — you provide inputs (grid width, desired column width, gap, item sizes), and it returns deterministic positions.

Key points:
- Deterministic, side‑effect free.
- Works in any JS runtime (Node, browser, workers).
- Items can span multiple columns via `columnSpan` (span ≥ 1).
- Horizontal and vertical gap are unified via a single `gap` value.
- Pixel rounding is applied to avoid sub‑pixel jitter.



## Installation

Using your favorite package manager:

```sh
pnpm add @masonrykit/core
# or
npm install @masonrykit/core
# or
yarn add @masonrykit/core
```

## Quick start

```ts
import {
  computeColumns,
  computeMasonryLayout,
  type MasonryCellInput,
} from '@masonrykit/core'

const gridWidth = 800
const gap = 16
const desiredColumnWidth = 188

// Derive stable columns for your grid
const columns = computeColumns({ gridWidth, gap, columnWidth: desiredColumnWidth })
/*
columns = {
  columnCount: 4,
  columnWidth: 188,
  gap: 16
}
*/

type Photo = MasonryCellInput<{ src: string }>

const items: readonly Photo[] = [
  { id: 'a', height: 100, meta: { src: '/img/a.jpg' } },
  { id: 'b', aspectRatio: 1, meta: { src: '/img/b.jpg' } }, // height = columnWidth / 1 = 188
  { id: 'c', height: 50, meta: { src: '/img/c.jpg' } },
  { id: 'd', aspectRatio: 2, meta: { src: '/img/d.jpg' } }, // height = columnWidth / 2 = 94
]

const layout = computeMasonryLayout(items, {
  gridWidth,
  gap,
  columnWidth: desiredColumnWidth,
})

/*
layout = {
  cells: [
    { index: 0, id: 'a', column: 0, x: 0,   y: 0,  width: 188, height: 100, meta: { src: ... } },
    { index: 1, id: 'b', column: 1, x: 204, y: 0,  width: 188, height: 188, meta: { src: ... } },
    { index: 2, id: 'c', column: 2, x: 408, y: 0,  width: 188, height: 50,  meta: { src: ... } },
    { index: 3, id: 'd', column: 3, x: 612, y: 0,  width: 188, height: 94,  meta: { src: ... } },
  ],
  grid: {
    width: 800,
    height: 442,          // tallest column minus trailing gap
    columnCount: 4,
    columnWidth: 188,     // rounded
    gap: 16               // rounded
  }
}
*/
```

## API

### Types

```ts
export type MasonryCellInput<M = unknown> =
  {
    id?: string
    columnSpan?: number  // optional number of columns to span (≥ 1)
    meta: M
  } & (
    | {
        // Explicit height in pixels. When provided, aspectRatio must not be specified.
        height: number
        aspectRatio?: never
      }
    | {
        // width / height ratio (e.g., 16/9). When provided, height must not be specified.
        aspectRatio: number
        height?: never
      }
  )
```

export type MasonryResolvedColumns = {
  columnCount: number
  columnWidth: number
  gap: number
}

export type MasonryStamp = {
  x: number   // left in px
  y: number   // top in px
  width: number
  height: number
}

export type MasonryOptions = {
  gridWidth: number
  gap?: number
  columnWidth?: number
  horizontalOrder?: boolean
  stamps?: MasonryStamp[] // pre-occupied rectangles that raise column baselines
}

export type MasonryLayoutCell<M = unknown> = {
  index: number
  id?: string
  column: number
  span: number
  x: number
  y: number
  width: number
  height: number
  meta: M
}

export type MasonryLayoutResult<M = unknown> = {
  cells: MasonryLayoutCell<M>[]
  grid: {
    width: number
    height: number
    columnCount: number
    columnWidth: number
    gap: number
  }
}
```

### computeColumns(options): MasonryResolvedColumns

Derives a stable column configuration given a grid width and a desired column width.

Rules:
- At least one column is always returned.
- Gap is applied horizontally between columns.
- Resolved `columnWidth` ensures columns fill `gridWidth` including the gaps.

Formulae:
- `cols = floor((gridWidth + gap) / (desiredColumnWidth + gap))`
- `columnCount = max(1, cols)`
- `columnWidth = (gridWidth - gap * (columnCount - 1)) / columnCount`

Example:

```ts
const { columnCount, columnWidth, gap } = computeColumns({
  gridWidth: 800,
  gap: 16,
  columnWidth: 188,
})
// -> { columnCount: 4, columnWidth: 188, gap: 16 }
```

### computeMasonryLayout(items, options): MasonryLayoutResult

Computes absolute positions for each item.

Behavior:
- Items can span multiple columns via `columnSpan` (≥ 1). The item width is:
  - `width = span * columnWidth + (span - 1) * gap`
- Height derivation:
  - If `item.height` is provided, it is used.
  - Otherwise, if `item.aspectRatio` is provided and > 0, then `height = columnWidth / aspectRatio`.
  - Otherwise height defaults to `0`.
- Placement strategy:
  - Default: classic “shortest column” strategy generalized for spans:
    - Evaluate each valid start (0..columnCount - span) and choose the one with the smallest baseline,
      where the baseline is the max of involved column heights in the spanned range.
    - Ties pick the earliest column.
  - When `horizontalOrder: true`, items are placed row-wise (columns 0..N-1) and wrap:
    - Start column advances by `span` for each placed item; if `start + span > columnCount`, wrap to 0.
    - Baseline is still the max across the spanned range at placement time.
- Stamps:
  - Each stamp pre-raises the baseline of any column it horizontally overlaps:
    - `baseline = stamp.y + stamp.height + gap` (rounded).
    - Spanned items use the max baseline across their covered columns.
- Rounding:
  - Horizontal and vertical values (`x`, `y`, `width`, `height`, `gap`) are rounded with `Math.round` for stable pixels.
- Grid height:
  - Computed as the tallest column height minus the final trailing gap (if any items exist).

Example:

```ts
const layout = computeMasonryLayout(items, {
  gridWidth: 800,
  gap: 16,
  columnWidth: 188,
  horizontalOrder: false,
})
```

## Fit‑width calculation (for UI)

Core does not mutate container styles. If you want to “fit” a container to the computed columns:

```ts
const fitWidth = layout.grid.columnCount * layout.grid.columnWidth
  + (layout.grid.columnCount - 1) * layout.grid.gap
```

Because `columnWidth` and `gap` are rounded, `fitWidth` can differ from the input `gridWidth` by at most 1px in certain cases. Your UI can choose to:
- Use `gridWidth` (as measured);
- Use `fitWidth` to size the container exactly to the columns.

## Horizontal order vs shortest column

- `horizontalOrder: false` (default): classic Masonry; each item goes to the currently shortest column.
- `horizontalOrder: true`: items are placed in columns 0..N-1, then wrap to the next row (useful for row-wise visual flow).

Both modes still compute `y` positions using per‑column accumulated height and the vertical `gap`.

## Pixel rounding

All computed values are rounded to the nearest integer. This reduces sub‑pixel jitter when containers resize by small amounts.

- Heights derived from aspect ratios are also rounded: `height = round(columnWidth / aspectRatio)`.
- `x` positions are computed as `columnIndex * round(columnWidth + gap)`.

## Stamps and multi‑span overview

- Multi‑span items:
  - Set `columnSpan` on items to make them span multiple columns.
  - Placement chooses the start column that minimizes the max baseline across the spanned range.
  - In `horizontalOrder`, the cursor advances by `span`, wrapping to 0 when needed.
- Stamps:
  - Provide `stamps` in `MasonryOptions` as rectangles (x, y, width, height).
  - Any column whose interior overlaps a stamp has its baseline raised to:
    - `baseline = y + height + gap` (rounded).
  - Spanned items compute their baseline as the max across their covered columns.

## Roadmap

- Multi‑span items (e.g., item spans 2+ columns).
- Stamp/obstacle support (pre‑occupied regions).
- Optional packing heuristics and pluggable strategies.
- Additional layout constraints and priorities.

## Version

```ts
export const VERSION: string
```

A string placeholder set at build time (can be overridden by tooling).

## License

MIT © MasonryKit contributors