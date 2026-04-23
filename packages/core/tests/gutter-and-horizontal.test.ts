import { describe, it, expect } from 'vitest'
import { computeLayout, type Cell } from '../src/index'

describe('@masonrykit/core - gutter spacing (span=1)', () => {
  it('computes horizontal x positions and vertical stacking with gap', () => {
    const items: Cell[] = [
      { id: 'a', type: 'height', height: 30 },
      { id: 'b', type: 'height', height: 30 },
      { id: 'c', type: 'height', height: 30 },
      { id: 'd', type: 'height', height: 30 },
    ]

    const layout = computeLayout(items, { gridWidth: 220, gap: 20, columnWidth: 60 })

    // cols = floor((220 + 20) / (60 + 20)) = 3; resolved cw = (220 - 40) / 3 = 60
    expect(layout.columns).toEqual({ count: 3, width: 60, gap: 20 })

    expect(layout.cells[0]).toMatchObject({ x: 0, y: 0, width: 60, height: 30, column: 0 })
    expect(layout.cells[1]).toMatchObject({ x: 80, y: 0, width: 60, height: 30, column: 1 })
    expect(layout.cells[2]).toMatchObject({ x: 160, y: 0, width: 60, height: 30, column: 2 })
    expect(layout.cells[3]).toMatchObject({ x: 0, y: 50, width: 60, height: 30, column: 0 })

    // Tallest after item 4: col0=100, col1=50, col2=50 => gridHeight=100-gap=80
    expect(layout.height).toBe(80)
  })

  it('shortest-column selection with mixed heights includes vertical gap', () => {
    const items: Cell[] = [
      { id: 'i0', type: 'height', height: 30 },
      { id: 'i1', type: 'height', height: 70 },
      { id: 'i2', type: 'height', height: 30 },
      { id: 'i3', type: 'height', height: 70 },
      { id: 'i4', type: 'height', height: 30 },
    ]

    const layout = computeLayout(items, { gridWidth: 220, gap: 20, columnWidth: 60 })

    const [i0, i1, i2, i3, i4] = layout.cells
    expect(i0).toMatchObject({ x: 0, y: 0, column: 0 })
    expect(i1).toMatchObject({ x: 80, y: 0, column: 1 })
    expect(i2).toMatchObject({ x: 160, y: 0, column: 2 })
    expect(i3).toMatchObject({ x: 0, y: 50, column: 0 })
    expect(i4).toMatchObject({ x: 160, y: 50, column: 2 })

    expect(layout.height).toBe(120)
  })
})

describe('@masonrykit/core - horizontalOrder', () => {
  it('places items row-wise (x = colIndex * (columnWidth + gap))', () => {
    const items: Cell[] = Array.from({ length: 9 }).map((_, i) => ({
      id: `i${i}`,
      type: 'height' as const,
      height: 30,
    }))

    const layout = computeLayout(items, {
      gridWidth: 180,
      columnWidth: 60,
      horizontalOrder: true,
    })

    expect(layout.columns.count).toBe(3)
    const step = layout.columns.width + layout.columns.gap
    layout.cells.forEach((cell, i) => {
      const col = i % layout.columns.count
      expect(cell.column).toBe(col)
      expect(cell.x).toBe(col * step)
    })
  })

  it('applies gap to x positions in horizontalOrder', () => {
    const items: Cell[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `i${i}`,
      type: 'height' as const,
      height: 30 + (i % 3) * 20,
    }))

    const layout = computeLayout(items, {
      gridWidth: 210,
      columnWidth: 60,
      gap: 10,
      horizontalOrder: true,
    })

    expect(layout.columns.count).toBe(3)
    expect(layout.columns.gap).toBe(10)

    const step = layout.columns.width + layout.columns.gap
    layout.cells.forEach((cell, i) => {
      const col = i % layout.columns.count
      expect(cell.column).toBe(col)
      expect(cell.x).toBe(col * step)
    })
  })
})
