# Contributing to MasonryKit

Thanks for your interest! This guide covers the day-to-day of developing, testing, and shipping changes.

## Prerequisites

- **Node.js** ≥ 22 (Node 24 LTS is the recommended / CI-pinned target, pinned in `.nvmrc` and `.tool-versions`)
- **pnpm** ≥ 10 (installed automatically via Corepack from `packageManager` in the root `package.json` — `corepack enable` once)
- **Git** any modern version

That's it. Browsers for Playwright are installed on demand via `pnpm test:install:browsers`.

## First-time setup

```bash
git clone https://github.com/masonrykit/masonrykit.git
cd masonrykit
pnpm install
pnpm test:install:browsers   # Chromium for Vitest browser mode
pnpm build
pnpm test
```

`pnpm install` runs a `prepare` script that installs Lefthook's git hooks — no manual step.

## Repo layout

```text
masonrykit/
├── packages/
│   ├── core/          # @masonrykit/core — pure layout math
│   ├── browser/       # @masonrykit/browser — DOM integrations
│   └── react/         # @masonrykit/react — headless hook
├── apps/
│   ├── vite/          # vanilla TypeScript playground
│   └── vite-react/    # React playground
├── scripts/           # Bundle-size check, etc.
└── .changeset/        # Pending release notes
```

Dependency direction is strictly top-down: `core` → `browser` → `react`. Apps depend on whichever layer they showcase.

## Day-to-day commands

All of these run from the repo root.

| Command                                 | What it does                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev:vite` / `pnpm dev:vite-react` | Launch a demo at `http://localhost:5173` or `:5174`. Workspace packages resolve to `src/*.ts` via tsdown's `source` exports — no rebuild loop.         |
| `pnpm test`                             | Run every package's tests (unit + browser + type-level) through the root `vitest.config.ts` `projects` aggregator. One Vite server, cached transforms. |
| `pnpm bench`                            | Run `vitest bench` — benchmarks in `packages/core/bench/*.bench.ts`.                                                                                   |
| `pnpm lint`                             | `oxlint` (type-aware, ~700ms for the whole repo).                                                                                                      |
| `pnpm lint:unused`                      | `knip` — unused files, exports, deps, binaries across the monorepo.                                                                                    |
| `pnpm format` / `pnpm format:check`     | `oxfmt` (Rust formatter; no Prettier).                                                                                                                 |
| `pnpm typecheck`                        | `tsc --noEmit` per package.                                                                                                                            |
| `pnpm build`                            | Build every package via tsdown. Runs `publint` + `attw` as post-build gates.                                                                           |
| `pnpm analyze:bundle`                   | Enforce the per-package bundle-size budget.                                                                                                            |

## Testing

We use **Vitest 4**. Three layers:

1. **Unit tests** — `packages/core/tests/*.test.ts`. Pure Node, no DOM. Fast.
2. **Browser tests** — `packages/{browser,react}/{tests,__tests__}/*.test.{ts,tsx}`. Real Chromium via `@vitest/browser-playwright`. Actual layout assertions against `getBoundingClientRect()`.
3. **Type-level tests** — `packages/react/__tests__/*.test-d.ts`. Compile-time assertions via `expectTypeOf`. Run as part of `vitest`'s typecheck mode.

Write new tests next to the existing ones. `pnpm test` at the root runs everything.

### Writing a test

Pure core test:

```ts
import { describe, it, expect } from 'vitest'
import { computeLayout, heightCell } from '../src/index'

describe('computeLayout', () => {
  it('lays out an empty grid', () => {
    const layout = computeLayout([], { gridWidth: 400 })
    expect(layout.cells).toEqual([])
    expect(layout.height).toBe(0)
  })

  it('stacks height cells into shortest column', () => {
    const layout = computeLayout([heightCell('a', 100), heightCell('b', 60), heightCell('c', 40)], {
      gridWidth: 300,
      columnWidth: 100,
      gap: 0,
    })
    expect(layout.columns.count).toBe(3)
    expect(layout.cells.map((c) => c.column)).toEqual([0, 1, 2])
  })
})
```

