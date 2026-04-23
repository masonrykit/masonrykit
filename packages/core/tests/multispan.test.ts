import { describe, it, expect } from 'vitest'
import { computeLayout, type Cell, type Stamp } from '../src/index'

describe('@masonrykit/core - multi-span placement', () => {
  it('shortest-range selection with span>1 (no gap)', () => {
    const items: Cell[] = [
      { id: 'A', type: 'height', height: 30, columnSpan: 2 },
      { id: 'B', type: 'height', height: 30, columnSpan: 2 },
      { id: 'C', type: 'height', height: 20, columnSpan: 3 },
      { id: 'D', type: 'height', height: 10, columnSpan: 1 },
    ]

    const layout = computeLayout(items, { gridWidth: 200, columnWidth: 50, gap: 0 })

    expect(layout.columns.count).toBe(4)
    expect(layout.columns.width).toBe(50)

    const [a, b, c, d] = layout.cells

    expect(a).toMatchObject({ column: 0, span: 2, x: 0, y: 0, width: 100, height: 30 })
    expect(b).toMatchObject({ column: 2, span: 2, x: 100, y: 0, width: 100, height: 30 })
    expect(c).toMatchObject({ column: 0, span: 3, x: 0, y: 30, width: 150, height: 20 })
    expect(d).toMatchObject({ column: 3, span: 1, x: 150, y: 30, width: 50, height: 10 })

    expect(layout.height).toBe(50)
  })

  it('horizontalOrder with span>1 wraps to next row when span exceeds remaining columns', () => {
    // 4 columns of 50, gap 10
    const items: Cell[] = [
      { id: 'A', type: 'height', height: 10, columnSpan: 2 },
      { id: 'B', type: 'height', height: 10, columnSpan: 1 },
      { id: 'C', type: 'height', height: 10, columnSpan: 2 },
      { id: 'D', type: 'height', height: 10, columnSpan: 1 },
    ]

    const layout = computeLayout(items, {
      gridWidth: 230,
      columnWidth: 50,
      gap: 10,
      horizontalOrder: true,
    })

    expect(layout.columns).toEqual({ count: 4, width: 50, gap: 10 })
    const step = layout.columns.width + layout.columns.gap
    const [a, b, c, d] = layout.cells

    expect(a).toMatchObject({ column: 0, span: 2, x: 0, y: 0 })
    expect(b).toMatchObject({ column: 2, span: 1, x: 2 * step, y: 0 })
    // C would have started at col 3 but span=2 doesn't fit: wrap to col 0 of next row.
    expect(c).toMatchObject({ column: 0, span: 2, x: 0, y: 20 })
    expect(d).toMatchObject({ column: 1, span: 1, x: 1 * step, y: 40 })
  })

  it('multi-span item respects stamp baselines', () => {
    const stamps: Stamp[] = [{ x: 45, y: 0, width: 90, height: 30 }]
    const items: Cell[] = [
      { id: 'E', type: 'height', height: 20, columnSpan: 3 },
      { id: 'F', type: 'height', height: 10, columnSpan: 2 },
    ]

    const layout = computeLayout(items, {
      gridWidth: 180,
      columnWidth: 45,
      gap: 0,
      stamps,
    })

    const [e, f] = layout.cells
    expect(e).toMatchObject({ column: 0, span: 3, x: 0, y: 30, width: 135 })
    expect(f).toMatchObject({ column: 0, span: 2, x: 0, y: 50, width: 90 })
    expect(layout.height).toBe(60)
  })

  it('clamps columnSpan greater than column count', () => {
    const layout = computeLayout([{ id: 'a', type: 'height', height: 10, columnSpan: 99 }], {
      gridWidth: 180,
      columnWidth: 60,
    })
    expect(layout.cells[0]).toMatchObject({ span: 3, width: 180 })
  })

  it('clamps zero or negative columnSpan to 1', () => {
    const layout = computeLayout([{ id: 'a', type: 'height', height: 10, columnSpan: 0 }], {
      gridWidth: 180,
      columnWidth: 60,
    })
    expect(layout.cells[0]).toMatchObject({ span: 1, width: 60 })
  })
})
