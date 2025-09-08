# @masonrykit/react

React bindings for MasonryKit focused on a “writer-based” API:
- You provide the data and a render function for each cell.
- The library computes a layout and calls your style writers to set CSS properties/variables.
- No preset class names or CSS variable names are required (we include a small helper that writes `--mk-cell-*` vars for convenience).

- Computes layouts with `@masonrykit/core` (via `@masonrykit/browser`)
- Observes grid width on the client (or accept a fixed width)
- Zero default markup/styling; you own the DOM and CSS
- Ships ESM + CJS + TypeScript types

## Install

```bash
pnpm add @masonrykit/react react react-dom
```

(optional) If you need to use the math/helpers directly:
```bash
pnpm add @masonrykit/browser
```

## Quick start

This example uses:
- `Masonry` component to render the grid and apply cell/grid styles
- `cssVarWriter()` to set `--mk-cell-*` CSS variables that you can consume in your CSS
- A small `gridClassName` and `cellClassName` that read those variables

```tsx
import { Masonry, cssVarWriter } from '@masonrykit/react'

type Photo = {
  id: string
  src: string
}

const cells = [
  { id: 'a', height: 100, meta: { src: '/a.jpg' } },
  { id: 'b', aspectRatio: 1, meta: { src: '/b.jpg' } },
  { id: 'c', height: 50, meta: { src: '/c.jpg' } },
] as const

export function Gallery() {
  return (
    <Masonry<Photo>
      cells={cells}
      // You can pass literal values, CSS vars, or functions (see “Resolvers” below)
      width={800}
      gap={12}
      columnWidth={200}
      horizontalOrder={false}
      // Writer that sets --mk-cell-*
      setCellStyle={cssVarWriter()}
      // Optionally set grid height via CSS var
      setGridStyle={(grid) => ({ ['--mk-grid-height']: `${grid.height}px` })}
      // Your base classes (no defaults injected by the library)
      gridClassName="relative w-full min-h-80"
      cellClassName="absolute"
      // Content rendering
      renderCell={(cell) => <img src={cell.meta.src} alt={cell.id} className="block w-full h-full object-cover" />}
      // Stable keys for wrappers
      keyForCell={(cell, i) => cell.id ?? String(i)}
    />
  )
}
```

CSS ideas to consume `--mk-cell-*` (transform vs inset). You pick one.

Transform-based positioning:
```css
/* Grid wrapper can use the computed height */
.my-grid {
  height: var(--mk-grid-height);
  position: relative; /* you provide base styles */
}

/* Cell wrappers read CSS variables and apply transforms */
.my-cell {
  position: absolute;
  width: var(--mk-cell-width);
  height: var(--mk-cell-height);
  left: 0; top: 0;
  transform: translate3d(var(--mk-cell-x), var(--mk-cell-y), 0);
  transition: transform var(--mk-app-transition-duration, 220ms) var(--mk-app-transition-easing, ease),
              width var(--mk-app-transition-duration, 220ms) var(--mk-app-transition-easing, ease),
              height var(--mk-app-transition-duration, 220ms) var(--mk-app-transition-easing, ease);
}
```

Inset-based positioning:
```css
.my-cell {
  position: absolute;
  width: var(--mk-cell-width);
  height: var(--mk-cell-height);
  left: var(--mk-cell-x);
  top: var(--mk-cell-y);
  transition: left var(--mk-app-transition-duration, 220ms) var(--mk-app-transition-easing, ease),
              top var(--mk-app-transition-duration, 220ms) var(--mk-app-transition-easing, ease),
              width var(--mk-app-transition-duration, 220ms) var(--mk-app-transition-easing, ease),
              height var(--mk-app-transition-duration, 220ms) var(--mk-app-transition-easing, ease);
}
```

You can toggle between these with a class or variable in your own styles.

## Component API

### Masonry

```ts
export type Resolver<T> =
  | T
  | { cssVar: string; parse?: (raw: string) => T | undefined }
  | ((el: HTMLElement) => T | undefined)

export type MasonryProps<M = unknown> = {
  // Data model
  cells: ReadonlyArray<MasonryCellInput<M>>

  // Inputs (resolvers accept a literal, css var, or function)
  width?: Resolver<number>
  gap?: Resolver<number>
  columnWidth?: Resolver<number>
  horizontalOrder?: Resolver<boolean>

  // Stamps
  stamps?: MasonryStamp[]
  stampsCols?: Array<{ startCol: number; span: number; top: number; height: number }>

  // Writers (return React.CSSProperties style objects)
  setCellStyle: (
    geom: { x: number; y: number; width: number; height: number },
    ctx: { index: number; cell: MasonryCellInput<M>; layout: MasonryLayoutResult<M> },
  ) => React.CSSProperties

  setGridStyle?: (
    grid: MasonryLayoutResult<M>['grid'],
    ctx: { layout: MasonryLayoutResult<M> },
  ) => React.CSSProperties

  // Optional applier to apply a style object (defaults support CSS vars + camel-cased props)
  applyStyle?: (el: HTMLElement, style: React.CSSProperties) => void

  // Rendering
  renderCell: (cell: MasonryCellInput<M>, index: number) => React.ReactNode
  keyForCell?: (cell: MasonryCellInput<M>, index: number) => string

  // Base styling for grid/cell wrappers
  gridClassName?: string
  gridStyle?: React.CSSProperties
  cellClassName?: string
  cellStyle?: React.CSSProperties

  // Additional props for the grid element (merged with gridClassName/gridStyle)
  gridProps?: React.HTMLAttributes<HTMLDivElement>
}
```

