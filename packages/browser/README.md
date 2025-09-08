# @masonrykit/browser

Lightweight, framework-agnostic utilities to compute Masonry-style grid layouts in the browser.

- Re-exports core math from `@masonrykit/core` (multi-span items, stamps, gaps, rounding)
- Includes `observeElementWidth` for browser width observation (SSR-safe no-op outside browser)
- Pure, deterministic layout math with no DOM reads; ships ESM + CJS + types

## Install

```bash
pnpm add @masonrykit/browser
```

## Usage

Re-exported core utilities:
```ts
import { computeColumns, computeMasonryLayout } from '@masonrykit/browser'
```

Browser width observation:
```ts
import { observeElementWidth } from '@masonrykit/browser'

const stop = observeElementWidth(gridEl, (width) => {
  // compute layout with width
})

// later:
// stop()
```

Quick start example:
```ts
import { computeColumns, computeMasonryLayout } from '@masonrykit/browser'

const columns = computeColumns({ gridWidth: 800, columnWidth: 200, gap: 12 })
const items = [
  { id: 'a', height: 100, meta: { src: '/a.jpg' } },
  { id: 'b', aspectRatio: 1, meta: { src: '/b.jpg' } },
] as const

const layout = computeMasonryLayout(items, {
  gridWidth: 800,
  columnWidth: columns.columnWidth,
  gap: columns.gap,
})
```

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

## Documentation

- Core math and API: see `@masonrykit/core` README for full details on multi-span items, stamps, gaps, and layout behavior.
- This package re-exports the core API and provides `observeElementWidth` for browser environments.

## Notes

- Heights are taken from `item.height`, or derived from `columnWidth / aspectRatio` when `aspectRatio` is provided.
- Items are placed in the shortest column first (classic Masonry strategy).
- All calculations are done in pure functions—bring your own rendering layer.

## License

MIT