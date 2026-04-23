import { describe, it, expect } from 'vitest'
import { computeLayout, type Cell } from '../src/index'

/**
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

function makeItems(): Cell[] {
  return [
    { id: 'i0', type: 'height', height: 30 },
    { id: 'i1', type: 'height', height: 90 },
    { id: 'i2', type: 'height', height: 70 },
    { id: 'i3', type: 'height', height: 70 },
    { id: 'i4', type: 'height', height: 30 },
  ]
}

describe('@masonrykit/core - basic layout (span=1)', () => {
  it('places items by shortest-column strategy', () => {
    const layout = computeLayout(makeItems(), {
      gridWidth: 180,
      columnWidth: 60,
      gap: 0,
    })

    expect(layout.columns).toEqual({ count: 3, width: 60, gap: 0 })
    expect(layout.width).toBe(180)
    expect(layout.height).toBe(100)

    const [i0, i1, i2, i3, i4] = layout.cells

    expect(i0).toMatchObject({ x: 0, y: 0, width: 60, height: 30, column: 0 })
    expect(i1).toMatchObject({ x: 60, y: 0, width: 60, height: 90, column: 1 })
    expect(i2).toMatchObject({ x: 120, y: 0, width: 60, height: 70, column: 2 })
    expect(i3).toMatchObject({ x: 0, y: 30, width: 60, height: 70, column: 0 })
    expect(i4).toMatchObject({ x: 120, y: 70, width: 60, height: 30, column: 2 })
  })

  it('preserves cell ids and input order in layout.cells', () => {
    const layout = computeLayout(makeItems(), { gridWidth: 180, columnWidth: 60 })
    expect(layout.cells.map((c) => c.id)).toEqual(['i0', 'i1', 'i2', 'i3', 'i4'])
    expect(layout.cells.map((c) => c.index)).toEqual([0, 1, 2, 3, 4])
  })

  it('handles empty cells array', () => {
    const layout = computeLayout([], { gridWidth: 180 })
    expect(layout.cells).toEqual([])
    expect(layout.width).toBe(180)
    expect(layout.height).toBe(0)
    expect(layout.columns.count).toBe(1)
  })

  it('defaults columnWidth to gridWidth when omitted (single column)', () => {
    const layout = computeLayout(
      [
        { id: 'a', type: 'height', height: 10 },
        { id: 'b', type: 'height', height: 20 },
        { id: 'c', type: 'height', height: 30 },
      ],
      { gridWidth: 180 },
    )

    expect(layout.columns.count).toBe(1)
    expect(layout.columns.width).toBe(180)
    expect(layout.cells.map((c) => c.x)).toEqual([0, 0, 0])
    expect(layout.cells.map((c) => c.y)).toEqual([0, 10, 30])
    expect(layout.height).toBe(60)
  })
})
