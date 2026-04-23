import { describe, it, expect } from 'vitest'
import { computeLayout, type AspectCell, type Cell } from '../src/index'

describe('@masonrykit/core - pixel rounding', () => {
  it('keeps top row items on y=0 across a 1px-varying gridWidth range', () => {
    const items: AspectCell[] = [
      { id: 'a', type: 'aspect', aspectRatio: 2 },
      { id: 'b', type: 'aspect', aspectRatio: 3 },
      { id: 'c', type: 'aspect', aspectRatio: 1.5 },
    ]

    // desired cw=54, gap=5 -> 3 columns stable for gridWidth in [172..230]
    for (let gridWidth = 172; gridWidth <= 230; gridWidth++) {
      const layout = computeLayout(items, { gridWidth, gap: 5, columnWidth: 54 })
      expect(layout.columns.count).toBe(3)

      const cw = layout.columns.width
      layout.cells.forEach((cell, i) => {
        expect(cell.y).toBe(0)
        expect(cell.height).toBe(Math.round(cw / items[i]!.aspectRatio))
      })
    }
  })

  it('positions stay integer even with fractional resolved column width', () => {
    const items: Cell[] = [
      { id: 'a', type: 'height', height: 40 },
      { id: 'b', type: 'height', height: 20 },
      { id: 'c', type: 'height', height: 10 },
      { id: 'd', type: 'height', height: 30 },
    ]

    // gridWidth=170, gap=5, desired cw=54 -> cols=2, unrounded cw=82.5, rounded=83
    const layout = computeLayout(items, { gridWidth: 170, gap: 5, columnWidth: 54 })
    expect(layout.columns.count).toBe(2)
    expect(layout.columns.width).toBe(83)

    layout.cells.forEach((c) => {
      expect(Number.isInteger(c.x)).toBe(true)
      expect(Number.isInteger(c.y)).toBe(true)
      expect(Number.isInteger(c.height)).toBe(true)
    })
  })
})

describe('@masonrykit/core - aspect ratio validation', () => {
  it('throws on zero aspect ratio', () => {
    expect(() =>
      computeLayout([{ id: 'a', type: 'aspect', aspectRatio: 0 }], {
        gridWidth: 100,
      }),
    ).toThrow(/invalid aspectRatio/)
  })

  it('throws on negative aspect ratio', () => {
    expect(() =>
      computeLayout([{ id: 'a', type: 'aspect', aspectRatio: -1 }], {
        gridWidth: 100,
      }),
    ).toThrow(/invalid aspectRatio/)
  })

  it('throws on NaN aspect ratio', () => {
    expect(() =>
      computeLayout([{ id: 'a', type: 'aspect', aspectRatio: NaN }], {
        gridWidth: 100,
      }),
    ).toThrow(/invalid aspectRatio/)
  })
})
