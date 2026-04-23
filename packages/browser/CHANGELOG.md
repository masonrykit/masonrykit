# @masonrykit/browser

## 0.1.0

### Minor Changes

- [#2](https://github.com/masonrykit/masonrykit/pull/2) [`e8140b2`](https://github.com/masonrykit/masonrykit/commit/e8140b2dba496fb2c96a8fd676972e61ceba62f3) Thanks [@lifeiscontent](https://github.com/lifeiscontent)! - Initial 0.1.0 release.

  **Core (`@masonrykit/core`)**
  - Pure, framework-agnostic masonry layout computation: `computeLayout`, `computeColumns`, `columnStampsToPixels`.
  - Three cell shapes via discriminated union: `HeightCell`, `AspectCell`, `MeasuredCell`.
  - Cell factories: `heightCell`, `aspectCell`, `measuredCell`.
  - Multi-column-span cells, pixel and column-aligned stamps, optional horizontal ordering.
  - `Breakpoint` + `resolveBreakpoint` for responsive `columnWidth` / `gap` resolution.
  - `filterVisibleCells` pure-geometry viewport filter for virtualization consumers.
  - Generic `Meta<M>` threads cell metadata end-to-end: when `M` is supplied, `meta` is required on both input and output cells with no casts needed.

  **Browser (`@masonrykit/browser`)**
  - Re-exports core.
  - `observeElementWidth(el, cb)` — `ResizeObserver` wrapper coalesced via `requestAnimationFrame`.
  - `createMeasuredHeightTracker` — per-cell `ResizeObserver` aggregator for measured cells; filters spurious 0-height reports.
  - `startViewTransition(callback)` — safe wrapper around `document.startViewTransition` with a synchronous fallback.

  **React (`@masonrykit/react`)**
  - Headless `useMasonry(cells, options)` hook with prop-getters: spread `getGridProps(...)` on any grid element and `getCellProps(cell, ...)` on any cell element.
  - Positioning uses the CSS `translate` property so user `transform: scale(...)` / `rotate(...)` compose cleanly.
  - `stableCells` preserves DOM-node identity across shuffles; `visibleCells` supports virtualization.
  - Features:
    - `measuredCell` — content-height cells auto-measured via `ResizeObserver`.
    - `breakpoints` — responsive `columnWidth` / `gap` at configurable `minWidth` thresholds.
    - `initialGridWidth` — SSR-safe seed width for hydration before `ResizeObserver` fires.
    - `animate` + `startViewTransition` helper — View Transitions API integration with graceful fallback (pair with `flushSync` in React).
    - `virtualize` — opt-in viewport filtering with `overscan` and configurable `scrollParent`.
  - Re-exports every core/browser API so consumers can import from a single entry.
  - Compile-time type tests via `expect-type` / Vitest typecheck mode.

### Patch Changes

- Updated dependencies [[`e8140b2`](https://github.com/masonrykit/masonrykit/commit/e8140b2dba496fb2c96a8fd676972e61ceba62f3)]:
  - @masonrykit/core@0.1.0
