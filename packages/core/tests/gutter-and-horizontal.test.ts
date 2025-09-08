import { describe, it, expect } from 'vitest'
import { computeMasonryLayout } from '../src/index'

describe('@masonrykit/core - gutter spacing (span=1)', () => {
  it('computes horizontal x positions and vertical stacking with gap', () => {
    const gridWidth = 220
    const gap = 20
    const columnWidth = 60

    const items = [{ height: 30 }, { height: 30 }, { height: 30 }, { height: 30 }] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth,
    })

    // Resolved columns and sizes:
    // cols = floor((220 + 20) / (60 + 20)) = 3
    // resolved columnWidth = (220 - 20*(3-1)) / 3 = 60
    // x per column: 0, 60+20=80, 2*(60+20)=160
    expect(layout.grid.columnCount).toBe(3)
    expect(layout.grid.columnWidth).toBe(60)
    expect(layout.grid.gap).toBe(20)

    expect(layout.cells[0]).toMatchObject({ x: 0, y: 0, width: 60, height: 30, column: 0 })
    expect(layout.cells[1]).toMatchObject({ x: 80, y: 0, width: 60, height: 30, column: 1 })
    expect(layout.cells[2]).toMatchObject({ x: 160, y: 0, width: 60, height: 30, column: 2 })

    // 4th item goes beneath the shortest column (col0), y includes gap:
    // col0 height after item 1: 30 + 20 = 50
    expect(layout.cells[3]).toMatchObject({ x: 0, y: 50, width: 60, height: 30, column: 0 })

    // Tallest column after item 4: col0=50+30+20=100, col1=50, col2=50 => tallest=100
    // gridHeight = tallest - gap = 100 - 20 = 80
    expect(layout.grid.height).toBe(80)
  })

  it('shortest-column selection with mixed heights includes vertical gap', () => {
    const gridWidth = 220
    const gap = 20
    const columnWidth = 60

    const items = [
      { id: 'i0', height: 30 },
      { id: 'i1', height: 70 },
      { id: 'i2', height: 30 },
      { id: 'i3', height: 70 },
      { id: 'i4', height: 30 },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth,
    })

    const [i0, i1, i2, i3, i4] = layout.cells

    // First row
    expect(i0).toMatchObject({ x: 0, y: 0, width: 60, height: 30, column: 0 }) // col0=30+20=50
    expect(i1).toMatchObject({ x: 80, y: 0, width: 60, height: 70, column: 1 }) // col1=70+20=90
    expect(i2).toMatchObject({ x: 160, y: 0, width: 60, height: 30, column: 2 }) // col2=30+20=50

    // Shortest columns are col0 and col2 (both 50). Pick the first (col0).
    expect(i3).toMatchObject({ x: 0, y: 50, width: 60, height: 70, column: 0 }) // col0=50+70+20=140

    // Next shortest is col2 (50)
    expect(i4).toMatchObject({ x: 160, y: 50, width: 60, height: 30, column: 2 }) // col2=50+30+20=100

    // Tallest column is col0=140 -> gridHeight=140-20=120
    expect(layout.grid.height).toBe(120)
  })
})

describe('@masonrykit/core - horizontalOrder', () => {
  it('places items row-wise without gap (x = colIndex * columnWidth)', () => {
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
    ] as const

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

  it('applies gap to x positions in horizontalOrder', () => {
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
    expect(layout.grid.gap).toBe(10)

    // columnWidth is resolved to fill the grid; use the resolved value for assertions
    const step = layout.grid.columnWidth + layout.grid.gap
    layout.cells.forEach((it, i) => {
      const col = i % layout.grid.columnCount
      expect(it.column).toBe(col)
      expect(it.x).toBe(col * step)
    })
  })
})
