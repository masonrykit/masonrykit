# MasonryKit

![MasonryKit Logo](./assets/logo.svg)

MasonryKit is a TypeScript-first monorepo that provides:
- `@masonrykit/browser`: lightweight, framework-agnostic utilities for computing Masonry-style grid layouts.
- `@masonrykit/react`: React components and hooks built on top of the browser utilities.

It uses pnpm workspaces, tsdown for library bundling, Vitest for testing, and ESLint 9 (flat config) for linting.

## Packages

- `packages/browser` — `@masonrykit/browser`
- `packages/react` — `@masonrykit/react`



## Monorepo layout

```
masonrykit/
  packages/
    browser/
      src/
      tsdown.config.ts
      tsconfig.json
      package.json
    react/
      src/
      tsdown.config.ts
      tsconfig.json
      package.json
  eslint.config.js
  tsconfig.base.json
  vitest.config.ts
  package.json
  README.md
```



## Getting started

Prerequisites:
- Node.js ≥ 18.18.0
- pnpm ≥ 9

Install dependencies:
```
pnpm install
```


Common scripts (run at repo root):
- Build all: `pnpm build`
- Dev (watch) all: `pnpm dev`
- Test all (Vitest): `pnpm test`
- Lint all (ESLint 9): `pnpm lint`
- Typecheck all (tsc): `pnpm typecheck`
- Format (Prettier): `pnpm format`

## Install (per package)

- Browser utilities:
  ```
  pnpm add @masonrykit/browser
  ```


- React bindings (peer deps required):
  ```
  pnpm add @masonrykit/react react react-dom
  ```


## Usage

### @masonrykit/browser

Compute columns and a Masonry layout with pure functions. You provide grid width and either a column count or desired column width. Also re-exports core math and observeElementWidth for browser width observation.



Key points:
- Height is taken from `item.height`, or derived from `columnWidth / aspectRatio` when `aspectRatio` is provided.
- Items are placed in the current shortest column.
- All computations are pure and deterministic.

### @masonrykit/react

Render a Masonry layout in React using a writer-based API (setCellStyle/setGridStyle). The component measures its own grid unless a fixed `width` is provided.



Or use the hook directly:



## Docs

Documentation site coming soon. Refer to the package READMEs in the meantime.











## Release (Changesets + npm)

This repo uses Changesets to manage versions and publish to npm.

- Create a changeset for your changes:
  ```
  pnpm changeset
  ```

- Version and publish:
  ```
  pnpm run release
  ```

  This will:
  - apply changeset versions
  - re-install to update the lockfile
  - build all packages
  - publish to npm

Notes:
- Packages are published as public.
- Peer dependencies remain as flexible ranges (consumers bring their own React).
- Package exports are aligned to ESM (dist/index.js) and CJS (dist/index.cjs).





## License

MIT © MasonryKit Contributors