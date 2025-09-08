import { describe, it, expect } from 'vitest'
import { convertColumnStampsToPixel, type ColumnStamp } from '../src/index'

describe('convertColumnStampsToPixel', () => {
  it('converts single column stamp to pixel stamp', () => {
    const columnStamps: ColumnStamp[] = [
      {
        startCol: 0,
        span: 1,
        y: 10,
        height: 50,
      },
    ]

    const columns = {
      columnWidth: 100,
      gap: 12,
    }

    const result = convertColumnStampsToPixel(columnStamps, columns)

    expect(result).toEqual([
      {
        x: 0,
        y: 10,
        width: 100,
        height: 50,
      },
    ])
  })

  it('converts multi-column stamp to pixel stamp', () => {
    const columnStamps: ColumnStamp[] = [
      {
        startCol: 1,
        span: 2,
        y: 20,
        height: 80,
      },
    ]

    const columns = {
      columnWidth: 100,
      gap: 12,
    }

    const result = convertColumnStampsToPixel(columnStamps, columns)

    expect(result).toEqual([
      {
        x: 112, // startCol=1 * (100 + 12)
        y: 20,
        width: 212, // 2 * 100 + 1 * 12 (span * columnWidth + (span - 1) * gap)
        height: 80,
      },
    ])
  })

  it('converts multiple column stamps', () => {
    const columnStamps: ColumnStamp[] = [
      {
        startCol: 0,
        span: 1,
        y: 0,
        height: 30,
      },
      {
        startCol: 2,
        span: 3,
        y: 50,
        height: 100,
      },
    ]

    const columns = {
      columnWidth: 80,
      gap: 10,
    }

    const result = convertColumnStampsToPixel(columnStamps, columns)

    expect(result).toEqual([
      {
        x: 0,
        y: 0,
        width: 80,
        height: 30,
      },
      {
        x: 180, // startCol=2 * (80 + 10)
        y: 50,
        width: 260, // 3 * 80 + 2 * 10
        height: 100,
      },
    ])
  })

  it('handles span of 1 correctly', () => {
    const columnStamps: ColumnStamp[] = [
      {
        startCol: 5,
        span: 1,
        y: 100,
        height: 200,
      },
    ]

    const columns = {
      columnWidth: 50,
      gap: 8,
    }

    const result = convertColumnStampsToPixel(columnStamps, columns)

    expect(result).toEqual([
      {
        x: 290, // startCol=5 * (50 + 8)
        y: 100,
        width: 50, // span=1, so just columnWidth
        height: 200,
      },
    ])
  })

  it('clamps negative span to 1', () => {
    const columnStamps: ColumnStamp[] = [
      {
        startCol: 0,
        span: -5, // Invalid span
        y: 0,
        height: 40,
      },
    ]

    const columns = {
      columnWidth: 100,
      gap: 12,
    }

    const result = convertColumnStampsToPixel(columnStamps, columns)

    expect(result).toEqual([
      {
        x: 0,
        y: 0,
        width: 100, // Treated as span=1
        height: 40,
      },
    ])
  })

  it('floors fractional span values', () => {
    const columnStamps: ColumnStamp[] = [
      {
        startCol: 0,
        span: 2.7, // Fractional span
        y: 0,
        height: 60,
      },
    ]

    const columns = {
      columnWidth: 100,
      gap: 12,
    }

    const result = convertColumnStampsToPixel(columnStamps, columns)

    expect(result).toEqual([
      {
        x: 0,
        y: 0,
        width: 212, // Treated as span=2
        height: 60,
      },
    ])
  })

  it('rounds pixel values', () => {
    const columnStamps: ColumnStamp[] = [
      {
        startCol: 1,
        span: 2,
        y: 10.7,
        height: 55.3,
      },
    ]

    const columns = {
      columnWidth: 100.6,
      gap: 12.4,
    }

    const result = convertColumnStampsToPixel(columnStamps, columns)

    expect(result).toEqual([
      {
        x: 113, // Math.round(1 * (100.6 + 12.4))
        y: 11, // Math.round(10.7)
        width: 214, // Math.round(2 * 100.6 + 1 * 12.4)
        height: 55, // Math.round(55.3)
      },
    ])
  })

  it('handles empty stamps array', () => {
    const columnStamps: ColumnStamp[] = []
    const columns = {
      columnWidth: 100,
      gap: 12,
    }

    const result = convertColumnStampsToPixel(columnStamps, columns)

    expect(result).toEqual([])
  })

  it('handles zero gap', () => {
    const columnStamps: ColumnStamp[] = [
      {
        startCol: 1,
        span: 3,
        y: 0,
        height: 40,
      },
    ]

    const columns = {
      columnWidth: 100,
      gap: 0,
    }

    const result = convertColumnStampsToPixel(columnStamps, columns)

    expect(result).toEqual([
      {
        x: 100, // startCol=1 * (100 + 0)
        y: 0,
        width: 300, // 3 * 100 + 2 * 0
        height: 40,
      },
    ])
  })
})
