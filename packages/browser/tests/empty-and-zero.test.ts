import { describe, it, expect } from 'vitest'
import { computeMasonryLayout } from '../src/index'

describe('@masonrykit/browser - empty and default column width behavior', () => {
  it('handles empty items array', () => {
    const gridWidth = 180

    const layout = computeMasonryLayout([], {
      gridWidth,
      // no columnWidth and no gap provided
    })

    expect(layout.cells.length).toBe(0)
    expect(layout.grid.width).toBe(gridWidth)
    expect(layout.grid.columnCount).toBe(1)
    // With no columnWidth provided, resolved columnWidth equals gridWidth
    expect(layout.grid.columnWidth).toBe(gridWidth)
    expect(layout.grid.gap).toBe(0)
    // No items => height is 0
    expect(layout.grid.height).toBe(0)
  })

  it('resolves columnWidth to gridWidth when no columnWidth is provided (with items)', () => {
    const gridWidth = 180
    const items = [
      { id: 'a', type: 'height' as const, height: 10 },
      { id: 'b', type: 'height' as const, height: 20 },
      { id: 'c', type: 'height' as const, height: 30 },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      // no columnWidth and no gap provided
    })

    // Single column that spans the whole width
    expect(layout.grid.columnCount).toBe(1)
    expect(layout.grid.columnWidth).toBe(gridWidth)
    expect(layout.grid.gap).toBe(0)

    const [a, b, c] = layout.cells

    // All items in column 0, stacked vertically without gap
    expect(a).toMatchObject({ column: 0, x: 0, y: 0, width: gridWidth, height: 10 })
    expect(b).toMatchObject({ column: 0, x: 0, y: 10, width: gridWidth, height: 20 })
    expect(c).toMatchObject({ column: 0, x: 0, y: 30, width: gridWidth, height: 30 })

    // Grid height is the total of item heights (no trailing gap)
    expect(layout.grid.height).toBe(60)
  })
})
