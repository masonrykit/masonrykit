import { describe, it, expect } from 'vitest'
import { computeMasonryLayout } from '../src/index'

/**
 * These tests validate the core "shortest column" math for span=1 items only.
 * We emulate the classic Masonry examples in a DOM-free environment.
 *
 * Grid: width=180, gap=0, desired columnWidth=60 => 3 columns of 60px
 * Items (heights): [30, 90, 70, 70, 30]
 *
 * Placement (shortest column strategy):
 * - i0(30) -> col0: x=0,   y=0
 * - i1(90) -> col1: x=60,  y=0
 * - i2(70) -> col2: x=120, y=0
 * - i3(70) -> col0: x=0,   y=30
 * - i4(30) -> col2: x=120, y=70
 *
 * Final column heights: col0=100, col1=90, col2=100
 * Grid height = tallest - gap = 100 - 0 = 100
 */

function makeItems() {
  return [
    { id: 'i0', type: 'height' as const, height: 30 },
    { id: 'i1', type: 'height' as const, height: 90 },
    { id: 'i2', type: 'height' as const, height: 70 },
    { id: 'i3', type: 'height' as const, height: 70 },
    { id: 'i4', type: 'height' as const, height: 30 },
  ]
}

function rightOf(x: number, width: number, gridWidth: number) {
  return gridWidth - (x + width)
}

function bottomOf(y: number, height: number, gridHeight: number) {
  return gridHeight - (y + height)
}

describe('@masonrykit/core - basic layout (span=1)', () => {
  it('basic layout - origin top-left', () => {
    const layout = computeMasonryLayout(makeItems(), {
      gridWidth: 180,
      columnWidth: 60,
      gap: 0,
    })

    expect(layout.grid.columnCount).toBe(3)
    expect(layout.grid.columnWidth).toBe(60)
    expect(layout.grid.gap).toBe(0)
    expect(layout.grid.height).toBe(100)

    const [i0, i1, i2, i3, i4] = layout.cells

    expect(i0).toMatchObject({ x: 0, y: 0, width: 60, height: 30, column: 0 })
    expect(i1).toMatchObject({ x: 60, y: 0, width: 60, height: 90, column: 1 })
    expect(i2).toMatchObject({ x: 120, y: 0, width: 60, height: 70, column: 2 })
    expect(i3).toMatchObject({ x: 0, y: 30, width: 60, height: 70, column: 0 })
    expect(i4).toMatchObject({ x: 120, y: 70, width: 60, height: 30, column: 2 })
  })

  it('basic layout - origin top-right (derived right positions)', () => {
    const layout = computeMasonryLayout(makeItems(), {
      gridWidth: 180,
      columnWidth: 60,
      gap: 0,
    })

    const [i0, i1, i2, i3, i4] = layout.cells
    const gw = layout.grid.width

    expect(rightOf(i0.x, i0.width, gw)).toBe(120) // x=0 -> right=180-(0+60)=120
    expect(rightOf(i1.x, i1.width, gw)).toBe(60) // x=60 -> right=60
    expect(rightOf(i2.x, i2.width, gw)).toBe(0) // x=120 -> right=0
    expect(rightOf(i3.x, i3.width, gw)).toBe(120) // x=0 -> right=120
    expect(rightOf(i4.x, i4.width, gw)).toBe(0) // x=120 -> right=0

    // Top positions remain the same when switching left->right origin
    expect([i0.y, i1.y, i2.y, i3.y, i4.y]).toEqual([0, 0, 0, 30, 70])
  })

  it('basic layout - origin bottom-left (derived bottom positions)', () => {
    const layout = computeMasonryLayout(makeItems(), {
      gridWidth: 180,
      columnWidth: 60,
      gap: 0,
    })

    const [i0, i1, i2, i3, i4] = layout.cells
    const gh = layout.grid.height

    expect(bottomOf(i0.y, i0.height, gh)).toBe(70) // bottom=100-(0+30)=70
    expect(bottomOf(i1.y, i1.height, gh)).toBe(10) // bottom=100-(0+90)=10
    expect(bottomOf(i2.y, i2.height, gh)).toBe(30) // bottom=100-(0+70)=30
    expect(bottomOf(i3.y, i3.height, gh)).toBe(0) // bottom=100-(30+70)=0
    expect(bottomOf(i4.y, i4.height, gh)).toBe(0) // bottom=100-(70+30)=0

    // Left positions remain the same when switching top->bottom origin
    expect([i0.x, i1.x, i2.x, i3.x, i4.x]).toEqual([0, 60, 120, 0, 120])
  })

  it('basic layout - origin bottom-right (derived right and bottom positions)', () => {
    const layout = computeMasonryLayout(makeItems(), {
      gridWidth: 180,
      columnWidth: 60,
      gap: 0,
    })

    const [i0, i1, i2, i3, i4] = layout.cells
    const gw = layout.grid.width
    const gh = layout.grid.height

    // Right positions (mirrored horizontally)
    expect(rightOf(i0.x, i0.width, gw)).toBe(120)
    expect(rightOf(i1.x, i1.width, gw)).toBe(60)
    expect(rightOf(i2.x, i2.width, gw)).toBe(0)
    expect(rightOf(i3.x, i3.width, gw)).toBe(120)
    expect(rightOf(i4.x, i4.width, gw)).toBe(0)

    // Bottom positions (mirrored vertically)
    expect(bottomOf(i0.y, i0.height, gh)).toBe(70)
    expect(bottomOf(i1.y, i1.height, gh)).toBe(10)
    expect(bottomOf(i2.y, i2.height, gh)).toBe(30)
    expect(bottomOf(i3.y, i3.height, gh)).toBe(0)
    expect(bottomOf(i4.y, i4.height, gh)).toBe(0)
  })
})
