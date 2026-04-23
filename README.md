# MasonryKit

[![CI](https://github.com/masonrykit/masonrykit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/masonrykit/masonrykit/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![pnpm](https://img.shields.io/badge/built_with-pnpm-F69220.svg?logo=pnpm)](https://pnpm.io)

TypeScript-first monorepo providing framework-agnostic utilities and React components for Masonry-style grid layouts.

## Packages

| Package                                                         | npm                                                                                                               | Size (gzip)                                                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [`@masonrykit/core`](./packages/core/) — pure layout math       | [![npm](https://img.shields.io/npm/v/@masonrykit/core.svg)](https://www.npmjs.com/package/@masonrykit/core)       | [![size](https://img.shields.io/bundlejs/size/@masonrykit/core)](https://bundlejs.com/?q=@masonrykit/core)       |
| [`@masonrykit/browser`](./packages/browser/) — DOM integrations | [![npm](https://img.shields.io/npm/v/@masonrykit/browser.svg)](https://www.npmjs.com/package/@masonrykit/browser) | [![size](https://img.shields.io/bundlejs/size/@masonrykit/browser)](https://bundlejs.com/?q=@masonrykit/browser) |
| [`@masonrykit/react`](./packages/react/) — headless React hook  | [![npm](https://img.shields.io/npm/v/@masonrykit/react.svg)](https://www.npmjs.com/package/@masonrykit/react)     | [![size](https://img.shields.io/bundlejs/size/@masonrykit/react)](https://bundlejs.com/?q=@masonrykit/react)     |

## Features

- **Framework-agnostic core** — pure algorithm, zero dependencies, works anywhere JavaScript runs
- **Headless React bindings** — prop-getters (downshift/react-aria style); you own every element
- **Three cell types** — fixed `heightCell`, `aspectCell` (width/height ratio), and `measuredCell` (height discovered via `ResizeObserver`)
- **Multi-span + stamps** — cells can span multiple columns; reserve rectangular regions that cells flow around
- **Responsive breakpoints** — `columnWidth` / `gap` switch at configurable `minWidth` thresholds
- **Virtualization** — opt-in viewport filtering for large lists
- **Animation** — opt-in View Transitions API integration
- **SSR-ready** — `initialGridWidth` lets server and first client render produce identical markup
- **Strongly typed** — generic `meta` flows end-to-end with no casts (`cell.meta.src`, not `cell.meta!.src`)

## Quick Install

```bash
# Framework-agnostic core
npm install @masonrykit/core

# Browser utilities (includes core)
npm install @masonrykit/browser

# React components (includes browser + core)
npm install @masonrykit/react react react-dom
```

## Architecture

```text
@masonrykit/core        # Pure layout algorithms
    ↓
@masonrykit/browser     # + Browser utilities
    ↓
@masonrykit/react       # + React bindings
```

Each package builds on the previous layer — use exactly what you need.

## Development

Prerequisites: Node.js ≥ 20, pnpm ≥ 10 (installed via Corepack from `packageManager` in the root `package.json`).

```bash
pnpm install    # Install dependencies
pnpm build      # Build all packages
pnpm test       # Run all tests
pnpm dev        # Watch mode
```

## Demos

Interactive examples showcasing the libraries:

- **[Vite Demo](./apps/vite/)** — Vanilla JavaScript implementation
- **[React Demo](./apps/vite-react/)** — Full-featured React example

Run demos locally:

```bash
pnpm dev:vite        # Vanilla demo
pnpm dev:vite-react  # React demo
```

## Documentation

Each package has detailed documentation:

- **[@masonrykit/core](./packages/core/README.md)** — Layout algorithms, types, and examples
- **[@masonrykit/browser](./packages/browser/README.md)** — Browser utilities and integration guides
- **[@masonrykit/react](./packages/react/README.md)** — React components, hooks, and styling approaches

## Monorepo Structure

```text
masonrykit/
├── packages/
│   ├── core/          # @masonrykit/core
│   ├── browser/       # @masonrykit/browser
│   └── react/         # @masonrykit/react
├── apps/
│   ├── vite/          # Vanilla JS demo
│   └── vite-react/    # React demo
└── ...
```

## Scripts

Run from repository root:

```bash
pnpm build              # Build all packages
pnpm test               # Test all packages
pnpm lint               # Lint all packages
pnpm typecheck          # TypeScript check all packages

# Development
pnpm dev                # Watch all packages
pnpm dev:vite           # Run vanilla demo
pnpm dev:vite-react     # Run React demo

# Release
pnpm changeset          # Create changeset
pnpm release            # Version and publish
```

## Browser support

Modern evergreen browsers. Key APIs in use:

- CSS `translate` property (Chrome 104+, Safari 14.1+, Firefox 72+)
- `ResizeObserver` (ubiquitous ≥ 2020)
- View Transitions API — only required when `animate: true` is set; no-op fallback otherwise

## License

MIT © MasonryKit Contributors
