import { describe, it, expect } from 'vitest'
import { computeMasonryLayout } from '../src/index'
import type { MasonryCellInput } from '../src/index'

/**
 * Pixel rounding tests
 *
 * We vary gridWidth by 1px increments while:
 * - Keeping a desired columnWidth and gap such that the resolved column count stays constant.
 * - Deriving item heights from aspect ratios (height = rounded(columnWidth / aspectRatio)).
 *
 * We assert that:
 * - The number of columns remains stable across the width range.
 * - The 3rd item (index 2) stays on the top row (y = 0) across the width range,
 *   mimicking the original Masonry pixel rounding test behavior.
 * - The derived heights match the rounded(columnWidth / aspectRatio) per item.
 */
describe('@masonrykit/browser - pixel rounding with aspect-ratio-derived heights', () => {
  it('keeps 3rd item on the top row across width changes (3 columns)', () => {
    // Choose a desired columnWidth and gap such that 3 columns remain stable
    // across the tested range.
    //
    // For desired cw=54 and gap=5:
    // cols = floor((w + 5) / (54 + 5)) = floor((w + 5) / 59) -> 3 for w in [172..230]
    const desiredColumnWidth = 54
    const gap = 5

    // Three items, all using aspectRatio for height derivation
    // Using varied ratios so rounded heights shift over the range.
    const items = [
      { id: 'a', aspectRatio: 2 }, // h ~ cw / 2
      { id: 'b', aspectRatio: 3 }, // h ~ cw / 3
      { id: 'c', aspectRatio: 1.5 }, // h ~ cw / 1.5
    ] as const satisfies readonly MasonryCellInput[]

    for (let gridWidth = 172; gridWidth <= 230; gridWidth++) {
      const layout = computeMasonryLayout(items, {
        gridWidth,
        gap,
        columnWidth: desiredColumnWidth,
      })

      // Column count should remain 3 across the range
      expect(layout.grid.columnCount).toBe(3)

      // Last item should always be in the 3rd column on the top row
      const last = layout.cells[2]
      expect(last.column).toBe(2)
      expect(last.y).toBe(0)

      // Derived heights must match Math.round(resolvedColumnWidth / aspectRatio)
      const cw = layout.grid.columnWidth
      expect(layout.cells[0].height).toBe(Math.round(cw / (items[0].aspectRatio as number)))
      expect(layout.cells[1].height).toBe(Math.round(cw / (items[1].aspectRatio as number)))
      expect(layout.cells[2].height).toBe(Math.round(cw / (items[2].aspectRatio as number)))

      // x positions should be integer multiples of (cw + gap)
      const step = layout.grid.columnWidth + layout.grid.gap
      expect(layout.cells[0].x).toBe(0 * step)
      expect(layout.cells[1].x).toBe(1 * step)
      expect(layout.cells[2].x).toBe(2 * step)
    }
  })

  it('pixel rounding remains stable with mixed aspect ratios and a 4th item', () => {
    // Similar setup, but add a 4th item to ensure vertical stacking uses rounded heights.
    const desiredColumnWidth = 54
    const gap = 5

    const items = [
      { id: 'i1', aspectRatio: 2.2 }, // varied ARs to produce fractional heights
      { id: 'i2', aspectRatio: 2.8 },
      { id: 'i3', aspectRatio: 1.7 },
      { id: 'i4', aspectRatio: 3.3 },
    ] as const satisfies readonly MasonryCellInput[]

    for (let gridWidth = 172; gridWidth <= 230; gridWidth++) {
      const layout = computeMasonryLayout(items, {
        gridWidth,
        gap,
        columnWidth: desiredColumnWidth,
      })

      // 3 columns across the range
      expect(layout.grid.columnCount).toBe(3)

      const cw = layout.grid.columnWidth
      const g = layout.grid.gap
      const step = cw + g

      // First three items should occupy the top row (y=0) across the range
      expect(layout.cells[0].y).toBe(0)
      expect(layout.cells[1].y).toBe(0)
      expect(layout.cells[2].y).toBe(0)

      expect(layout.cells[0].x).toBe(0 * step)
      expect(layout.cells[1].x).toBe(1 * step)
      expect(layout.cells[2].x).toBe(2 * step)

      // Heights are rounded from cw / aspectRatio
      layout.cells.forEach((it, idx) => {
        const ar = (items[idx].aspectRatio as number) || 1
        const expectedHeight = Math.round(cw / ar)
        expect(it.height).toBe(expectedHeight)
      })

      // The 4th item should stack below the shortest column among the first three.
      // Its y should be an integer: y = rounded(height_of_chosen_column) + gap * k
      const fourth = layout.cells[3]
      expect(Number.isInteger(fourth.y)).toBe(true)
      expect(fourth.x % step).toBe(0) // x at integral step
    }
  })
})
