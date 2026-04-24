# @masonrykit/react

[![npm](https://img.shields.io/npm/v/@masonrykit/react.svg)](https://www.npmjs.com/package/@masonrykit/react)
[![bundle size](https://img.shields.io/bundlejs/size/@masonrykit/react)](https://bundlejs.com/?q=@masonrykit/react)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Truly headless React bindings for MasonryKit. The hook gives you two things consumers can't easily rebuild themselves — ref wiring for the DOM observers, and the raw layout data — and stays out of every other decision. Elements, classes, inline styles, CSS var naming, positioning strategy, animation coordination: all yours.

## Install

```bash
npm install @masonrykit/react react react-dom
```

## Quick start

**The recommended pattern is to pipe the dynamic layout values through CSS custom properties** and consume them in a stylesheet (or Tailwind utilities). This is faster than setting `transform` / `width` inline per render — the className / CSS selector never changes, so the browser doesn't re-resolve selectors each frame, and the resulting `transform` changes ride the compositor instead of triggering style recalc on the main thread.

```tsx
import { useMasonry, heightCell, aspectCell } from '@masonrykit/react'

const cells = [heightCell('1', 200), aspectCell('2', 16 / 9), heightCell('3', 150)]

export function Gallery() {
  const { stableCells, gridRef, cellRef, measuredIds, layout } = useMasonry(cells, {
    columnWidth: 240,
    gap: 16,
  })

  return (
    <section
      ref={gridRef}
      aria-label="Photos"
      className="gallery"
      style={{ '--grid-h': `${layout.height}px` } as React.CSSProperties}
    >
      {stableCells.map((cell) => (
        <article
          key={cell.id}
          ref={cellRef(cell.id)}
          className="cell"
          style={
            {
              '--x': `${cell.x}px`,
              '--y': `${cell.y}px`,
              '--w': `${cell.width}px`,
              // `null` tells React to omit the property — so `--h` stays
              // unset for measured cells and the `var(--h, auto)` fallback
              // in the stylesheet kicks in to let content drive the box.
              '--h': measuredIds.has(cell.id) ? null : `${cell.height}px`,
            } as React.CSSProperties
          }
        >
          Content for {cell.id}
        </article>
      ))}
    </section>
  )
}
```

```css
.gallery {
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
}
```

The var names are your choice — the hook doesn't emit them. If you prefer Tailwind utilities to a separate stylesheet, Tailwind 4 supports the same pattern via `translate-x-(--x)` / `w-(--w)` / `h-(--h)` shorthand (see the "Tailwind" section below).

## API

### `useMasonry(cells, options)`

```ts
function useMasonry<M>(
  cells: readonly Cell<M>[],
  options?: MasonryOptions,
): {
  layout: Layout<M>
  stableCells: readonly LayoutCell<M>[]
  visibleCells: readonly LayoutCell<M>[]
  gridRef: React.RefCallback<HTMLElement>
  cellRef: (id: string) => React.RefCallback<HTMLElement>
  measuredIds: ReadonlySet<string>
}
```

**Layout data** — read these to decide what to render and what inline styles (or CSS vars, or data-attributes) to emit:

- **`layout`** — full computed layout (cells in input order, width, height, columns).
- **`stableCells`** — all cells in stable DOM order across shuffles; renders the same React node for a given `id` before and after `cells` is reordered.
- **`visibleCells`** — cells to paint. Equals `stableCells` when `virtualize` is off, otherwise filtered to the scroll viewport (± overscan).
- **`measuredIds`** — the set of ids whose input was a `measuredCell`. `LayoutCell` itself doesn't carry the origin type, so use this set to branch between "let content drive the height" (`measuredIds.has(cell.id)`) and "pin to `cell.height`" in your render.

**Ref wiring** — attach these so the hook's internal observers reach the DOM:

- **`gridRef`** — attach to the grid element so the hook can auto-measure width via `ResizeObserver`. Stable across renders. No-op when you supply an explicit `gridWidth`.
- **`cellRef(id)`** — returns a ref callback for the cell with that id. For `measuredCell` inputs, attaches a `ResizeObserver` so the layout reflows when content height changes. For `heightCell` / `aspectCell`, returns a shared no-op — safe to spread on every cell unconditionally. Function identity is stable per id across renders, so React doesn't re-run attach/detach cycles.

That's the entire surface. Elements, class names, inline styles, CSS var naming, animation coordination — all yours.

### Options

```ts
type MasonryOptions = {
  gap?: number
  columnWidth?: number
  gridWidth?: number // omit to auto-measure via ResizeObserver
  initialGridWidth?: number // first-paint width for SSR / hydration
  breakpoints?: Breakpoint[] // responsive columnWidth / gap
  horizontalOrder?: boolean
  stamps?: Stamp[]
  columnStamps?: ColumnStamp[]
  virtualize?: boolean | { overscan?: number; scrollParent?: HTMLElement | null }
}

type Breakpoint = { minWidth: number; columnWidth?: number; gap?: number }
```

### Cell factories

```ts
heightCell(id, height, options?:   { columnSpan?; meta? }): HeightCell<M>
aspectCell(id, ratio,  options?:   { columnSpan?; meta? }): AspectCell<M>
measuredCell(id,       options?:   { columnSpan?; meta?; estimatedHeight? }): MeasuredCell<M>
```

## Cell types

### `heightCell` — known height

```tsx
heightCell('post-1', 320, { meta: post })
```

### `aspectCell` — known aspect ratio

Height is derived at layout time as `columnWidth / aspectRatio`. Use for images with known intrinsic dimensions:

```tsx
aspectCell('photo-1', photo.width / photo.height, { meta: photo })
```

### `measuredCell` — height discovered from the DOM

For user-generated content where you don't know the height up-front. The hook attaches a `ResizeObserver` (via `cellRef(id)`) and reflows when the content's measured height changes. `estimatedHeight` seeds the first paint so the layout doesn't jump visibly when the real height lands:

```tsx
measuredCell('note-1', { estimatedHeight: 200, meta: note })
```

Set `height` to `auto` on the wrapper for measured cells so their content drives the box — e.g. `height: measuredIds.has(cell.id) ? 'auto' : cell.height` for inline styles, or leave the `--h` var unset with a `var(--h, auto)` fallback if you're using the CSS-var pattern.

## Why CSS custom properties?

There are two shapes the dynamic values could take: **inline CSS custom properties** (recommended) or **inline typed styles**.

```tsx
// Recommended — values flow through CSS vars, consumed by stylesheet rules.
style={{ '--x': `${cell.x}px`, '--y': `${cell.y}px`, /* … */ } as React.CSSProperties}
```

```tsx
// Alternative — typed properties set inline every render.
style={{ transform: `translate(${cell.x}px, ${cell.y}px)`, /* … */ }}
```

**Why the CSS-var pattern is usually better:**

1. **Compositor-friendly animation.** When `--x` / `--y` change, the browser re-resolves `translate: var(--x) var(--y)` in the matching CSS rule and hands the updated `transform` straight to the compositor — no main-thread paint. The second pattern mutates the inline style string every frame, which forces a full style invalidation even if only the transform changed.
2. **Stable className surface.** Because the className never changes per render, the browser's selector matching and rule resolution are cached. React's reconciler also has less work — the `style` object on a cell varies in values, not keys.
3. **Theme + responsive composition.** A stylesheet can override `--x` in a media query, under a `data-*` attribute, or via a variant class. The hook hands you data; your CSS decides the shape. With inline `transform`, every behavioural branch has to live in JS.

The demos in this repo use the CSS-var pattern with Tailwind 4's `translate-x-(--x)` / `w-(--w)` / `h-(--h)` shorthand utilities, but the same approach works with plain CSS or CSS Modules.

## What a typical grid looks like

### Option 1: CSS vars + stylesheet (recommended)

```tsx
function Grid({ cells }) {
  const { stableCells, gridRef, cellRef, measuredIds, layout } = useMasonry(cells, {
    columnWidth: 200,
    gap: 12,
  })

  return (
    <div
      ref={gridRef}
      className="grid"
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
            } as React.CSSProperties
          }
        >
          {/* your cell content */}
        </div>
      ))}
    </div>
  )
}
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
}
```

### Option 2: Tailwind 4 utilities consuming the vars

Tailwind 4's `(--var)` shorthand reads custom properties directly — no separate stylesheet needed:

```tsx
<div
  ref={cellRef(cell.id)}
  className="absolute top-0 left-0 w-(--w) h-(--h) translate-x-(--x) translate-y-(--y) transition-transform"
  style={
    {
      '--x': `${cell.x}px`,
      '--y': `${cell.y}px`,
      '--w': `${cell.width}px`,
      '--h': measuredIds.has(cell.id) ? null : `${cell.height}px`,
    } as React.CSSProperties
  }
/>
```

When `--h` is unset (measured cells), `h-(--h)` resolves to the property's initial value (`auto`) — same behaviour as the `var(--h, auto)` fallback in the plain-CSS version.

### Option 3: Inline typed styles (simplest, slowest under high churn)

For small grids or one-off demos, inline typed styles are fine:

```tsx
<div
  ref={cellRef(cell.id)}
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: cell.width,
    height: measuredIds.has(cell.id) ? 'auto' : cell.height,
    transform: `translate(${cell.x}px, ${cell.y}px)`,
  }}
/>
```

Reach for Option 1 or 2 once you're animating dozens of cells at 60 fps.

## Responsive layouts (`breakpoints`)

```tsx
useMasonry(cells, {
  breakpoints: [
    { minWidth: 0, columnWidth: 160, gap: 8 },
    { minWidth: 768, columnWidth: 220, gap: 12 },
    { minWidth: 1280, columnWidth: 280, gap: 16 },
  ],
})
```

The entry with the largest `minWidth <= gridWidth` wins. Unset fields on the matching entry fall through to the top-level `columnWidth` / `gap`.

## SSR (`initialGridWidth`)

Use when you auto-measure (omit `gridWidth`) but need the server and first client render to produce identical output for hydration:

```tsx
useMasonry(cells, { columnWidth: 200, initialGridWidth: 1024 })
```

The server renders with `initialGridWidth`. After mount, `ResizeObserver` reports the real container width and the layout reflows automatically.

## Animation (`startViewTransition`)

`startViewTransition` is a safe wrapper around `document.startViewTransition` — it runs inside the browser's transition scheduler where available, and falls back to a synchronous call in browsers without support (Firefox today, older Safari).

To animate a shuffle:

```tsx
import { flushSync } from 'react-dom'
import { useMasonry, startViewTransition } from '@masonrykit/react'

function Gallery() {
  const [cells, setCells] = useState(initial)
  const { stableCells, gridRef, cellRef, measuredIds, layout } = useMasonry(cells, {
    columnWidth: 240,
    gap: 16,
  })

  const [animate, setAnimate] = useState(false)

  const shuffle = () => {
    // flushSync forces React to commit the DOM update *inside* the
    // transition callback. Without it, React's async batching would let
    // the browser capture identical before/after snapshots and no
    // animation would run.
    startViewTransition(() => {
      flushSync(() => {
        setAnimate(true)
        setCells(shuffleArray(cells))
      })
    })
  }

  return (
    <div
      ref={gridRef}
      className="grid"
      // Suppress the CSS `translate` transition while VT owns the motion.
      // See the `.grid[data-animate='true'] .cell` rule below.
      data-animate={animate ? 'true' : undefined}
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
              // `--vt-name` is the per-cell handle View Transitions use to
              // pair before/after snapshots. Set it only while animating —
              // a permanently-named cell forces VT scaffolding on every
              // render and tanks perf.
              '--vt-name': animate ? `mk-${cell.id}` : null,
            } as React.CSSProperties
          }
        >
          …
        </div>
      ))}
    </div>
  )
}
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
  /* Smooth motion when View Transitions are off. */
  transition: translate 300ms ease-out;
}
.grid[data-animate='true'] .cell {
  /* VT owns the motion — kill the CSS transition to avoid double-animating. */
  transition: none;
}
```

Cell ids must be CSS-custom-ident-compatible (letters / digits / hyphens / underscores, not starting with a digit). Most real-world ids qualify.

## Virtualization

Render only cells that intersect the scroll viewport:

```tsx
useMasonry(cells, {
  columnWidth: 240,
  gap: 12,
  virtualize: { overscan: 400 }, // or just `true` for defaults
})
```

Then render `visibleCells` instead of `stableCells`:

```tsx
<div
  ref={gridRef}
  className="grid"
  style={{ '--grid-h': `${layout.height}px` } as React.CSSProperties}
>
  {visibleCells.map((cell) => (
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
        } as React.CSSProperties
      }
    />
  ))}
</div>
```

Options:

- `overscan` — pixels outside the viewport to pre-render (default 200).
- `scrollParent` — the scrolling ancestor when the grid is inside an `overflow: auto/scroll` container. Defaults to the window.

The grid element's height is still `layout.height`, so the scrollbar represents the full content. Measured cells outside the viewport are always rendered so their `ResizeObserver` can fire before the user scrolls to them (no visible layout shift on arrival).

## Multi-span

```tsx
heightCell('hero', 300, { columnSpan: 2 })
```

Oversized spans are clamped to the current column count.

## Stamps

Reserve rectangular regions that cells flow around:

```tsx
useMasonry(cells, {
  columnStamps: [{ column: 0, span: 2, y: 0, height: 60 }],
  // or pixel-aligned:
  stamps: [{ x: 0, y: 0, width: 400, height: 60 }],
})
```

## Typed metadata

```tsx
interface Photo {
  src: string
  alt: string
}

const cells: Cell<Photo>[] = [heightCell('1', 200, { meta: { src: '/a.jpg', alt: 'A' } })]

const { stableCells, gridRef, cellRef, measuredIds, layout } = useMasonry<Photo>(cells, {
  columnWidth: 250,
})

return (
  <div
    ref={gridRef}
    className="grid"
    style={{ '--grid-h': `${layout.height}px` } as React.CSSProperties}
  >
    {stableCells.map((cell) => (
      <img
        key={cell.id}
        ref={cellRef(cell.id)}
        src={cell.meta.src}
        alt={cell.meta.alt}
        className="cell"
        style={
          {
            '--x': `${cell.x}px`,
            '--y': `${cell.y}px`,
            '--w': `${cell.width}px`,
            '--h': `${cell.height}px`,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
)
```

Because `Cell<Photo>` makes `meta` required, `cell.meta.src` type-checks with no non-null assertion.

## Migration from 0.1.x

`@masonrykit/react` 0.2.0 removes the prop-getters (`getGridProps` / `getCellProps`) and the `animate` option. The 0.1.x API bundled two patterns — opinionated CSS var naming and the View-Transitions name convention — inside helpers you couldn't customize. 0.2.0 hands you the raw pieces directly instead.

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

Everything `getCellProps` did in 0.1.x is now declarative CSS plus a handful of inline var assignments. No behaviour is lost — the observer wiring moves from the getter's merged ref to `cellRef(cell.id)`. The var names are yours to pick.

## Browser support

This library targets modern evergreen browsers.

| Feature                                   | Required                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Core hook                                 | Anywhere React + `ResizeObserver` are available (~2020+)                           |
| `transform` / `translate` for positioning | Chrome 104+, Safari 14.1+, Firefox 72+ (both work everywhere React runs; pick one) |
| Measured cells                            | Same as above (`ResizeObserver`)                                                   |
| View Transitions                          | Chrome 111+ / Edge 111+ / Safari 18+. `startViewTransition` no-ops elsewhere.      |
| Virtualization                            | Everywhere scroll events fire.                                                     |

## What's not in 1.0

- **Focus / keyboard navigation helpers** — use your own semantics; library is headless.
- **Drag and drop** — compose with `@dnd-kit` or similar.
- **Infinite scroll** — compose with `IntersectionObserver` on a sentinel cell.

## License

MIT
