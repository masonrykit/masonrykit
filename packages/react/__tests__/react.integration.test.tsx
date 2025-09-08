import React, { useMemo } from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'

import { Masonry, useMasonry, cssVarWriter } from '../src/index'
import type { MasonryCellInput } from '@masonrykit/browser'

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

describe('@masonrykit/react integration (new API)', () => {
  let container: HTMLElement
  let root: Root | null = null

  beforeEach(() => {
    container = document.createElement('div')
    // Keep container visible to ensure getBoundingClientRect has a width (when needed)
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

  it('Masonry renders and applies --mk-cell-* variables via cssVarWriter (smoke)', async () => {
    const cells: ReadonlyArray<MasonryCellInput<undefined>> = [
      { id: 'a', height: 100 },
      { id: 'b', aspectRatio: 1 },
      { id: 'c', height: 50 },
    ]

    root!.render(
      <Masonry
        cells={cells}
        // Provide explicit width (no measuring needed)
        width={800}
        gap={12}
        columnWidth={200}
        horizontalOrder={false}
        setCellStyle={cssVarWriter()}
        // Apply grid height via CSS var for convenience (optional)
        setGridStyle={(grid) => ({ ['--mk-grid-height' as any]: `${grid.height}px` })}
        // Stable classes for testing queries
        gridClassName="mk-grid"
        cellClassName="mk-cell"
        // Basic render function
        renderCell={(cell) => <div>{cell.id}</div>}
      />,
    )

    await nextFrame()

    const gridEl = container.querySelector('.mk-grid') as HTMLElement | null
    expect(gridEl).toBeTruthy()

    // Wait a couple frames for layout/style application to settle
    await nextFrame()
    await nextFrame()

    // Collect cells and assert presence of CSS variables
    const cellEls = Array.from(container.querySelectorAll('.mk-cell')) as HTMLElement[]
    expect(cellEls.length).toBe(3)

    const requiredCellVars = ['--mk-cell-x', '--mk-cell-y', '--mk-cell-width', '--mk-cell-height']
    for (const el of cellEls) {
      for (const v of requiredCellVars) {
        const value = getComputedStyle(el).getPropertyValue(v).trim()
        expect(value, `expected ${v} to be set`).toBeTruthy()
      }
    }

    // Additionally assert numeric values for width/height derived from inputs
    const widths = cellEls.map((el) =>
      parseInt(getComputedStyle(el).getPropertyValue('--mk-cell-width').trim(), 10),
    )
    const heights = cellEls.map((el) =>
      parseInt(getComputedStyle(el).getPropertyValue('--mk-cell-height').trim(), 10),
    )

    // All widths should be positive integers
    expect(widths.every((n) => Number.isFinite(n) && n > 0)).toBe(true)

    // With grid width 800, desired columnWidth 200, gap 12:
    // resolved columnCount = floor((800 + 12) / (200 + 12)) = 3
    // resolved columnWidth ~= round((800 - 12*(3-1)) / 3) = round(776/3) = 259
    // Expect heights to match: explicit 100, derived 259 (aspectRatio=1), explicit 50
    expect(heights).toEqual([100, 259, 50])
  })

  it('useMasonry computes a layout given explicit width (smoke)', async () => {
    type Meta = { tag: string }

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
        width: 400,
        gap: 10,
        columnWidth: 180,
        horizontalOrder: false,
        stamps: undefined,
        stampsCols: undefined,
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

    // Given width=400, gap=10, and desired columnWidth=180:
    // cols = floor((400 + 10) / (180 + 10)) = floor(410/190) = 2
    expect(colCount).toBeGreaterThanOrEqual(1)
    expect(colCount).toBe(2)

    // We rendered 3 items
    expect(cellsCount).toBe(3)

    // Height should be a non-negative finite number
    expect(Number.isFinite(gridHeight)).toBe(true)
    expect(gridHeight).toBeGreaterThanOrEqual(0)
  })
})
