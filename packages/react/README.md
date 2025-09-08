# @masonrykit/react

React components and hooks for MasonryKit.

## Installation

```bash
npm install @masonrykit/react react react-dom
```

## Quick Start

```tsx
import {
  Masonry,
  createHeightCell,
  createAspectCell,
  createGridCssVarsStyle,
  createCellCssVarsStyle,
} from '@masonrykit/react'

function PhotoGallery() {
  const cells = [
    createHeightCell('1', 200),
    createAspectCell('2', 16 / 9),
    createHeightCell('3', 150),
  ]

  return (
    <Masonry
      cells={cells}
      columnWidth={250}
      gap={16}
      getGridStyle={createGridCssVarsStyle()}
      getCellStyle={createCellCssVarsStyle()}
      className="relative"
    >
      {(cell) => (
        <div
          key={cell.id}
          className="absolute w-[var(--mk-cell-width)] h-[var(--mk-cell-height)] translate-x-[var(--mk-cell-x)] translate-y-[var(--mk-cell-y)]"
        >
          Content for {cell.id}
        </div>
      )}
    </Masonry>
  )
}
```

## API

### useMasonry Hook

```tsx
function useMasonry<M>(
  cells: readonly Cell<M>[],
  config?: Config<M>,
): HookResult<M>
```

Core hook for manual layout management.

### Masonry Component

```tsx
interface Props<M> {
  cells: readonly Cell<M>[]
  children:
    | ((cell: Cell<M>, index: number) => React.ReactNode)
    | React.ReactNode
  className?: string
  style?: React.CSSProperties

  // Layout options
  gap?: number
  columnWidth?: number
  gridWidth?: number
  horizontalOrder?: boolean
  stamps?: Stamp[]
  stampsCols?: ColumnStamp[]

  // Style callbacks
  getGridStyle?: (layout: LayoutResult<M>) => React.CSSProperties | undefined
  getCellStyle?: (
    cell: LayoutResult<M>['cells'][0],
    index: number,
  ) => React.CSSProperties | undefined
}
```

### Cell Types

```tsx
type Cell<T = undefined> = {
  id: string
  height?: number
  aspectRatio?: number
  columnSpan?: number
  meta: T
}
```

### Helper Functions

```tsx
// Create cells with explicit height
function createHeightCell<T>(id: string, height: number, meta?: T): Cell<T>

// Create cells with aspect ratio
function createAspectCell<T>(id: string, aspectRatio: number, meta?: T): Cell<T>

// CSS variable style generators
function createGridCssVarsStyle(): (
  layout: LayoutResult<any>,
) => React.CSSProperties
function createCellCssVarsStyle(): (
  cell: LayoutResult<any>['cells'][0],
  index: number,
) => React.CSSProperties
```

## Styling with CSS Variables

The recommended approach uses CSS variables for positioning:

```tsx
<Masonry
  cells={cells}
  getGridStyle={createGridCssVarsStyle()}
  getCellStyle={createCellCssVarsStyle()}
>
  {(cell) => (
    <div
      key={cell.id}
      className="absolute w-[var(--mk-cell-width)] h-[var(--mk-cell-height)] translate-x-[var(--mk-cell-x)] translate-y-[var(--mk-cell-y)]"
    >
      {cell.id}
    </div>
  )}
</Masonry>
```

### Available CSS Variables

**Grid variables:**

- `--mk-grid-width`
- `--mk-grid-height`
- `--mk-grid-columns`

**Cell variables:**

- `--mk-cell-x`
- `--mk-cell-y`
- `--mk-cell-width`
- `--mk-cell-height`
- `--mk-cell-column`

## Advanced Features

### Multi-span Items

```tsx
const cells = [
  { id: '1', height: 200 },
  { id: '2', height: 150, columnSpan: 2 }, // Spans 2 columns
  { id: '3', aspectRatio: 1 },
]
```

### Stamps

```tsx
// Column-based stamps
<Masonry
  cells={cells}
  stampsCols={[
    { startCol: 0, span: 2, y: 0, height: 60 }
  ]}
/>

// Pixel-based stamps
<Masonry
  cells={cells}
  stamps={[
    { x: 0, y: 0, width: 400, height: 60 }
  ]}
/>
```

### Horizontal Ordering

```tsx
<Masonry cells={cells} horizontalOrder={true} />
```

## TypeScript Support

Full TypeScript support with generic metadata:

```tsx
interface Photo {
  src: string
  alt: string
}

const cells: Cell<Photo>[] = [
  createHeightCell<Photo>('1', 200, { src: '/photo1.jpg', alt: 'Photo 1' })
]

<Masonry<Photo> cells={cells}>
  {(cell) => (
    <img src={cell.meta.src} alt={cell.meta.alt} />
  )}
</Masonry>
```

## License

MIT
