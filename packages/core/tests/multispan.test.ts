import { describe, it, expect } from 'vitest'
import { computeMasonryLayout, type MasonryStamp } from '../src/index'

describe('@masonrykit/core - multi-span placement', () => {
  it('shortest-range selection with span>1 (no gap)', () => {
    // Grid: width=200, desired columnWidth=50, gap=0 -> 4 columns of 50px
    const gridWidth = 200
    const columnWidth = 50
    const gap = 0

    const items = [
      { id: 'A', height: 30, columnSpan: 2 }, // expect col=0, x=0, y=0
      { id: 'B', height: 30, columnSpan: 2 }, // expect col=2, x=100, y=0
      { id: 'C', height: 20, columnSpan: 3 }, // expect col=0, x=0, y=30
      { id: 'D', height: 10, columnSpan: 1 }, // expect col=3, x=150, y=30
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      columnWidth,
      gap,
    })

    expect(layout.grid.columnCount).toBe(4)
    expect(layout.grid.columnWidth).toBe(50)
    expect(layout.grid.gap).toBe(0)

    const [a, b, c, d] = layout.cells

    // A spans 2 columns: width = 2*50 + (2-1)*0 = 100
    expect(a).toMatchObject({ column: 0, span: 2, x: 0, y: 0, width: 100, height: 30 })

    // After A, columns [0,1] = 30; B picks start=2 (shortest range 0), width=100
    expect(b).toMatchObject({ column: 2, span: 2, x: 100, y: 0, width: 100, height: 30 })

    // After B, all columns are 30; C spans 3, ties -> earliest start=0
    // width = 3*50 + (3-1)*0 = 150; y=30
    expect(c).toMatchObject({ column: 0, span: 3, x: 0, y: 30, width: 150, height: 20 })

    // After C, columns [0,1,2] are 50; column 3 is 30; D (span=1) goes to column 3
    expect(d).toMatchObject({ column: 3, span: 1, x: 150, y: 30, width: 50, height: 10 })

    // Grid height = tallest bottom minus trailing gap (0)
    // Tallest after all: max([50,50,50,40]) = 50
    expect(layout.grid.height).toBe(50)
  })

  it('horizontalOrder with span>1 places in row-wise order and wraps correctly', () => {
    // Choose values to get exactly 4 columns with integer cw and visible gap:
    // gridWidth = 230, desired cw = 50, gap = 10
    // cols = floor((230 + 10) / (50 + 10)) = 4
    // resolved cw = (230 - 10*(4-1)) / 4 = 50
    const gridWidth = 230
    const columnWidth = 50
    const gap = 10

    // Sequence exercises: span=2, span=1, span=2 (wrap), span=1
    const items = [
      { id: 'A', height: 10, columnSpan: 2 }, // start=0 -> col=0, y=0
      { id: 'B', height: 10, columnSpan: 1 }, // start=2 -> col=2, y=0
      { id: 'C', height: 10, columnSpan: 2 }, // start=3 -> wrap to 0, y=20
      { id: 'D', height: 10, columnSpan: 1 }, // start=5%4=1 -> col=1, y=40
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      columnWidth,
      gap,
      horizontalOrder: true,
    })

    expect(layout.grid.columnCount).toBe(4)
    expect(layout.grid.columnWidth).toBe(50)
    expect(layout.grid.gap).toBe(10)

    const step = layout.grid.columnWidth + layout.grid.gap // 60
    const [a, b, c, d] = layout.cells

    // A: span=2 -> width = 2*50 + 1*10 = 110; x=0, y=0
    // After A, columns 0,1 = 10 + 10 = 20
    expect(a).toMatchObject({ column: 0, span: 2, x: 0 * step, y: 0, width: 110, height: 10 })

    // B: span=1 -> start=2, x=2*60=120, y=0; col2 -> 10+10=20
    expect(b).toMatchObject({ column: 2, span: 1, x: 2 * step, y: 0, width: 50, height: 10 })

    // C: span=2 -> start=3 but 3+2>4, wrap to 0; y = max(c0,c1)=20; width=110
    expect(c).toMatchObject({ column: 0, span: 2, x: 0 * step, y: 20, width: 110, height: 10 })

    // After C, columns 0,1 = 20 + 10 + 10 = 40
    // D: span=1 -> start=(2+1+2)=5%4=1; x=1*60=60; y=40
    expect(d).toMatchObject({ column: 1, span: 1, x: 1 * step, y: 40, width: 50, height: 10 })

    // Grid height = tallest bottom - gap = max([40,60,20,0]) - 10 = 60 - 10 = 50
    expect(layout.grid.height).toBe(50)
  })

  describe('interaction with stamps', () => {
    it('span placement respects stamp baselines (no gap)', () => {
      // 4 columns of 45px, gap=0; stamp spans columns 1..2 with baseline 30
      const gridWidth = 180
      const columnWidth = 45
      const gap = 0

      const stamps: MasonryStamp[] = [{ x: 45, y: 0, width: 90, height: 30 }]

      const items = [
        { id: 'E', height: 20, columnSpan: 3 }, // expect start=0, y=30
        { id: 'F', height: 10, columnSpan: 2 }, // after E, expect start=0, y=50
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

      const [e, f] = layout.cells

      // E spans 3: width = 3*45 = 135; baseline across [0,1,2] is max(0,30,30)=30
      expect(e).toMatchObject({ column: 0, span: 3, x: 0, y: 30, width: 135, height: 20 })

      // After E, columns [0,1,2] = 30 + 20 = 50; F spans 2 -> all starts yield 50, pick earliest 0
      expect(f).toMatchObject({ column: 0, span: 2, x: 0, y: 50, width: 90, height: 10 })

      // Grid height = tallest bottom (no trailing gap) = max([60,60,50,0]) = 60
      expect(layout.grid.height).toBe(60)
    })

    it('stamp baseline includes vertical gap and span width includes inter-column gaps', () => {
      // 3 columns of 60px, gap=10 (gridWidth = 3*60 + 2*10 = 200)
      // Stamp over the top of all columns: baseline = y + h + gap = 0 + 20 + 10 = 30
      const gridWidth = 200
      const columnWidth = 60
      const gap = 10

      const stamps: MasonryStamp[] = [{ x: 0, y: 0, width: 200, height: 20 }]

      const items = [
        { id: 'G', height: 10, columnSpan: 2 }, // expect start=0, y=30
        { id: 'H', height: 10, columnSpan: 1 }, // expect start=2, y=30
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

      const step = layout.grid.columnWidth + layout.grid.gap // 70
      const [g, h] = layout.cells

      // G: span=2 => width = 2*60 + 1*10 = 130; y=30
      expect(g).toMatchObject({ column: 0, span: 2, x: 0, y: 30, width: 130, height: 10 })

      // After G, columns [0,1] = 30 + 10 + 10 = 50; column 2 is still at 30; H goes to column 2.
      expect(h).toMatchObject({
        column: 2,
        span: 1,
        x: 2 * step,
        y: 30,
        width: 60,
        height: 10,
      })

      // Grid height = tallest bottom - gap = max([50,50,50]) - 10 = 40
      expect(layout.grid.height).toBe(40)
    })
  })
})
