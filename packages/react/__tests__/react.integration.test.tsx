import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'

import {
  useMasonry,
  createHeightCell,
  createAspectCell,
  createGridCssVarsStyle,
  createCellCssVarsStyle,
  type Cell,
} from '../src/index'

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

describe('@masonrykit/react', () => {
  let container: HTMLElement
  let root: Root | null = null

  beforeEach(() => {
    container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '0'
    container.style.top = '0'
    container.style.width = '900px'
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) {
      root.unmount()
      root = null
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('renders with useMasonry hook and CSS variables', async () => {
    const cells: Cell[] = [
      createHeightCell('a', 100),
      createAspectCell('b', 1), // 1:1 aspect ratio
      createHeightCell('c', 50),
    ]

    function TestComponent() {
      const { gridRef, stableCells } = useMasonry(cells, {
        gridWidth: 800,
        gap: 12,
        columnWidth: 200,
        getGridStyle: createGridCssVarsStyle(),
        getCellStyle: createCellCssVarsStyle(),
      })

      return (
        <div ref={gridRef} className="relative h-[var(--mk-grid-height)]">
          {stableCells.map((cell) => (
            <div
              key={cell.id}
              className="absolute w-[var(--mk-cell-width)] h-[var(--mk-cell-height)] translate-x-[var(--mk-cell-x)] translate-y-[var(--mk-cell-y)] translate-z-0"
            >
              {cell.id}
            </div>
          ))}
        </div>
      )
    }

    root!.render(<TestComponent />)

    await nextFrame()

    const gridEl = container.querySelector('.relative') as HTMLElement | null
    expect(gridEl).toBeTruthy()

    // Wait for multiple frames to ensure layout effects have run
    await nextFrame()
    await nextFrame()
    await nextFrame()
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Check that CSS variables are applied to container
    const gridWidth = gridEl!.style.getPropertyValue('--mk-grid-width')
    const gridHeight = gridEl!.style.getPropertyValue('--mk-grid-height')
    expect(gridWidth, 'Grid width CSS variable should be set').toBeTruthy()
    expect(gridHeight, 'Grid height CSS variable should be set').toBeTruthy()

    // Check that cells have CSS variables
    const cellEls = Array.from(container.querySelectorAll('.absolute')) as HTMLElement[]
    expect(cellEls.length).toBe(3)

    const requiredCellVars = ['--mk-cell-x', '--mk-cell-y', '--mk-cell-width', '--mk-cell-height']
    for (const el of cellEls) {
      for (const varName of requiredCellVars) {
        const value = el.style.getPropertyValue(varName)
        expect(value, `expected ${varName} to be set on element`).toBeTruthy()
      }
    }
  })

  it('useMasonry hook computes layout correctly', async () => {
    function HookTest() {
      const cells: Cell[] = [
        createHeightCell('a', 100),
        createAspectCell('b', 1),
        createHeightCell('c', 50),
      ]

      const { gridRef, layout, stableCells } = useMasonry(cells, {
        gridWidth: 400,
        gap: 10,
        columnWidth: 180,
        horizontalOrder: false,
      })

      return (
        <div
          ref={gridRef}
          data-columns={layout.grid.columnCount}
          data-height={layout.grid.height}
          data-cells={layout.cells.length}
          data-stable={stableCells.length}
        />
      )
    }

    root!.render(<HookTest />)
    await nextFrame()

    const testEl = container.querySelector('div[data-columns]') as HTMLElement | null
    expect(testEl).toBeTruthy()

    const columnCount = Number(testEl!.dataset.columns)
    const gridHeight = Number(testEl!.dataset.height)
    const cellsCount = Number(testEl!.dataset.cells)
    const stableCount = Number(testEl!.dataset.stable)

    expect(columnCount).toBe(2)
    expect(cellsCount).toBe(3)
    expect(stableCount).toBe(3)
    expect(Number.isFinite(gridHeight)).toBe(true)
    expect(gridHeight).toBeGreaterThan(0)
  })

  it('helper functions create correct cell types', () => {
    const heightCell = createHeightCell('test-1', 200, { custom: 'meta' })
    expect(heightCell).toEqual({
      id: 'test-1',
      type: 'height',
      height: 200,
      meta: { custom: 'meta' },
    })

    const aspectCell = createAspectCell('test-2', 16 / 9)
    expect(aspectCell).toEqual({
      id: 'test-2',
      type: 'aspect',
      aspectRatio: 16 / 9,
    })
  })

  it('handles cells without meta', async () => {
    const cells: Cell[] = [
      { id: 'no-meta', type: 'height', height: 100 }, // No meta property
    ]

    function TestComponent() {
      const { gridRef, stableCells } = useMasonry(cells, {
        gridWidth: 400,
        gap: 10,
        columnWidth: 180,
      })

      return (
        <div ref={gridRef}>
          {stableCells.map((cell) => (
            <div key={cell.id}>{cell.id}</div>
          ))}
        </div>
      )
    }

    root!.render(<TestComponent />)
    await nextFrame()

    const testEl = container.querySelector('div')
    expect(testEl).toBeTruthy()
  })

  it('handles empty cells array', async () => {
    function TestComponent() {
      const { gridRef, layout, stableCells } = useMasonry([], {
        gridWidth: 400,
        gap: 10,
        columnWidth: 180,
      })

      return (
        <div ref={gridRef} data-empty={stableCells.length === 0 && layout.cells.length === 0}>
          Empty
        </div>
      )
    }

    root!.render(<TestComponent />)
    await nextFrame()

    const testEl = container.querySelector('div[data-empty="true"]')
    expect(testEl).toBeTruthy()
  })

  it('handles gridWidth as null/undefined (auto-measure)', async () => {
    function TestComponent() {
      const cells: Cell[] = [createHeightCell('a', 100)]

      const { gridRef, stableCells } = useMasonry(cells, {
        gap: 10,
        columnWidth: 180,
        // gridWidth not provided - should auto-measure
      })

      return (
        <div ref={gridRef} style={{ width: '400px' }}>
          {stableCells.map((cell) => (
            <div key={cell.id}>{cell.id}</div>
          ))}
        </div>
      )
    }

    root!.render(<TestComponent />)
    await nextFrame()
    // Wait additional time for ResizeObserver to trigger
    await new Promise((resolve) => setTimeout(resolve, 100))

    const testEl = container.querySelector('div')
    expect(testEl).toBeTruthy()
  })

  it('handles cells with fallback height when no dimensions provided', async () => {
    const cells: Cell[] = [
      { id: 'no-dimensions', type: 'height', height: 0 }, // No height provided - should get fallback height
    ]

    function TestComponent() {
      const { gridRef, stableCells } = useMasonry(cells, {
        gridWidth: 400,
        gap: 10,
        columnWidth: 180,
      })

      return (
        <div ref={gridRef}>
          {stableCells.map((cell) => (
            <div key={cell.id}>{cell.id}</div>
          ))}
        </div>
      )
    }

    root!.render(<TestComponent />)
    await nextFrame()

    const testEl = container.querySelector('div')
    expect(testEl).toBeTruthy()
  })
})