Notes:
- “Resolvers” let you provide inputs flexibly:
  - literal number/boolean
  - `{ cssVar: '--your-var', parse?: (raw) => number }`
  - `(el) => number | boolean` reading directly from the grid element
- `stampsCols` is converted internally using resolved columns/gap into pixel-based stamps (merged with `stamps`).
- `setCellStyle` and `setGridStyle` return style objects; we apply them, merged with your `cellStyle`/`gridStyle`.
- If you want total control over style application, pass a custom `applyStyle`.

### cssVarWriter

Helper that sets only `--mk-cell-*` variables so your CSS can consume them:

```ts
import { cssVarWriter } from '@masonrykit/react'

const setCellStyle = cssVarWriter()
// -> returns { '--mk-cell-x': '...', '--mk-cell-y': '...', '--mk-cell-width': '...', '--mk-cell-height': '...' }
```

### MasonryList

A convenience wrapper that maps your domain data to cells and passes the original item via `meta`.

```ts
export type MasonryListProps<T> = {
  data: readonly T[]
  getCell: (item: T, index: number, array: readonly T[]) => {
    id?: string
    height?: number
    aspectRatio?: number
    columnSpan?: number
  }
  renderCell: (item: T, index: number) => React.ReactNode
  keyForItem?: (item: T, index: number) => string
} & Omit<MasonryProps<T>, 'cells' | 'renderCell' | 'keyForCell'>
```

Usage:

```tsx
import { MasonryList, cssVarWriter } from '@masonrykit/react'

type Post = { id: string; src: string; kind: 'photo' | 'text' }

<MasonryList<Post>
  data={posts}
  getCell={(p, i) => ({
    id: p.id,
    columnSpan: i % 10 === 0 ? 2 : 1,
    ...(p.kind === 'photo' ? { aspectRatio: 4 / 3 } : { height: 120 }),
  })}
  renderCell={(p) => (p.kind === 'photo' ? <img src={p.src} /> : <div>{p.id}</div>)}
  keyForItem={(p) => p.id}
  width={{ cssVar: '--grid-w', parse: parseFloat }}
  gap={12}
  columnWidth={220}
  setCellStyle={cssVarWriter()}
  gridClassName="relative"
  cellClassName="absolute"
/>
```

## Hook API

### useMasonry

Compute a layout without rendering. You supply your own DOM/React wrappers.

```ts
export function useMasonry<M>(
  cells: readonly MasonryCellInput<M>[],
  options: {
    width: Resolver<number> | undefined
    gap: Resolver<number> | undefined
    columnWidth: Resolver<number> | undefined
    horizontalOrder: Resolver<boolean> | undefined
    stamps: MasonryStamp[] | undefined
    stampsCols: Array<{ startCol: number; span: number; top: number; height: number }> | undefined
  },
): {
  ref: React.RefObject<HTMLDivElement | null> // attach to grid to measure width when needed
  width: number                               // measured or literal width
  layout: MasonryLayoutResult<M>
}
```

Example:

```tsx
import { useMasonry } from '@masonrykit/react'

function BareMasonry({ cells }: { cells: readonly MasonryCellInput<unknown>[] }) {
  const { ref, layout } = useMasonry(cells, {
    width: 800, // literal -> no measuring
    gap: 12,
    columnWidth: 200,
    horizontalOrder: false,
    stamps: undefined,
    stampsCols: undefined,
  })

  // ...create/update DOM using `layout` and your own style writers
  return <div ref={ref} />
}
```

## Resolvers

Every layout input supports “resolvers”:
- literal `number | boolean`
- CSS var resolver: `{ cssVar: '--my-gap', parse?: (raw) => number }`
- function resolver: `(el: HTMLElement) => number | boolean | undefined`

We call resolvers against the grid element (when measuring). If you pass a literal `width`, we don’t measure the grid and compute immediately.

## Stamps (and stampsCols)

- `stamps`: pixel rectangles `{ x, y, width, height }` that pre-occupy space (their bottom raises baseline for any overlapped columns).
- `stampsCols`: column-aligned stamps `{ startCol, span, top, height }` converted to px using resolved `columnWidth`/`gap`.

## SSR / Effects

- DOM reads/writes only occur in effects. We use an isomorphic layout effect (layout effect in the browser, regular effect elsewhere) to avoid SSR warnings.
- If you want the very first paint to use a “guess” width (without measuring), pass a literal `width` for the initial render.

## Notes

- Heights are taken from `cell.height`, or derived from `columnWidth / aspectRatio` when `aspectRatio` is provided.
- Placement defaults to classic “shortest column” (spans supported); set `horizontalOrder` to true for row-wise.
- Rounding is applied to avoid sub-pixel jitter.

## Types

Useful types re-exported from `@masonrykit/browser`/`@masonrykit/core` in this package’s types:
- `MasonryCellInput<M>`
- `MasonryLayoutResult<M>`
- `MasonryStamp`

This package also exports:
- `Resolver<T>`
- `MasonryProps<M>`
- `MasonryListProps<T>`

## Scripts

```bash
# From repo root
pnpm build      # builds all packages
pnpm dev        # dev (watch)
pnpm test       # tests
pnpm lint       # eslint
pnpm typecheck  # tsc
```

## License

MIT