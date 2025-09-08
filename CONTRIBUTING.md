# Contributing to MasonryKit

Thank you for your interest in contributing to MasonryKit! This guide will help you get started with developing, testing, and contributing to the project.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: ≥ 22.12.0
- **pnpm**: ≥ 9.0.0
- **Git**: Latest stable version

### Setup Development Environment

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/masonrykit.git
   cd masonrykit
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Build All Packages**

   ```bash
   pnpm build
   ```

4. **Run Tests**

   ```bash
   pnpm test
   ```

5. **Start Development Mode**
   ```bash
   pnpm dev
   ```

## 🏗️ Project Structure

```text
masonrykit/
├── packages/
│   ├── core/          # @masonrykit/core - Pure layout algorithms
│   ├── browser/       # @masonrykit/browser - Browser utilities
│   └── react/         # @masonrykit/react - React components
├── apps/
│   ├── vite/          # Vanilla JS demo
│   └── vite-react/    # React demo
└── docs/              # Documentation (future)
```

### Package Dependencies

```text
@masonrykit/core        # Pure TypeScript, no dependencies
    ↓
@masonrykit/browser     # + DOM APIs, ResizeObserver
    ↓
@masonrykit/react       # + React hooks and components
```

## 🛠️ Development Workflow

### Working on Packages

Each package has consistent scripts:

```bash
# Navigate to a package
cd packages/core  # or browser/react

# Development commands
pnpm dev          # Watch mode
pnpm build        # Build package
pnpm test         # Run tests
pnpm test:watch   # Watch test mode
pnpm lint         # Lint code
pnpm typecheck    # Type checking
```

### Working on Demos

```bash
# Start demo applications
pnpm dev:vite        # Vanilla JS demo
pnpm dev:vite-react  # React demo

# Build demos for production
pnpm build:vite
pnpm build:vite-react
```

### Testing Strategy

We use multiple testing approaches:

#### 1. Unit Tests (Vitest)

- **Core**: Pure algorithm testing in Node environment
- **Browser**: DOM utilities with jsdom
- **React**: Component testing with React Testing Library

```bash
pnpm test                    # All packages
pnpm test:core              # Core package only
pnpm test:coverage          # With coverage report
```

#### 2. Browser Tests (Playwright)

- **React**: Visual regression and integration tests
- **Cross-browser**: Chrome, Firefox, Safari

```bash
pnpm test:react:browser     # Headless browser tests
pnpm test:react:headed      # Watch browser tests
pnpm test:react:ui          # Open Playwright UI
```

#### 3. Visual Regression

- Automated screenshot comparison
- Located in `__screenshots__` directories
- Update with: `pnpm test:react:browser --update-snapshots`

## 📝 Code Standards

### TypeScript Guidelines

1. **Strict Type Safety**
   - Use `strict: true` in tsconfig
   - Avoid `any`, prefer `unknown`
   - Use discriminated unions for polymorphic types

2. **Naming Conventions**
   - `PascalCase` for types, interfaces, classes
   - `camelCase` for functions, variables
   - `UPPER_SNAKE_CASE` for constants

3. **Generic Types**
   - Use meaningful constraint names: `<T extends SomeConstraint>`
   - Document generic parameters with JSDoc

### Code Style

We use Prettier and ESLint with strict rules:

```bash
pnpm lint      # Check for issues
pnpm format    # Auto-format code
```

#### Key Rules:

- **No unused variables** (prefix with `_` if intentional)
- **Consistent imports** (prefer type imports)
- **Explicit return types** for public APIs

### Git Workflow

1. **Branch Naming**

   ```bash
   feature/add-new-algorithm
   fix/layout-calculation-bug
   docs/improve-getting-started
   ```

2. **Commit Messages**
   Follow [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   feat(core): add multi-span stamp support
   fix(react): prevent infinite re-renders in useMasonry
   docs(readme): update installation instructions
   test(browser): add visual regression for gaps
   ```

3. **Pull Request Process**
   - Create feature branch from `main`
   - Add changeset if needed (see below)
   - Ensure CI passes
   - Request review from maintainers

## 🔄 Release Process

We use [Changesets](https://github.com/changesets/changesets) for version management.

### Adding a Changeset

When you make changes that affect users:

```bash
pnpm changeset
```

Follow the prompts:

- Select packages that changed
- Choose version bump type (patch/minor/major)
- Write a user-friendly description

### Changeset Guidelines

- **Patch**: Bug fixes, internal refactors
- **Minor**: New features, API additions
- **Major**: Breaking changes

Example changeset:

```markdown
---
'@masonrykit/react': minor
'@masonrykit/core': minor
---

Add support for dynamic column stamps that can be updated at runtime
```

## 🧪 Testing Guidelines

### Writing Tests

#### Unit Tests

```typescript
import { describe, it, expect } from 'vitest'
import { computeMasonryLayout } from '../src'

describe('computeMasonryLayout', () => {
  it('handles empty input gracefully', () => {
    const result = computeMasonryLayout([], { gridWidth: 400 })
    expect(result.cells).toEqual([])
    expect(result.grid.height).toBe(0)
  })
})
```

#### React Component Tests

```typescript
import { render } from '@testing-library/react'
import { useMasonry } from '../src'

function TestComponent() {
  const { gridRef, layout } = useMasonry(cells, config)
  return <div ref={gridRef} data-testid="grid" />
}

it('renders grid correctly', () => {
  const { getByTestId } = render(<TestComponent />)
  expect(getByTestId('grid')).toBeInTheDocument()
})
```

### Test Data Helpers

Use deterministic test data:

```typescript
function createTestCells(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    type: 'height' as const,
    height: 100 + i * 50, // Predictable heights
  }))
}
```

## 🐛 Debugging

### Common Issues

1. **TypeScript Errors in Demos**
   - Check union type handling in cell rendering
   - Ensure proper type guards: `cell.type === 'height'`

2. **Test Flakiness**
   - Browser tests: Wait for layout effects
   - Use `waitFor` for async operations
   - Avoid hardcoded timeouts

3. **Build Issues**
   - Clear dist folders: `pnpm clean`
   - Rebuild dependencies: `pnpm install --force`

### Debugging Tools

```bash
# Analyze bundle sizes
pnpm analyze:bundle

# Check dependency tree
pnpm analyze:deps

# Find outdated packages
pnpm analyze:outdated
```

## 📊 Performance Guidelines

### Core Package

- Keep algorithms pure and fast
- Avoid allocating large arrays in loops
- Use `Math.round()` for pixel-perfect positioning

### React Package

- Minimize re-renders with `useMemo`
- Use `useLayoutEffect` for DOM measurements
- Implement proper cleanup in `useEffect`

### Browser Package

- Debounce expensive operations
- Use `requestAnimationFrame` for DOM updates
- Handle server-side rendering gracefully

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers learn the codebase

### Getting Help

- **Issues**: Bug reports and feature requests
- **Discussions**: Questions and ideas
- **Discord**: Real-time chat (coming soon)

### Contribution Recognition

All contributors are automatically added to:

- `CONTRIBUTORS.md`
- Package acknowledgments
- Release notes

## 📚 Resources

### Learning Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)

### Project-Specific Docs

- [Algorithm Design](./docs/algorithms.md) (future)
- [API Reference](./docs/api.md) (future)
- [Performance Guide](./docs/performance.md) (future)

---

Thank you for contributing to MasonryKit! 🎉
