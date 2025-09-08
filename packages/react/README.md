# @masonrykit/react

React components and hooks for rendering Masonry-style grid layouts. Built on top of the framework‑agnostic `@masonrykit/core` utilities.

- Measures the grid’s width via `ResizeObserver`
- Emits no default classes or data attributes — you control markup and CSS
- Style via CSS variables using lightweight adapter callbacks
- Ships ESM + CJS + TypeScript types

## Install

```bash
pnpm add @masonrykit/react react react-dom
```

Optional (to use the underlying math functions directly as well):

```bash
pnpm add @masonrykit/core
```

## Quick start (exact markup + CSS variables)

`Masonry` computes the layout and gives you two adapters to set CSS custom properties:
- `setStyle` for grid-level variables (e.g. `--mk-grid-h`)
- `setCellStyle` for per-cell variables (e.g. `--mk-cell-x/y/w/h`)

You control the classes and inner markup 100% (no defaults are injected).



## useMasonry hook

If you’d like to fully control the markup, use the hook and position cells yourself.



## API (simplified)

The component and hook are thin wrappers around the core utilities from `@masonrykit/core`.

- `Masonry` props
  - `items: readonly { id?: string; height?: number; aspectRatio?: number; meta?: unknown }[]`
  - `render: (item, index, pos) => React.ReactNode`
  - `gap?: number`
  - `columnWidth?: number`
  - `horizontalOrder?: boolean` — row‑wise placement when true (default: false shortest‑column)
  - `as?: React.ElementType` — grid element/component (default: `'div'`)
  - `itemAs?: React.ElementType` — wrapper element for each item (default: `'div'`)
  - `className?: string` — applied to the grid
  - `style?: React.CSSProperties` — applied to the grid
  - `cellClassName?: string | (item, index) => string | undefined`
  - `cellStyle?: React.CSSProperties | (item, index) => React.CSSProperties | undefined`
  - `setStyle?: (set, { layout }) => void` — set CSS vars at the grid level (`set('--mk-grid-h', '...')`)
  - `setCellStyle?: (set, { pos, item }) => void` — set CSS vars per cell (`set('--mk-cell-x', '...')`)
  - `after?: React.ReactNode | (layout) => React.ReactNode` — optional trailing content inside the grid

- `useMasonry(items, options)` returns
  - `ref: React.RefObject<HTMLElement>` — attach to a grid to measure width via `ResizeObserver`
  - `width: number` — measured width
  - `layout: MasonryLayoutResult` — computed layout (positions/sizes/grid info)

Types re-exported from `@masonrykit/core`:
- `MasonryLayoutItem`, `MasonryLayoutResult`

## Scripts

This package uses `tsdown` for bundling and `vitest` for tests.

```bash
# From the repo root:
pnpm build      # builds all packages
pnpm dev        # watch-mode build
pnpm test       # run tests

# From this package directory:
pnpm run build  # tsdown build (browser platform)
pnpm run dev    # tsdown watch (browser platform)
pnpm run test   # vitest
pnpm run lint   # eslint

```



## Notes

- Heights are taken from `item.height`, or derived from `columnWidth / aspectRatio` when `aspectRatio` is provided.
- Placement is either shortest‑column (default) or row‑wise when `horizontalOrder` is true.
- You fully control classes and styling; use `setStyle`/`setCellStyle` to set CSS variables consumed by your styles.

## License

MIT