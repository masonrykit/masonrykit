// Node environment test: no DOM APIs used
import { describe, it, expect } from 'vitest'
import { computeMasonryLayout } from '../src/index'

describe('@masonrykit/browser - computeMasonryLayout', () => {
  it('computes layout with desired columnWidth and gap', () => {
    const gridWidth = 800
    const gap = 16
    const desiredColumnWidth = 188

    const items = [
      { id: 'a', height: 100, meta: {} },
      { id: 'b', aspectRatio: 1, meta: {} }, // height = columnWidth / 1 = columnWidth
      { id: 'c', height: 50, meta: {} },
      { id: 'd', aspectRatio: 2, meta: {} }, // height = columnWidth / 2
      { id: 'e', aspectRatio: 0.5, meta: {} }, // height = columnWidth / 0.5 = 2 * columnWidth
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth: desiredColumnWidth,
    })

    // columnWidth = (gridWidth - gap*(cols-1)) / cols
    // = (800 - 16*3) / 4 = (800 - 48) / 4 = 752 / 4 = 188
    expect(layout.grid.width).toBe(800)
    expect(layout.grid.columnCount).toBe(4)
    expect(layout.grid.columnWidth).toBe(188)
    expect(layout.grid.gap).toBe(16)

    // Place items by shortest-column strategy:
    // I1 (100) -> col0: x=0, y=0, h=100
    // I2 (188) -> col1: x=204, y=0
    // I3 (50)  -> col2: x=408, y=0
    // I4 (94)  -> col3: x=612, y=0
    // I5 (376) -> now col2 is shortest (66), so x=408, y=66
    const [i1, i2, i3, i4, i5] = layout.cells

    expect(i1).toMatchObject({ x: 0, y: 0, width: 188, height: 100, column: 0 })
    expect(i2).toMatchObject({ x: 188 + gap, y: 0, width: 188, height: 188, column: 1 }) // 204
    expect(i3).toMatchObject({ x: (188 + gap) * 2, y: 0, width: 188, height: 50, column: 2 }) // 408
    expect(i4).toMatchObject({ x: (188 + gap) * 3, y: 0, width: 188, height: 94, column: 3 }) // 612
    expect(i5).toMatchObject({
      x: (188 + gap) * 2,
      y: 50 + gap,
      width: 188,
      height: 376,
      column: 2,
    }) // y=66

    // Grid height = tallest column height - gap (when items exist)
    // Tallest is col2: 50 + 16 + 376 + 16 = 458; gridHeight = 458 - 16 = 442
    expect(layout.grid.height).toBe(442)
  })

  it('derives columnCount and columnWidth from desired columnWidth', () => {
    const gridWidth = 800
    const gap = 16
    const desiredColumnWidth = 200

    const items = [
      { height: 100, meta: {} },
      { height: 100, meta: {} },
      { height: 100, meta: {} },
      { height: 100, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth: desiredColumnWidth,
    })

    // Derived columns:
    // cols = floor((gridWidth + gap) / (desiredColumnWidth + gap))
    //      = floor((800 + 16) / (200 + 16)) = floor(816 / 216) = 3
    // columnWidth = (gridWidth - gap*(cols-1)) / cols
    //             = (800 - 16*2) / 3 = (800 - 32) / 3 = 768 / 3 = 256
    expect(layout.grid.columnCount).toBe(3)
    expect(layout.grid.columnWidth).toBe(256)
    expect(layout.grid.gap).toBe(16)

    // First three items should occupy x positions 0, 256+16, 2*(256+16)
    // = 0, 272, 544
    expect(layout.cells[0].x).toBe(0)
    expect(layout.cells[1].x).toBe(256 + gap) // 272
    expect(layout.cells[2].x).toBe((256 + gap) * 2) // 544

    // After placing 4 items, tallest column height:
    // Each item is 100 tall, so first three columns become 116 each, then 4th goes to col0: 116 + 100 + 16 = 232
    // grid height = tallest - gap = 232 - 16 = 216
    expect(layout.grid.height).toBe(216)
  })
})
