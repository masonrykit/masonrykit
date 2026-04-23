import { describe, it, expect } from 'vitest'
import { computeLayout, type Cell, type Stamp } from '../src/index'

describe('@masonrykit/core - stamps', () => {
  it('raises column baselines for columns a stamp overlaps', () => {
    const stamps: Stamp[] = [
      { x: 70, y: 10, width: 40, height: 30 }, // overlaps cols 1,2 -> baseline 40
      { x: -5, y: 0, width: 200, height: 20 }, // overlaps all cols -> baseline >= 20
    ]

    const items: Cell[] = Array.from({ length: 4 }, (_, i) => ({
      id: `i${i}`,
      type: 'height' as const,
      height: 30,
    }))

    const layout = computeLayout(items, {
      gridWidth: 180,
      columnWidth: 45,
      gap: 0,
      stamps,
    })

    const [i0, i1, i2, i3] = layout.cells
    expect(i0).toMatchObject({ x: 0, y: 20, column: 0 })
    expect(i1).toMatchObject({ x: 135, y: 20, column: 3 })
    expect(i2).toMatchObject({ x: 45, y: 40, column: 1 })
    expect(i3).toMatchObject({ x: 90, y: 40, column: 2 })
    expect(layout.height).toBe(70)
  })

  it('stamp baseline includes vertical gap', () => {
    const stamps: Stamp[] = [{ x: 0, y: 0, width: 200, height: 20 }]

    const items: Cell[] = Array.from({ length: 3 }, (_, i) => ({
      id: `i${i}`,
      type: 'height' as const,
      height: 10,
    }))

    const layout = computeLayout(items, {
      gridWidth: 200,
      columnWidth: 60,
      gap: 10,
      stamps,
    })

    const step = layout.columns.width + layout.columns.gap
    layout.cells.forEach((c, i) => {
      expect(c).toMatchObject({ x: i * step, y: 30, column: i })
    })
    expect(layout.height).toBe(40)
  })

  it('accepts columnStamps directly via options', () => {
    const items: Cell[] = Array.from({ length: 4 }, (_, i) => ({
      id: `i${i}`,
      type: 'height' as const,
      height: 30,
    }))

    const layout = computeLayout(items, {
      gridWidth: 180,
      columnWidth: 45,
      gap: 0,
      columnStamps: [{ column: 1, span: 2, y: 0, height: 30 }],
    })

    const [i0, i1, i2, i3] = layout.cells
    // cols 1,2 start at 30; cols 0,3 start at 0. Shortest cols first (ties: earliest index).
    expect(i0).toMatchObject({ column: 0, y: 0 })
    expect(i1).toMatchObject({ column: 3, y: 0 })
    expect(i2).toMatchObject({ column: 0, y: 30 })
    expect(i3).toMatchObject({ column: 1, y: 30 })
  })
})
