import { describe, it, expect } from 'vitest'
import { computeMasonryLayout } from '../src/index'
import type { MasonryCellInput } from '../src/index'

/**
 * Gutter tests focus on spacing math for span=1 items.
 * In @masonrykit/browser, `gap` applies both horizontally and vertically.
 *
 * For gridWidth=220, gap=20, desired columnWidth=60:
 * - columnCount = floor((220 + 20) / (60 + 20)) = 3
 * - resolved columnWidth = (220 - 20*(3-1)) / 3 = 60
 * - x positions per column: 0, 60+20=80, 2*(60+20)=160
 * - vertical stacking includes gap in y.
 */

describe('@masonrykit/browser - gutter spacing (span=1 items)', () => {
  it('computes horizontal x positions using columnWidth + gap', () => {
    const gridWidth = 220
    const gap = 20
    const columnWidth = 60
    const items = [
      { height: 30 },
      { height: 30 },
      { height: 30 },
      { height: 30 },
    ] as const satisfies readonly MasonryCellInput[]

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth,
    })

    // Resolved columns and sizes
    expect(layout.grid.columnCount).toBe(3)
    expect(layout.grid.columnWidth).toBe(60)
    expect(layout.grid.gap).toBe(20)

    // First row x positions: 0, 80, 160
    expect(layout.cells[0]).toMatchObject({ x: 0, y: 0, width: 60 })
    expect(layout.cells[1]).toMatchObject({ x: 80, y: 0, width: 60 })
    expect(layout.cells[2]).toMatchObject({ x: 160, y: 0, width: 60 })

    // 4th item goes below the shortest column (col0), y should include gap
    // col0 height after first item: 30 + 20 = 50
    expect(layout.cells[3]).toMatchObject({ x: 0, y: 50, width: 60, height: 30 })

    // Grid height is tallest column bottom minus one trailing gap:
    // After item 4: col0=50+30+20=100, col1=50, col2=50 -> tallest=100
    // gridHeight = 100 - 20 = 80
    expect(layout.grid.height).toBe(80)
  })

  it('shortest-column selection with mixed heights includes vertical gap', () => {
    const gridWidth = 220
    const gap = 20
    const columnWidth = 60
    // Heights chosen to drive different shortest columns over time
    const items = [
      { id: 'i0', height: 30 },
      { id: 'i1', height: 70 },
      { id: 'i2', height: 30 },
      { id: 'i3', height: 70 },
      { id: 'i4', height: 30 },
    ] as const satisfies readonly MasonryCellInput[]

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth,
    })

    const [i0, i1, i2, i3, i4] = layout.cells

    // First row
    expect(i0).toMatchObject({ x: 0, y: 0, width: 60, height: 30, column: 0 }) // col0 -> 30+20=50
    expect(i1).toMatchObject({ x: 80, y: 0, width: 60, height: 70, column: 1 }) // col1 -> 70+20=90
    expect(i2).toMatchObject({ x: 160, y: 0, width: 60, height: 30, column: 2 }) // col2 -> 30+20=50

    // Now shortest columns are col0 and col2 (both 50). We pick the first encountered (col0).
    expect(i3).toMatchObject({ x: 0, y: 50, width: 60, height: 70, column: 0 }) // col0 -> 50+70+20 = 140

    // Next shortest is col2 (50), so item 5 goes there.
    expect(i4).toMatchObject({ x: 160, y: 50, width: 60, height: 30, column: 2 }) // col2 -> 50+30+20=100

    // Column heights: c0=140, c1=90, c2=100; tallest=140 -> gridHeight=140-20=120
    expect(layout.grid.height).toBe(120)
  })

  it('works with aspectRatio items (heights computed from resolved columnWidth) and gap', () => {
    const gridWidth = 220
    const gap = 20
    const columnWidth = 60
    // aspectRatio = width / height -> height = columnWidth / aspectRatio
    const items = [
      { id: 'a', aspectRatio: 2 }, // height = 60 / 2 = 30
      { id: 'b', aspectRatio: 1 }, // height = 60 / 1 = 60
      { id: 'c', aspectRatio: 3 }, // height = 60 / 3 = 20
      { id: 'd', aspectRatio: 1.5 }, // height = 60 / 1.5 = 40
    ] as const satisfies readonly MasonryCellInput[]

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth,
    })

    const [a, b, c, d] = layout.cells

    // First row x positions
    expect(a).toMatchObject({ x: 0, y: 0, width: 60, height: 30, column: 0 }) // c0 -> 30+20=50
    expect(b).toMatchObject({ x: 80, y: 0, width: 60, height: 60, column: 1 }) // c1 -> 60+20=80
    expect(c).toMatchObject({ x: 160, y: 0, width: 60, height: 20, column: 2 }) // c2 -> 20+20=40

    // Shortest column is c2 (40). Place 'd' there with y including gap.
    expect(d).toMatchObject({ x: 160, y: 40, width: 60, height: 40, column: 2 }) // c2 -> 40+40+20=100

    // Column heights: c0=50, c1=80, c2=100 => tallest=100 => gridHeight=100-20=80
    expect(layout.grid.height).toBe(80)
  })
})
