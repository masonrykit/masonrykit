import { describe, it, expect } from 'vitest'
import { computeMasonryLayout } from '../src/index'
import type { MasonryCellInput } from '../src/index'

describe('@masonrykit/browser - horizontalOrder', () => {
  it('places items in row-wise columns: x = (colIndex) * (columnWidth + gap) with no gap', () => {
    const gridWidth = 180
    const columnWidth = 60
    const items = [
      { height: 70 },
      { height: 50 },
      { height: 30 },
      { height: 30 },
      { height: 70 },
      { height: 50 },
      { height: 30 },
      { height: 30 },
      { height: 30 },
    ] as const satisfies readonly MasonryCellInput[]

    const layout = computeMasonryLayout(items, {
      gridWidth,
      columnWidth,
      horizontalOrder: true,
    })

    expect(layout.grid.columnCount).toBe(3)
    expect(layout.grid.columnWidth).toBe(60)
    expect(layout.grid.gap).toBe(0)

    const step = layout.grid.columnWidth + layout.grid.gap

    layout.cells.forEach((it, i) => {
      const col = i % layout.grid.columnCount
      expect(it.column).toBe(col)
      expect(it.x).toBe(col * step)
    })
  })

  it('applies gap to x positions with horizontalOrder', () => {
    const gridWidth = 210
    const desiredColumnWidth = 60
    const gap = 10
    const items = new Array(6).fill(0).map((_, i) => ({ height: 30 + (i % 3) * 20 }))

    const layout = computeMasonryLayout(items, {
      gridWidth,
      columnWidth: desiredColumnWidth,
      gap,
      horizontalOrder: true,
    })

    expect(layout.grid.columnCount).toBe(3)
    // columnWidth is resolved from gridWidth & gap, then rounded
    expect(layout.grid.gap).toBe(10)

    const step = layout.grid.columnWidth + layout.grid.gap

    layout.cells.forEach((it, i) => {
      const col = i % layout.grid.columnCount
      expect(it.column).toBe(col)
      expect(it.x).toBe(col * step)
    })
  })
})
