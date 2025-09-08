import { describe, it, expect } from 'vitest'
import { computeMasonryLayout } from '../src/index'

/**
 * Core tests for pixel rounding and fit-width computations.
 * - These validate deterministic rounding behavior and how a UI can derive a "fit" width
 *   from the resolved grid values (columnCount, columnWidth, gap).
 */

describe('@masonrykit/core - pixel rounding', () => {
  it('keeps 3rd item on the top row across width changes (3 columns)', () => {
    // Choose a desired columnWidth and gap such that 3 columns remain stable across the range.
    //
    // For desired cw=54 and gap=5:
    // cols = floor((w + 5) / (54 + 5)) = floor((w + 5) / 59) -> 3 for w in [172..230]
    const desiredColumnWidth = 54
    const gap = 5

    // Three items, all using aspect ratios for height derivation.
    const items = [
      { id: 'a', aspectRatio: 2, meta: {} }, // h ~ cw / 2
      { id: 'b', aspectRatio: 3, meta: {} }, // h ~ cw / 3
      { id: 'c', aspectRatio: 1.5, meta: {} }, // h ~ cw / 1.5
    ] as const

    for (let gridWidth = 172; gridWidth <= 230; gridWidth++) {
      const layout = computeMasonryLayout(items, {
        gridWidth,
        gap,
        columnWidth: desiredColumnWidth,
      })

      // Column count should remain 3 across the range
      expect(layout.grid.columnCount).toBe(3)

      // Last item should always be in the 3rd column on the top row
      const last = layout.cells[2]
      expect(last.column).toBe(2)
      expect(last.y).toBe(0)

      // Derived heights must match Math.round(resolvedColumnWidth / aspectRatio)
      const cw = layout.grid.columnWidth
      expect(layout.cells[0].height).toBe(Math.round(cw / (items[0].aspectRatio as number)))
      expect(layout.cells[1].height).toBe(Math.round(cw / (items[1].aspectRatio as number)))
      expect(layout.cells[2].height).toBe(Math.round(cw / (items[2].aspectRatio as number)))

      // x positions should be integer multiples of (cw + gap)
      const step = layout.grid.columnWidth + layout.grid.gap
      expect(layout.cells[0].x).toBe(0 * step)
      expect(layout.cells[1].x).toBe(1 * step)
      expect(layout.cells[2].x).toBe(2 * step)
    }
  })

  it('pixel rounding remains stable with mixed aspect ratios and a 4th item', () => {
    const desiredColumnWidth = 54
    const gap = 5

    const items = [
      { id: 'i1', aspectRatio: 2.2, meta: {} },
      { id: 'i2', aspectRatio: 2.8, meta: {} },
      { id: 'i3', aspectRatio: 1.7, meta: {} },
      { id: 'i4', aspectRatio: 3.3, meta: {} },
    ] as const

    for (let gridWidth = 172; gridWidth <= 230; gridWidth++) {
      const layout = computeMasonryLayout(items, {
        gridWidth,
        gap,
        columnWidth: desiredColumnWidth,
      })

      // 3 columns across the range
      expect(layout.grid.columnCount).toBe(3)

      const cw = layout.grid.columnWidth
      const g = layout.grid.gap
      const step = cw + g

      // First three items should occupy the top row (y=0) across the range
      expect(layout.cells[0].y).toBe(0)
      expect(layout.cells[1].y).toBe(0)
      expect(layout.cells[2].y).toBe(0)

      expect(layout.cells[0].x).toBe(0 * step)
      expect(layout.cells[1].x).toBe(1 * step)
      expect(layout.cells[2].x).toBe(2 * step)

      // Heights are rounded from cw / aspectRatio
      layout.cells.forEach((it, idx) => {
        const ar = (items[idx].aspectRatio as number) || 1
        const expectedHeight = Math.round(cw / ar)
        expect(it.height).toBe(expectedHeight)
      })

      // The 4th item should stack below the shortest column among the first three.
      // Its y should be an integer: y = rounded(height_of_chosen_column) + gap * k
      const fourth = layout.cells[3]
      expect(Number.isInteger(fourth.y)).toBe(true)
      expect(fourth.x % step).toBe(0) // x at integral step
    }
  })
})

describe('@masonrykit/core - fit-width computations', () => {
  it('exact integers with gap: derived fit width equals input gridWidth', () => {
    // A configuration that yields an integral column width
    const gridWidth = 220
    const gap = 20
    const desiredColumnWidth = 60

    const items = [
      { height: 30, meta: {} },
      { height: 50, meta: {} },
      { height: 30, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth: desiredColumnWidth,
    })

    // Columns:
    // cols = floor((220 + 20) / (60 + 20)) = floor(240 / 80) = 3
    // resolved cw = (220 - 20*(3-1)) / 3 = (220 - 40) / 3 = 60
    expect(layout.grid.columnCount).toBe(3)
    expect(layout.grid.columnWidth).toBe(60)
    expect(layout.grid.gap).toBe(20)

    // Derived fit width using resolved sizes should equal input gridWidth exactly here
    const cols = layout.grid.columnCount
    const cw = layout.grid.columnWidth
    const g = layout.grid.gap
    const derivedFitWidth = cols * cw + (cols - 1) * g

    expect(derivedFitWidth).toBe(gridWidth)
    expect(layout.grid.width).toBe(gridWidth)
  })

  it('no gap: derived fit width equals input gridWidth', () => {
    // With no gap, column width expands to fill the width across the derived columns
    const gridWidth = 160
    const desiredColumnWidth = 60
    const gap = 0

    const items = [
      { height: 30, meta: {} },
      { height: 30, meta: {} },
      { height: 30, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth: desiredColumnWidth,
    })

    // cols = floor(160 / 60) = 2
    // cw = (160 - 0) / 2 = 80
    expect(layout.grid.columnCount).toBe(2)
    expect(layout.grid.columnWidth).toBe(80)
    expect(layout.grid.gap).toBe(0)

    const cols = layout.grid.columnCount
    const cw = layout.grid.columnWidth
    const g = layout.grid.gap
    const derivedFitWidth = cols * cw + (cols - 1) * g

    expect(derivedFitWidth).toBe(gridWidth)
    expect(layout.grid.width).toBe(gridWidth)
  })

  it('fractional resolved column width before rounding: derived fit width differs by at most 1px', () => {
    // Choose numbers that yield a fractional resolved column width before rounding.
    // gridWidth=170, gap=5, desired cw=54:
    //
    // cols = floor((170 + 5) / (54 + 5)) = floor(175 / 59) = 2
    // unrounded cw = (170 - 5*(2 - 1)) / 2 = (170 - 5) / 2 = 82.5
    // rounded cw in layout = 83
    // derived fit width (rounded) = 2*83 + 5 = 171; input = 170 (diff = 1)
    const gridWidth = 170
    const gap = 5
    const desiredColumnWidth = 54

    const items = [
      { height: 40, meta: {} },
      { height: 20, meta: {} },
      { height: 10, meta: {} },
      { height: 30, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth: desiredColumnWidth,
    })

    expect(layout.grid.columnCount).toBe(2)

    const cols = layout.grid.columnCount
    const cw = layout.grid.columnWidth // rounded
    const g = layout.grid.gap
    const derivedFitWidth = cols * cw + (cols - 1) * g

    const diff = Math.abs(derivedFitWidth - gridWidth)
    expect(diff).toBeLessThanOrEqual(1)

    // grid.width remains the original input width
    expect(layout.grid.width).toBe(gridWidth)
  })
})
