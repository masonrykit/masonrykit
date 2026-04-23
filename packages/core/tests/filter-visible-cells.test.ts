/**
 * filterVisibleCells is pure geometry: given a list of laid-out cells, the
 * grid's top edge (relative to the viewport coord space), and viewport
 * bounds, it returns the subset that intersects the viewport ± overscan.
 * Browser bindings are responsible for reading the actual bounds.
 */
import { describe, it, expect } from 'vitest'
import { computeLayout, filterVisibleCells, type Cell } from '../src/index'

describe('@masonrykit/core - filterVisibleCells', () => {
  // Make a single-column layout where each cell is 100px tall.
  function build(count: number) {
    const cells: Cell[] = Array.from({ length: count }, (_, i) => ({
      id: `c${i}`,
      type: 'height',
      height: 100,
    }))
    return computeLayout(cells, { gridWidth: 200, columnWidth: 200, gap: 0 })
  }

  it('returns cells that intersect a top-of-document viewport', () => {
    const { cells } = build(20)
    // Grid starts at y=0; viewport is the first 720px.
    const visible = filterVisibleCells(cells, 0, { top: 0, bottom: 720 })
    expect(visible.map((c) => c.id)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'])
  })

  it('pulls in cells within overscan on either side', () => {
    const { cells } = build(20)
    // Viewport 500–600 + overscan 100 → effective 400–700. A cell at y=300
    // (c3) has bottom=400 which touches the top edge → included. A cell at
    // y=700 (c7) has top=700 which touches the bottom edge → included.
    const visible = filterVisibleCells(cells, 0, { top: 500, bottom: 600 }, 100)
    expect(visible.map((c) => c.id)).toEqual(['c3', 'c4', 'c5', 'c6', 'c7'])
  })

  it('accounts for grid top offset', () => {
    const { cells } = build(10)
    // Grid is scrolled so its top is at y=-300. Viewport 0–300, overscan 0.
    // Cell at y=200 (c2) has bottom = -300 + 300 = 0 → touches top → included.
    // Cell at y=600 (c6) has top = -300 + 600 = 300 → touches bottom → included.
    const visible = filterVisibleCells(cells, -300, { top: 0, bottom: 300 })
    expect(visible.map((c) => c.id)).toEqual(['c2', 'c3', 'c4', 'c5', 'c6'])
  })

  it('returns an empty list when no cell intersects', () => {
    const { cells } = build(5)
    // Grid total height = 500, viewport starts at y=10000 — nothing visible
    const visible = filterVisibleCells(cells, 0, { top: 10000, bottom: 10720 })
    expect(visible).toEqual([])
  })

  it('defaults overscan to 0', () => {
    const { cells } = build(10)
    // Viewport exactly one cell tall; with overscan=0 we see only cells
    // whose box intersects the 0–100 range.
    const visible = filterVisibleCells(cells, 0, { top: 0, bottom: 100 })
    // c0 occupies y=0..99 (fully inside); c1 starts at y=100 (edge-touching)
    expect(visible.map((c) => c.id)).toContain('c0')
    expect(visible.map((c) => c.id)).toContain('c1')
  })
})
