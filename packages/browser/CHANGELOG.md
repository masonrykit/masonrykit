# @masonrykit/browser

## 0.2.0

### Minor Changes

- [#7](https://github.com/masonrykit/masonrykit/pull/7) [`0e2c67a`](https://github.com/masonrykit/masonrykit/commit/0e2c67a5237b7a4e96af419c3c6d72966e80be14) Thanks [@lifeiscontent](https://github.com/lifeiscontent)! - feat!: single primitive API — the library exposes refs + raw layout data, nothing else

  ### What changed

  `@masonrykit/react` drops the prop-getters and the `animate` option entirely. `useMasonry` now returns one shape:

  ```ts
  const { layout, stableCells, visibleCells, gridRef, cellRef, measuredIds } = useMasonry(
    cells,
    options,
  )
  ```

  - `gridRef` — wire to the grid element for auto-width observation.
  - `cellRef(id)` — wire per cell. Attaches the measured-cell `ResizeObserver` when the cell is a `measuredCell`; no-op otherwise. Safe to spread unconditionally.
  - `layout`, `stableCells`, `visibleCells` — the raw numbers. Width, height, x, y, column, span. You decide what to do with them.
  - `measuredIds` — set of ids whose input was `measuredCell`. `LayoutCell` doesn't carry the origin type, so branch on `measuredIds.has(cell.id)` to toggle `height: auto` vs `cell.height` on the wrapper.

  The patterns `getGridProps` / `getCellProps` used to bundle in 0.1.x — the `--mk-*` CSS var naming, the `view-transition-name: mk-<id>` convention, the merged ref composition — are now lines in your component where they're inspectable and customizable. The recommended shape is to pipe the layout values through inline CSS custom properties and consume them in a stylesheet (or Tailwind 4 `translate-x-(--x)` / `w-(--w)` shorthand). That keeps the className / CSS selector stable across renders and lets the resulting `translate` updates ride the compositor lane instead of triggering style recalc on the main thread.

  ### Migration

  Before (0.1.x):

  ```tsx
  const { stableCells, getGridProps, getCellProps } = useMasonry(cells, {
    columnWidth: 240,
    animate: true,
  })

  return (
    <div {...getGridProps({ className: 'grid' })}>
      {stableCells.map((cell) => (
        <div key={cell.id} {...getCellProps(cell)} />
      ))}
    </div>
  )
  ```

  After (0.2.0):

  ```tsx
  const { stableCells, gridRef, cellRef, measuredIds, layout } = useMasonry(cells, {
    columnWidth: 240,
  })

  return (
    <div
      ref={gridRef}
      className="grid"
      data-animate={animating ? 'true' : undefined}
      style={{ '--grid-h': `${layout.height}px` } as React.CSSProperties}
    >
      {stableCells.map((cell) => (
        <div
          key={cell.id}
          ref={cellRef(cell.id)}
          className="cell"
          style={
            {
              '--x': `${cell.x}px`,
              '--y': `${cell.y}px`,
              '--w': `${cell.width}px`,
              '--h': measuredIds.has(cell.id) ? null : `${cell.height}px`,
              '--vt-name': animating ? `mk-${cell.id}` : null,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
  ```

  ```css
  .grid {
    position: relative;
    height: var(--grid-h);
  }
  .cell {
    position: absolute;
    top: 0;
    left: 0;
    width: var(--w);
    height: var(--h, auto);
    translate: var(--x) var(--y);
    view-transition-name: var(--vt-name);
    transition: translate 300ms ease-out;
  }
  .grid[data-animate='true'] .cell {
    transition: none;
  }
  ```

  The new component is more code, but it's **your** code — inspectable, customizable, and free of library-specific conventions. Pick `transform` or `translate`, inline styles or CSS vars, `position: absolute` or CSS Grid; the hook is indifferent. The var names are yours to pick.

  ### Why

  The 0.1.x getters conflated two concerns — the ref wiring (which consumers can't easily rebuild) and an opinionated `--mk-*` CSS var naming (which they absolutely can). This made the library hard to customize and easy to feel boxed in by. A single primitive API — refs + data — matches the shape of `@masonrykit/browser`, where layout math and DOM side-effects have always been separate.

  ### Core + browser
  - `@masonrykit/core` is unchanged at the type/function level. The README describes the shared philosophy.
  - `@masonrykit/browser` is unchanged at the function level. The README now leads with the CSS-var pattern and lists inline-style as the simpler alternative.

  Both packages ship as a minor bump so the three packages stay on matching versions; no code changes are required for consumers of core / browser.

### Patch Changes

- Updated dependencies [[`0e2c67a`](https://github.com/masonrykit/masonrykit/commit/0e2c67a5237b7a4e96af419c3c6d72966e80be14)]:
  - @masonrykit/core@0.2.0

## 0.1.1

### Patch Changes

- [#4](https://github.com/masonrykit/masonrykit/pull/4) [`df19b72`](https://github.com/masonrykit/masonrykit/commit/df19b72aaa069086c606fcf65d915b0aac007540) Thanks [@lifeiscontent](https://github.com/lifeiscontent)! - Add npm version, bundle-size, and MIT license badges to each package README so consumers landing on npmjs.com can see the current version and size at a glance. Also fix a stale hardcoded pnpm version in the root README badge.

- Updated dependencies [[`df19b72`](https://github.com/masonrykit/masonrykit/commit/df19b72aaa069086c606fcf65d915b0aac007540)]:
  - @masonrykit/core@0.1.1

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
