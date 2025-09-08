# @masonrykit/browser

Browser utilities for MasonryKit. Includes all exports from `@masonrykit/core`.

## Installation

```bash
npm install @masonrykit/browser
```

## Quick Start

```typescript
import {
  computeMasonryLayout,
  observeElementWidth,
  convertColumnStampsToPixel,
} from '@masonrykit/browser'

// Responsive width observation
const gridElement = document.querySelector('.grid')
const dispose = observeElementWidth(gridElement, (width) => {
  const layout = computeMasonryLayout(cells, {
    gridWidth: width,
    columnWidth: 200,
    gap: 12,
  })
  // Apply new positions...
})

// Column-aligned stamps
const stampsCols = [{ startCol: 0, span: 2, y: 0, height: 50 }]
const columns = { columnWidth: 200, gap: 12 }
const pixelStamps = convertColumnStampsToPixel(stampsCols, columns)
```

## API

### Core Re-exports

All functions and types from `@masonrykit/core` are re-exported. See the [core documentation](../core/README.md) for details.

### observeElementWidth

```typescript
function observeElementWidth(
  element: Element | null | undefined,
  onWidth: (width: number) => void,
): () => void
```

Observes an element's width and calls the callback when it changes.

- Uses ResizeObserver for efficient tracking
- SSR-safe (no-ops when `window` is undefined)
- Calls immediately with current width
- Returns disposer function

### convertColumnStampsToPixel

```typescript
function convertColumnStampsToPixel(
  stampsCols: ColumnStamp[],
  columns: { columnWidth: number; gap: number },
): Stamp[]
```

Converts column-aligned stamps to pixel-based stamps.

```typescript
type ColumnStamp = {
  startCol: number // Starting column index
  span: number // Number of columns to span
  y: number // y position in pixels
  height: number // Height in pixels
}
```

### Utility Functions

```typescript
// Parse CSS numeric values
function parseCssNumber(value: string | null | undefined): number | undefined

// Read CSS custom properties
function getCssNumber(
  element: Element,
  ...propertyNames: string[]
): number | undefined

// RequestAnimationFrame wrapper
function raf(fn: () => void): void
```

## License

MIT
