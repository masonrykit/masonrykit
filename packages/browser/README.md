# @masonrykit/browser

[![npm](https://img.shields.io/npm/v/@masonrykit/browser.svg)](https://www.npmjs.com/package/@masonrykit/browser)
[![bundle size](https://img.shields.io/bundlejs/size/@masonrykit/browser)](https://bundlejs.com/?q=@masonrykit/browser)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

DOM integrations on top of [`@masonrykit/core`](../core/). Framework-agnostic — use it directly for a vanilla masonry, or build your own framework binding. The React binding (`@masonrykit/react`) composes these primitives.

## Install

```bash
npm install @masonrykit/browser
```

All exports from `@masonrykit/core` are re-exported — you don't need to install core separately.

## Quick start

```ts
import { computeLayout, heightCell, aspectCell, observeElementWidth } from '@masonrykit/browser'

const grid = document.querySelector<HTMLElement>('.grid')!

const cells = [heightCell('a', 200), aspectCell('b', 16 / 9), heightCell('c', 150)]

const dispose = observeElementWidth(grid, (width) => {
  const layout = computeLayout(cells, {
    gridWidth: width,
    columnWidth: 200,
    gap: 12,
  })
  // Apply cell.x / cell.y / cell.width / cell.height to your DOM nodes.
})

// When tearing down the grid:
dispose()
```

See [`apps/vite/src/main.ts`](../../apps/vite/src/main.ts) in the repo for a fully-featured vanilla playground using every primitive below.

## API

### `observeElementWidth(element, onWidth): () => void`

```ts
function observeElementWidth(element: Element, onWidth: (width: number) => void): () => void
```

`ResizeObserver` wrapper, coalesced through `requestAnimationFrame` so rapid resizes only fire once per frame. Calls `onWidth` synchronously once on attach with the current `getBoundingClientRect().width`, then again whenever the element's border-box width changes. Returns a disposer that disconnects the observer.

### `createMeasuredHeightTracker(onChange): MeasuredHeightTracker`

```ts
type MeasuredHeightTracker = {
  observe(id: string, element: Element): void
  unobserve(id: string): void
  disconnect(): void
}

function createMeasuredHeightTracker(
  onChange: (id: string, height: number) => void,
): MeasuredHeightTracker
```

Per-cell `ResizeObserver` aggregator for `MeasuredCell` inputs. Attach one tracker to your grid lifecycle, then `observe(id, element)` each measured cell's rendered node and `unobserve(id)` when it unmounts. `onChange` fires whenever a cell's content-box height changes — you typically update a `Map<string, number>` and re-run `computeLayout`.

Spurious 0-height reports (which can land before a child has laid out) are filtered out so virtualizers don't unmount a cell before the real measurement arrives.

```ts
const heights = new Map<string, number>()
const tracker = createMeasuredHeightTracker((id, h) => {
  if (heights.get(id) === h) return
  heights.set(id, h)
  scheduleLayout()
})

// When rendering each measured cell:
tracker.observe(cell.id, cellElement)

// When the cell unmounts:
tracker.unobserve(cell.id)

// On teardown:
tracker.disconnect()
```

### `startViewTransition(callback): void`

```ts
function startViewTransition(callback: () => void): void
```

Wraps a callback in [`document.startViewTransition`](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition) when the browser supports it, so layout changes animate natively. In browsers without View Transitions (Firefox today, older Safari) the callback runs synchronously — no animation, no error.

Pair with `view-transition-name` set on each animating element (in React bindings this is automatic when `animate: true`).

**React note:** wrap the body in `flushSync` so React's async batching doesn't defer the DOM commit past the browser's snapshot — otherwise the before/after snapshots are identical and no animation runs.

```ts
import { flushSync } from 'react-dom'
import { startViewTransition } from '@masonrykit/browser'

startViewTransition(() => {
  flushSync(() => setCells(shuffled))
})
```

## Re-exports from core

Every public API from [`@masonrykit/core`](../core/) is re-exported here, so one import covers both layout math and browser integrations:

- `computeLayout`, `computeColumns`, `columnStampsToPixels`
- `heightCell`, `aspectCell`, `measuredCell`
- `resolveBreakpoint`, `filterVisibleCells`
- Types: `Cell`, `HeightCell`, `AspectCell`, `MeasuredCell`, `LayoutCell`, `Layout`, `LayoutOptions`, `Columns`, `Stamp`, `ColumnStamp`, `Breakpoint`, `Viewport`, `Meta`

## Browser support

Modern evergreen browsers. Required APIs:

- `ResizeObserver` — ~2020+; ubiquitous on the browsers we target.
- CSS `translate` property (used by consumers positioning cells) — Chrome 104+, Safari 14.1+, Firefox 72+.
- View Transitions API (only needed when using `startViewTransition` and you want animation) — Chrome 111+, Safari 18+. Falls back cleanly to a no-op elsewhere.

## License

MIT