React component test (real browser):

```tsx
import { render } from 'vitest-browser-react'
import { useMasonry, heightCell } from '../src/index'

function Grid() {
  const { stableCells, getGridProps, getCellProps } = useMasonry([heightCell('a', 100)], {
    columnWidth: 200,
    gap: 12,
  })
  return (
    <div {...getGridProps()}>
      {stableCells.map((cell) => (
        <div key={cell.id} {...getCellProps(cell)} data-id={cell.id} />
      ))}
    </div>
  )
}

it('mounts without error', async () => {
  const screen = await render(<Grid />)
  expect(screen.container.querySelector('[data-id="a"]')).not.toBeNull()
})
```

## Code style

- **TypeScript strict** with `isolatedDeclarations` — every exported function has an explicit return type.
- **No `any`.** Use `unknown` + narrowing, or `@ts-expect-error` with a comment.
- **Discriminated unions** for polymorphic shapes (`Cell` = `HeightCell | AspectCell | MeasuredCell`).
- **Inline type imports** — `import { x, type Y }`, not separate `import type`.
- **Naming**: `PascalCase` types, `camelCase` functions/variables, `SCREAMING_SNAKE_CASE` module-level constants.

Linting + formatting run on every commit via Lefthook (`oxlint` + `oxfmt` on staged files, <1s). Pre-push runs `typecheck` + `knip`.

## Git workflow

1. Branch from `main`: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
2. Make your changes; Lefthook formats on commit.
3. If you touched `packages/*/src/`, run `pnpm changeset` and write a user-visible note. CI rejects PRs without a changeset when source files change.
4. Push. Pre-push hooks run typecheck + knip.
5. Open a PR. The template prompts for a test plan.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) loosely:

```text
feat(core): add measured-cell viewport filter
fix(react): prevent infinite effect loop on unmount
docs(browser): document startViewTransition fallback
```

## Changesets

We use [Changesets](https://github.com/changesets/changesets). Every user-visible change adds a markdown file in `.changeset/`:

```bash
pnpm changeset
```

Prompts walk you through picking packages and bump type:

- **patch** — bug fixes, internal refactors
- **minor** — new features, non-breaking API additions
- **major** — breaking changes (removal, rename, semantics shift)

Example entry:

```markdown
---
'@masonrykit/react': minor
'@masonrykit/core': minor
---

Add support for per-column stamps that can be updated at runtime.
```

When the release branch merges into `main`, the Changesets GitHub Action opens a "Version Packages" PR. Merging that publishes to npm via OIDC + Trusted Publishers (no token in the repo).

## Debugging tips

- **Browser-mode tests feel flaky.** Prefer `expect.poll()` over manual `setTimeout`. The `vitest-browser-react` API exposes retry-able locators.
- **Types drift between packages.** Our React binding re-exports every core/browser API — when you add a public symbol, add it to `packages/react/src/index.tsx`'s re-export block too.
- **`publint` or `attw` fails.** Usually a stale `types`, `main`, or `module` field in `package.json`. tsdown regenerates these on build; run `pnpm --filter @masonrykit/<pkg> build`.
- **Bundle budget fails.** Intentional growth? Raise the budget in `scripts/check-bundle-size.js` in the same PR, with a changeset explaining why.

## Performance notes

- Core is pure and hot-path critical. Avoid per-cell allocations in `computeLayout`. If you change the algorithm, compare benchmarks with `pnpm bench`.
- Browser utilities should be idempotent — callers might re-attach observers on every render.
- React hook uses refs + `useMemo` to avoid recomputing the layout on unrelated state changes. Add deps only when required.

## Getting help

- **Bug?** Open an issue with the bug-report template.
- **Feature idea?** The feature-request template prompts for "what user need are you solving?" — we'll engage there.
- **Security issue?** See [SECURITY.md](./SECURITY.md) for the private advisory flow.

Thanks for contributing!
