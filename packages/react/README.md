# @masonrykit/react

[![npm](https://img.shields.io/npm/v/@masonrykit/react.svg)](https://www.npmjs.com/package/@masonrykit/react)
[![bundle size](https://img.shields.io/bundlejs/size/@masonrykit/react)](https://bundlejs.com/?q=@masonrykit/react)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Headless React bindings for MasonryKit. The hook provides positioning via inline styles and CSS custom properties; you provide the elements, classes, styles, refs, event handlers, and ARIA.

## Install

```bash
npm install @masonrykit/react react react-dom
```

## Quick start

```tsx
import { useMasonry, heightCell, aspectCell } from '@masonrykit/react'

const cells = [heightCell('1', 200), aspectCell('2', 16 / 9), heightCell('3', 150)]

export function Gallery() {
  const { stableCells, getGridProps, getCellProps } = useMasonry(cells, {
    columnWidth: 240,
    gap: 16,
  })

  return (
    <section {...getGridProps({ 'aria-label': 'Photos' })}>
      {stableCells.map((cell) => (
        <article key={cell.id} {...getCellProps(cell)}>
          Content for {cell.id}
        </article>
      ))}
    </section>
  )
}
```

You choose the elements (`section`, `article`, `ul`/`li`, `div`, whatever). The library only handles positioning.

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
  getGridProps: <P>(userProps?: P) => P & { ref; style }
  getCellProps: <P>(cell: LayoutCell<M>, userProps?: P) => P & { ref; style }
}
```

- **`layout`** — full computed layout (cells in input order, width, height, columns).
- **`stableCells`** — all cells in stable DOM order across shuffles; renders the same node for a given `id` before and after `cells` is reordered.
- **`visibleCells`** — cells to paint. Equals `stableCells` when `virtualize` is off, otherwise filtered to the scroll viewport (± overscan).
- **`getGridProps(userProps?)`** — spread onto the grid element. Adds `ref` and positioning `style` (merged with your props).
- **`getCellProps(cell, userProps?)`** — spread per cell. Adds `ref` (composed with yours; wired to a `ResizeObserver` for measured cells) and positioning `style`.

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
  animate?: boolean // View Transitions integration
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

For user-generated content where you don't know the height up-front. The library attaches a `ResizeObserver` to the cell and reflows when the content's measured height changes. `estimatedHeight` is used for the first paint to avoid visible jumps:

```tsx
measuredCell('note-1', { estimatedHeight: 200, meta: note })
```

The library does **not** set an explicit `height` on the measured cell's wrapper — the content's intrinsic height drives the box.

## What the getters put on your elements

**Grid** (`getGridProps`):

| Key                 | Value                     |
| ------------------- | ------------------------- |
| `position`          | `relative`                |
| `height`            | `layout.height` (px)      |
| `--mk-grid-width`   | `${layout.width}px`       |
| `--mk-grid-height`  | `${layout.height}px`      |
| `--mk-grid-columns` | `${layout.columns.count}` |

**Cell** (`getCellProps`):

| Key                    | Value                                           |
| ---------------------- | ----------------------------------------------- |
| `position`             | `absolute`                                      |
| `top` / `left`         | `0`                                             |
| `width`                | `cell.width` (px)                               |
| `height`               | `cell.height` (px) — omitted for measured cells |
| `translate`            | `${cell.x}px ${cell.y}px`                       |
| `view-transition-name` | `mk-${cell.id}` — only when `animate: true`     |
| `--mk-cell-*`          | `x`, `y`, `width`, `height`, `column`           |

Positioning uses the CSS `translate` property (not `transform: translate(...)`) so `transform: scale(...)` / `rotate(...)` compose cleanly.

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

## Animation (`animate` + `startViewTransition`)

Opt-in integration with the [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API):

```tsx
import { flushSync } from 'react-dom'
import { useMasonry, startViewTransition } from '@masonrykit/react'

function Gallery() {
  const [cells, setCells] = useState(initial)
  const { stableCells, getGridProps, getCellProps } = useMasonry(cells, {
    columnWidth: 240,
    gap: 16,
    animate: true, // sets view-transition-name on each cell
  })

  const shuffle = () => {
    // flushSync forces React to commit the DOM update *inside* the
    // transition callback. Without it, React's async batching would let
    // the browser capture identical before/after snapshots and no
    // animation would run.
    startViewTransition(() => {
      flushSync(() => setCells(shuffleArray(cells)))
    })
  }

  return ( /* ... */ )
}
```

`startViewTransition` is a safe wrapper: it uses `document.startViewTransition` where available and falls back to a synchronous call in browsers without support (Firefox today, older Safari).

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
<div {...getGridProps()}>
  {visibleCells.map((cell) => (
    <div key={cell.id} {...getCellProps(cell)}>
      …
    </div>
  ))}
</div>
```

Options:

- `overscan` — pixels outside the viewport to pre-render (default 200).
- `scrollParent` — the scrolling ancestor when the grid is inside an `overflow: auto/scroll` container. Defaults to the window.

The grid element's height is still `layout.height`, so the scrollbar represents the full content.

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

const { stableCells, getGridProps, getCellProps } = useMasonry<Photo>(cells, { columnWidth: 250 })

return (
  <div {...getGridProps()}>
    {stableCells.map((cell) => (
      <img key={cell.id} {...getCellProps(cell)} src={cell.meta.src} alt={cell.meta.alt} />
    ))}
  </div>
)
```

Because `Cell<Photo>` makes `meta` required, `cell.meta.src` type-checks with no non-null assertion.

## Styling

The library ships no CSS. Use anything:

**Tailwind:**

```tsx
<section {...getGridProps({ className: 'bg-white/5 rounded-xl p-6' })}>
  {stableCells.map((cell) => (
    <article
      key={cell.id}
      {...getCellProps(cell, {
        className: 'rounded-lg shadow transition-[translate] duration-300',
      })}
    >
      …
    </article>
  ))}
</section>
```

**CSS:**

```css
.cell {
  transition: translate 300ms ease;
}
.cell:hover {
  transform: scale(1.02);
} /* composes cleanly with translate */
```

## Browser support

This library targets modern evergreen browsers.

| Feature                 | Required                                                        |
| ----------------------- | --------------------------------------------------------------- |
| Core positioning        | Chrome 104+, Safari 14.1+, Firefox 72+ (CSS `translate` prop)   |
| Auto-measured width     | Everywhere `ResizeObserver` is available (~2020+)               |
| Measured cells          | Same as above                                                   |
| `animate` (transitions) | Chrome 111+ / Edge 111+ / Safari 18+. No-op fallback elsewhere. |
| Virtualization          | Everywhere scroll events fire.                                  |

## What's not in 1.0

- **Focus / keyboard navigation helpers** — use your own semantics; library is headless.
- **Drag and drop** — compose with `@dnd-kit` or similar.
- **Infinite scroll** — compose with `IntersectionObserver` on a sentinel cell.

## License

MIT
