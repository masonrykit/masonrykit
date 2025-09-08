import { describe, it, expect } from 'vitest'
import { computeMasonryLayout } from '../src/index'

/**
 * Fit-width-like tests
 *
 * In @masonrykit/browser, we do not mutate container styles. Instead, we expose:
 * - grid.width: the input gridWidth
 * - grid.columnCount, grid.columnWidth (rounded), grid.gap (rounded)
 *
 * If you want to "fit" the container snugly to the columns in your app,
 * the natural rendered width is:
 *   fitWidth = columnCount * columnWidth + gap * (columnCount - 1)
 *
 * Because columnWidth and gap are rounded for stable pixel values,
 * fitWidth may differ from the input gridWidth by up to 1px in some cases.
 */

describe('@masonrykit/browser - fit-width-like math', () => {
  it('exact integers with gap: derived fit width equals input gridWidth', () => {
    // A configuration that yields an integral column width
    const gridWidth = 220
    const gap = 20
    const desiredColumnWidth = 60

    const items = [
      { height: 30, meta: {} },
      { height: 50, meta: {} },
      { height: 30, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth: desiredColumnWidth,
    })

    // Columns:
    // cols = floor((220 + 20) / (60 + 20)) = floor(240 / 80) = 3
    // resolved cw = (220 - 20*(3-1)) / 3 = (220 - 40) / 3 = 60
    expect(layout.grid.columnCount).toBe(3)
    expect(layout.grid.columnWidth).toBe(60)
    expect(layout.grid.gap).toBe(20)

    // Derived fit width using resolved sizes should equal input gridWidth exactly here
    const cols = layout.grid.columnCount
    const cw = layout.grid.columnWidth
    const g = layout.grid.gap
    const derivedFitWidth = cols * cw + (cols - 1) * g

    expect(derivedFitWidth).toBe(gridWidth)
    expect(layout.grid.width).toBe(gridWidth)
  })

  it('no gap: derived fit width equals input gridWidth', () => {
    // With no gap, column width expands to fill the width across the derived columns
    const gridWidth = 160
    const desiredColumnWidth = 60
    const gap = 0

    const items = [
      { height: 30, meta: {} },
      { height: 30, meta: {} },
      { height: 30, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth: desiredColumnWidth,
    })

    // cols = floor(160 / 60) = 2
    // cw = (160 - 0) / 2 = 80
    expect(layout.grid.columnCount).toBe(2)
    expect(layout.grid.columnWidth).toBe(80)
    expect(layout.grid.gap).toBe(0)

    const cols = layout.grid.columnCount
    const cw = layout.grid.columnWidth
    const g = layout.grid.gap
    const derivedFitWidth = cols * cw + (cols - 1) * g

    expect(derivedFitWidth).toBe(gridWidth)
    expect(layout.grid.width).toBe(gridWidth)
  })

  it('fractional column width before rounding: derived fit width differs by at most 1px', () => {
    // Pick numbers that yield a fractional resolved column width before rounding.
    // gridWidth = 170, gap = 5, desired cw = 54
    //
    // cols = floor((170 + 5) / (54 + 5)) = floor(175 / 59) = 2
    // unrounded cw = (170 - 5*(2 - 1)) / 2 = (170 - 5) / 2 = 82.5
    // rounded cw (used for output/layout) = 83
    // derived fit width (rounded) = 2*83 + 5 = 171 vs input = 170 (diff = 1)
    const gridWidth = 170
    const gap = 5
    const desiredColumnWidth = 54

    const items = [
      { height: 40, meta: {} },
      { height: 20, meta: {} },
      { height: 10, meta: {} },
      { height: 30, meta: {} },
    ] as const

    const layout = computeMasonryLayout(items, {
      gridWidth,
      gap,
      columnWidth: desiredColumnWidth,
    })

    expect(layout.grid.columnCount).toBe(2)
    // Gap and cw are rounded in output
    const cols = layout.grid.columnCount
    const cw = layout.grid.columnWidth
    const g = layout.grid.gap

    const derivedFitWidth = cols * cw + (cols - 1) * g

    // Because cw is rounded, we allow a 1px tolerance vs input gridWidth
    const diff = Math.abs(derivedFitWidth - gridWidth)
    expect(diff).toBeLessThanOrEqual(1)

    // grid.width remains the original input width
    expect(layout.grid.width).toBe(gridWidth)
  })
})
