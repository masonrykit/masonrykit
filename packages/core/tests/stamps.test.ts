import { describe, it, expect } from 'vitest'
import { computeMasonryLayout, type MasonryStamp } from '../src/index'

/**
 * Core stamp tests (span=1 items).
 *
 * The core applies stamps by raising the baseline (column starting height) for all
 * columns whose interior overlaps the stamp rectangle. Baseline = stamp.y + stamp.height + gap.
 *
 * All tests operate with top-left origin (x,y). Right/bottom origin variants are
 * covered in browser/integration tests; in core we validate pure math behavior.
 */

describe('@masonrykit/core - stamps', () => {
  it('top-left: two stamps (one wide, one centered) with 4 columns of width 45', () => {
    // Grid: 180px wide => 4 columns of 45px each (no gap)
    // Items: four items, each height=30
    // Stamps:
    // - s1: left=70, top=10, width=40, height=30 -> overlaps columns 1 and 2 (baseline 40)
    // - s2: left=-5, top=0, width=200, height=20 -> overlaps all columns (baseline >= 20)
    // Resulting per-column baseline: c0=20, c1=40, c2=40, c3=20
    // Placement by shortest column:
    // - i0 -> c0 at (x=0,   y=20)
    // - i1 -> c3 at (x=135, y=20)
    // - i2 -> c1 at (x=45,  y=40)
    // - i3 -> c2 at (x=90,  y=40)
    const gridWidth = 180
    const columnWidth = 45
    const gap = 0

    const stamps: MasonryStamp[] = [
      { x: 70, y: 10, width: 40, height: 30 },
      { x: -5, y: 0, width: 200, height: 20 },
    ]

    const items = [
      { id: 'a', height: 30, meta: {} },
      { id: 'b', height: 30, meta: {} },
      { id: 'c', height: 30, meta: {} },
      { id: 'd', height: 30, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      columnWidth,
      gap,
      stamps,
    })

    expect(layout.grid.columnCount).toBe(4)
    expect(layout.grid.columnWidth).toBe(45)
    expect(layout.grid.gap).toBe(0)

    const [i0, i1, i2, i3] = layout.cells
    expect(i0).toMatchObject({ x: 0, y: 20, width: 45, height: 30, column: 0 })
    expect(i1).toMatchObject({ x: 135, y: 20, width: 45, height: 30, column: 3 })
    expect(i2).toMatchObject({ x: 45, y: 40, width: 45, height: 30, column: 1 })
    expect(i3).toMatchObject({ x: 90, y: 40, width: 45, height: 30, column: 2 })

    // Grid height should be tallest column bottom (no trailing gap with gap=0)
    // Tallest after placements: columns 1 and 2 at 40 + 30 = 70
    expect(layout.grid.height).toBe(70)
  })

  it('stamp spans two columns (columnWidth multiple)', () => {
    // Grid: 180px -> 4 columns of 45px (gap=0)
    // One stamp spanning columns 1..2 (x=45, width=90), top=0, height=30 => baseline 30 for c1,c2
    // Items: four at 30px
    // Initial baselines: c0=0, c1=30, c2=30, c3=0
    // Place:
    // - i0 -> c0 (x=0, y=0)
    // - i1 -> c3 (x=135, y=0)
    // - i2 -> c0 (x=0, y=30)
    // - i3 -> c1 (x=45, y=30)
    const gridWidth = 180
    const columnWidth = 45
    const gap = 0

    const stamps: MasonryStamp[] = [{ x: 45, y: 0, width: 90, height: 30 }]

    const items = [
      { id: 'a', height: 30, meta: {} },
      { id: 'b', height: 30, meta: {} },
      { id: 'c', height: 30, meta: {} },
      { id: 'd', height: 30, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      columnWidth,
      gap,
      stamps,
    })

    expect(layout.grid.columnCount).toBe(4)
    expect(layout.grid.columnWidth).toBe(45)
    expect(layout.grid.gap).toBe(0)

    const [i0, i1, i2, i3] = layout.cells
    expect(i0).toMatchObject({ x: 0, y: 0, width: 45, height: 30, column: 0 })
    expect(i1).toMatchObject({ x: 135, y: 0, width: 45, height: 30, column: 3 })
    expect(i2).toMatchObject({ x: 0, y: 30, width: 45, height: 30, column: 0 })
    expect(i3).toMatchObject({ x: 45, y: 30, width: 45, height: 30, column: 1 })

    // Tallest column height is 30 (for c1,c2,c3) or 60 for c0 -> tallest bottom is 60
    expect(layout.grid.height).toBe(60)
  })

  it('wide stamp baseline applies uniformly across all columns', () => {
    // Grid: 3 columns of 60px, no gap
    // Stamp covers all columns (x=-10, width=200), y=5, height=10 -> baseline = 15 for all columns
    // Items: three items of 20px height -> each starts at y=15
    const gridWidth = 180
    const columnWidth = 60
    const gap = 0

    const stamps: MasonryStamp[] = [{ x: -10, y: 5, width: 200, height: 10 }]

    const items = [
      { id: 'a', height: 20, meta: {} },
      { id: 'b', height: 20, meta: {} },
      { id: 'c', height: 20, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      columnWidth,
      gap,
      stamps,
    })

    expect(layout.grid.columnCount).toBe(3)
    expect(layout.grid.columnWidth).toBe(60)
    expect(layout.grid.gap).toBe(0)

    const [i0, i1, i2] = layout.cells
    expect(i0).toMatchObject({ x: 0, y: 15, width: 60, height: 20, column: 0 })
    expect(i1).toMatchObject({ x: 60, y: 15, width: 60, height: 20, column: 1 })
    expect(i2).toMatchObject({ x: 120, y: 15, width: 60, height: 20, column: 2 })

    // Tallest bottom = 15 + 20 = 35
    expect(layout.grid.height).toBe(35)
  })

  it('stamp baseline includes vertical gap', () => {
    // Grid: 3 columns of 60px, gap=10, width = 3*60 + 2*10 = 200
    // Stamp at top: y=0, height=20 -> baseline = 20 + gap(10) = 30
    // Items: three items of 10px -> each starts at y=30; x spaced by (columnWidth + gap) = 70
    const gridWidth = 200
    const columnWidth = 60
    const gap = 10

    const stamps: MasonryStamp[] = [{ x: 0, y: 0, width: 200, height: 20 }]

    const items = [
      { id: 'a', height: 10, meta: {} },
      { id: 'b', height: 10, meta: {} },
      { id: 'c', height: 10, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      columnWidth,
      gap,
      stamps,
    })

    expect(layout.grid.columnCount).toBe(3)
    expect(layout.grid.columnWidth).toBe(60)
    expect(layout.grid.gap).toBe(10)

    const [i0, i1, i2] = layout.cells
    const step = layout.grid.columnWidth + layout.grid.gap
    expect(step).toBe(70)

    expect(i0).toMatchObject({ x: 0 * step, y: 30, width: 60, height: 10, column: 0 })
    expect(i1).toMatchObject({ x: 1 * step, y: 30, width: 60, height: 10, column: 1 })
    expect(i2).toMatchObject({ x: 2 * step, y: 30, width: 60, height: 10, column: 2 })

    // Tallest bottom = 30 + 10 + gap(10) = 50, but grid height subtracts trailing gap once -> 50 - 10 = 40
    expect(layout.grid.height).toBe(40)
  })
})
