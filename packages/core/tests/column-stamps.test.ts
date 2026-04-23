import { describe, it, expect } from 'vitest'
import { columnStampsToPixels, computeLayout, type ColumnStamp } from '../src/index'

describe('columnStampsToPixels', () => {
  it('converts a single column stamp', () => {
    const result = columnStampsToPixels([{ column: 0, span: 1, y: 10, height: 50 }], {
      width: 100,
      gap: 12,
    })
    expect(result).toEqual([{ x: 0, y: 10, width: 100, height: 50 }])
  })

  it('converts a multi-column stamp', () => {
    const result = columnStampsToPixels([{ column: 1, span: 2, y: 20, height: 80 }], {
      width: 100,
      gap: 12,
    })
    // x = column(1) * (100 + 12) = 112
    // width = 2*100 + 1*12 = 212
    expect(result).toEqual([{ x: 112, y: 20, width: 212, height: 80 }])
  })

  it('clamps non-positive span to 1', () => {
    const result = columnStampsToPixels([{ column: 0, span: -5, y: 0, height: 40 }], {
      width: 100,
      gap: 12,
    })
    expect(result[0]).toMatchObject({ width: 100 })
  })

  it('floors fractional span', () => {
    const result = columnStampsToPixels([{ column: 0, span: 2.7, y: 0, height: 60 }], {
      width: 100,
      gap: 12,
    })
    expect(result[0]).toMatchObject({ width: 212 })
  })

  it('rounds pixel values', () => {
    const result = columnStampsToPixels([{ column: 1, span: 2, y: 10.7, height: 55.3 }], {
      width: 100.6,
      gap: 12.4,
    })
    expect(result).toEqual([{ x: 113, y: 11, width: 214, height: 55 }])
  })

  it('returns empty for empty input', () => {
    expect(columnStampsToPixels([], { width: 100, gap: 12 })).toEqual([])
  })

  it('is accepted directly by computeLayout via columnStamps option', () => {
    // 3 columns of 60px, gap=10. Stamp at col 0..1 raises baseline for those columns.
    const columnStamps: ColumnStamp[] = [{ column: 0, span: 2, y: 0, height: 20 }]

    const layout = computeLayout(
      [
        { id: 'a', type: 'height', height: 10 },
        { id: 'b', type: 'height', height: 10 },
        { id: 'c', type: 'height', height: 10 },
      ],
      { gridWidth: 200, columnWidth: 60, gap: 10, columnStamps },
    )

    // Baseline 30 (y=0 + h=20 + gap=10) for cols 0,1; col 2 is still 0.
    // Shortest column stays col 2 until its height exceeds 30.
    const [a, b, c] = layout.cells
    expect(a).toMatchObject({ column: 2, y: 0 }) // col 2 (shortest at 0)
    expect(b).toMatchObject({ column: 2, y: 20 }) // col 2 (now at 20, still shortest)
    expect(c).toMatchObject({ column: 0, y: 30 }) // cols 0,1 tie at 30, take first
  })
})
