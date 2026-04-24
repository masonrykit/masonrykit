# @masonrykit/browser

[![npm](https://img.shields.io/npm/v/@masonrykit/browser.svg)](https://www.npmjs.com/package/@masonrykit/browser)
[![bundle size](https://img.shields.io/bundlejs/size/@masonrykit/browser)](https://bundlejs.com/?q=@masonrykit/browser)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

DOM integrations on top of [`@masonrykit/core`](../core/). Framework-agnostic — use it directly for a vanilla masonry, or build your own framework binding. The React binding (`@masonrykit/react`) composes these primitives.

This package ships no layout CSS and sets nothing on your elements. The utilities here just wrap the three APIs the DOM makes painful on its own — a debounced `ResizeObserver`, a measured-height tracker that de-dupes reports, and a safe View Transitions wrapper. Everything else — the elements, the styles, the positioning strategy — is your code.

## Install

```bash
npm install @masonrykit/browser
```

All exports from `@masonrykit/core` are re-exported — you don't need to install core separately.

## Quick start

**Recommended pattern:** pipe the dynamic layout values through inline CSS custom properties and let a stylesheet consume them. The className and CSS rules stay stable across renders — only the var values change — so the browser caches selector matching, skips style recalc, and the resulting `translate` update rides the compositor thread. Much cheaper than mutating `transform` / `width` / `height` inline per frame.

```html
<link rel="stylesheet" href="./masonry.css" />
<div class="grid"></div>
```

```css
/* masonry.css — you own this file; no library styles are injected. */
.grid {
  position: relative;
  height: var(--grid-h);
}
.cell {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--w);
  height: var(--h, auto); /* `auto` fallback for measured cells */
  translate: var(--x) var(--y);
}
```

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

  // Pipe the height through a CSS var; the stylesheet does the rest.
  grid.style.setProperty('--grid-h', `${layout.height}px`)

  // Minimal shape — a real app would diff nodes across runs. Note that
  // setting `--x` / `--y` / `--w` instead of `transform` / `width` keeps
  // the per-cell work in the compositor lane.
  grid.replaceChildren(
    ...layout.cells.map((cell) => {
      const el = document.createElement('div')
      el.className = 'cell'
      el.style.setProperty('--x', `${cell.x}px`)
      el.style.setProperty('--y', `${cell.y}px`)
      el.style.setProperty('--w', `${cell.width}px`)
      el.style.setProperty('--h', `${cell.height}px`)
      el.textContent = cell.id
      return el
    }),
  )
})

// When tearing down the grid:
dispose()
```

The var names (`--x`, `--y`, `--w`, `--h`) are your choice — the library doesn't emit or consume any fixed convention. Use `--col`, `--offset-x`, whatever fits your codebase.

See [`apps/vite/src/main.ts`](../../apps/vite/src/main.ts) in the repo for a fully-featured vanilla playground using every primitive below — measured cells, stamps, virtualization, breakpoints, View Transitions. It uses Tailwind 4's `translate-x-(--x)` / `w-(--w)` shorthand to consume the vars inline as utilities instead of a separate stylesheet; the underlying pattern is the same.

**Alternative (simpler, slower under churn):** set `el.style.transform` / `width` / `height` inline every render. Fine for static grids or small (< ~50 cell) playgrounds; reach for the CSS-var pattern once you're animating many cells at 60 fps.

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

Pair with `view-transition-name` set on each animating element — in a React component, set it via inline style, a CSS custom property consumed by a stylesheet, or a class.

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
