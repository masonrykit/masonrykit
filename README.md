# MasonryKit

TypeScript-first monorepo providing framework-agnostic utilities and React components for Masonry-style grid layouts.

## Packages

- **[@masonrykit/core](./packages/core/)** — Pure, framework-agnostic layout computation
- **[@masonrykit/browser](./packages/browser/)** — Browser utilities and width observation
- **[@masonrykit/react](./packages/react/)** — Headless React components and hooks

## Features

✨ **Framework-agnostic** — Core math works anywhere JavaScript runs  
🎯 **Headless components** — Complete control over styling and rendering  
📏 **Multi-span items** — Items can span multiple columns  
🎨 **Column stamps** — Reserve space with column-aligned rectangles  
⚡ **TypeScript-first** — Full type safety and IntelliSense  
📦 **Tree-shakeable** — ESM + CJS exports with optimal bundle size

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

Prerequisites: Node.js ≥ 22.12.0, pnpm ≥ 9.0.0

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

## License

MIT © MasonryKit Contributors
