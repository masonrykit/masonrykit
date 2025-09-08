import React, { useMemo } from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'

// Import from source to ensure we test local package code
import { Grid, Cell, cssVars } from '../src/index'
import { useMasonry } from '../src/useMasonry'
import type { MasonryCellInput } from '@masonrykit/core'

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    // Two rafs to allow effects + measurements to settle
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

describe('@masonrykit/react integration', () => {
  let container: HTMLElement
  let root: Root | null = null

  beforeEach(() => {
    container = document.createElement('div')
    // Keep container visible to ensure getBoundingClientRect has a width
    container.style.position = 'absolute'
    container.style.left = '0'
    container.style.top = '0'
    container.style.width = '900px'
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) {
      // Unmount and cleanup container after each test
      root.unmount()
      root = null
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('Grid + Cell render and compute CSS variables (smoke)', async () => {
    // Provide CSS variables the Grid expects to read: --mk-column-width and --mk-gap
    const gridStyle: React.CSSProperties = {
      width: '800px',
      ...cssVars({ columnWidth: 200, gap: 12 }),
    }

    root!.render(
      <Grid className="mk-grid" style={gridStyle}>
        <Cell className="mk-cell" style={cssVars({ height: 100 })} />
        <Cell className="mk-cell" style={cssVars({ aspectRatio: 1 })} />
        <Cell className="mk-cell" style={cssVars({ height: 50 })} />
      </Grid>,
    )

    await nextFrame()

    const gridEl = container.querySelector('.mk-grid') as HTMLElement | null
    expect(gridEl).toBeTruthy()

    // Wait for Grid to compute and write CSS variables
    for (let i = 0; i < 10; i++) {
      const val = getComputedStyle(gridEl!).getPropertyValue('--mk-grid-height').trim()
      if (val) break
      await nextFrame()
    }

    // Grid writes --mk-grid-height as an output variable
    const gridHeightVar = getComputedStyle(gridEl!).getPropertyValue('--mk-grid-height').trim()
    expect(gridHeightVar).toBeTruthy()

    const cells = Array.from(container.querySelectorAll('.mk-cell')) as HTMLElement[]
    expect(cells.length).toBe(3)

    // Cells should receive computed CSS variables for position/size
    // We check a few representative properties to avoid coupling to exact naming
    const requiredCellVars = ['--mk-cell-x', '--mk-cell-y', '--mk-cell-width', '--mk-cell-height']
    for (const cell of cells) {
      for (const v of requiredCellVars) {
        const value = getComputedStyle(cell).getPropertyValue(v).trim()
        expect(value, `expected ${v} to be set`).toBeTruthy()
      }
    }

    // Additionally assert numeric values for width/height derived from inputs
    const widths = cells.map((cell) =>
      parseInt(getComputedStyle(cell).getPropertyValue('--mk-cell-width').trim(), 10),
    )
    const heights = cells.map((cell) =>
      parseInt(getComputedStyle(cell).getPropertyValue('--mk-cell-height').trim(), 10),
    )

    // All widths should be positive integers
    expect(widths.every((n) => Number.isFinite(n) && n > 0)).toBe(true)

    // With grid width 800, desired columnWidth 200, gap 12:
    // resolved columnCount = floor((800 + 12) / (200 + 12)) = 3
    // resolved columnWidth ~= round((800 - 12*(3-1)) / 3) = round(776/3) = 259
    // Expect heights to match: explicit 100, derived 259 (aspectRatio=1), explicit 50
    expect(heights).toEqual([100, 259, 50])
  })

  it('useMasonry computes a layout given explicit gridWidth (smoke)', async () => {
    type Meta = { tag: string }

    // Build a tiny probe component that exposes computed layout via data-attributes
    function HookProbe() {
      const items = useMemo<ReadonlyArray<MasonryCellInput<Meta>>>(
        () => [
          { id: 'a', height: 100, meta: { tag: 'a' } },
          { id: 'b', aspectRatio: 1, meta: { tag: 'b' } }, // derived height from columnWidth
          { id: 'c', height: 50, meta: { tag: 'c' } },
        ],
        [],
      )

      const { ref, layout } = useMasonry(items, {
        // Provide explicit width so the hook avoids ResizeObserver in tests
        gridWidth: 400,
        gap: 10,
        columnWidth: 180,
        horizontalOrder: false,
        cssVars: false,
      })

      return (
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          data-cnt={layout.grid.columnCount}
          data-height={layout.grid.height}
          data-cells={layout.cells.length}
        />
      )
    }

    root!.render(<HookProbe />)
    await nextFrame()

    const probe = container.querySelector('div[data-cnt]') as HTMLElement | null
    expect(probe).toBeTruthy()

    const colCount = Number(probe!.dataset.cnt)
    const gridHeight = Number(probe!.dataset.height)
    const cellsCount = Number(probe!.dataset.cells)

    // Given gridWidth=400, gap=10, and desired columnWidth=180:
    // cols = floor((400 + 10) / (180 + 10)) = floor(410/190) = 2
    // Ensure we have at least 1 column
    expect(colCount).toBeGreaterThanOrEqual(1)
    expect(colCount).toBe(2)

    // We rendered 3 items
    expect(cellsCount).toBe(3)

    // Height should be a non-negative finite number
    expect(Number.isFinite(gridHeight)).toBe(true)
    expect(gridHeight).toBeGreaterThanOrEqual(0)
  })
})
