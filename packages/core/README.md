# @masonrykit/core

Pure, framework-agnostic utilities to compute Masonry-style grid layouts.

## Installation

```sh
npm install @masonrykit/core
```

## Quick Start

```ts
import {
  computeColumns,
  computeMasonryLayout,
  type CellInput,
} from '@masonrykit/core'

const gridWidth = 800
const gap = 16
const columnWidth = 188

// Compute column configuration
const columns = computeColumns({ gridWidth, gap, columnWidth })

// Layout items
const items: CellInput[] = [
  { id: 'a', height: 100 },
  { id: 'b', aspectRatio: 1 },
  { id: 'c', height: 50 },
]

const layout = computeMasonryLayout(items, { gridWidth, gap, columnWidth })
```

## API

### Types

```ts
export type CellInput<M = undefined> = {
  id?: string
  columnSpan?: number
} & ([M] extends [undefined] ? { meta?: M } : { meta: M }) &
  (
    | { height: number; aspectRatio?: never }
    | { aspectRatio: number; height?: never }
  )

export type LayoutOptions = {
  gridWidth?: number
  gap?: number
  columnWidth?: number
  columns?: ColumnConfig
  horizontalOrder?: boolean
  stamps?: Stamp[]
}

export type LayoutResult<M = undefined> = {
  cells: LayoutCell<M>[]
  grid: {
    width: number
    height: number
    columnCount: number
    columnWidth: number
    gap: number
  }
}
```

### Functions

#### `computeColumns(options): ColumnConfig`

Computes column configuration for a given grid width and desired column width.

#### `computeMasonryLayout(items, options): LayoutResult`

Computes absolute positions for all items in the layout.

#### `convertColumnStampsToPixel(stampsCols, columns): Stamp[]`

Converts column-based stamps to pixel-based stamps.

## Features

- **Multi-span items** — Items can span multiple columns
- **Stamp support** — Reserve space with rectangular stamps
- **Horizontal ordering** — Optional row-wise placement
- **Pure functions** — Deterministic, side-effect free
- **TypeScript-first** — Full type safety

## License

MIT
