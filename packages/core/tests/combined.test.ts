/**
 * Combined-scenario tests: mixed cell types, stamps + columnStamps together,
 * and a large-N stress check for correctness invariants.
 */
import { describe, it, expect } from 'vitest'
import { computeLayout, type Cell } from '../src/index'

describe('@masonrykit/core - combined scenarios', () => {
  it('lays out mixed height and aspect cells in one pass', () => {
    const cells: Cell[] = [
      { id: 'a', type: 'height', height: 80 },
      { id: 'b', type: 'aspect', aspectRatio: 1 }, // square at cw=100
      { id: 'c', type: 'height', height: 40 },
      { id: 'd', type: 'aspect', aspectRatio: 2 }, // half-height at cw=100
    ]

    const layout = computeLayout(cells, { gridWidth: 300, columnWidth: 100, gap: 0 })
    const [a, b, c, d] = layout.cells

    expect(a).toMatchObject({ column: 0, x: 0, y: 0, height: 80 })
    expect(b).toMatchObject({ column: 1, x: 100, y: 0, height: 100 })
    expect(c).toMatchObject({ column: 2, x: 200, y: 0, height: 40 })
    // After c, col 2 is shortest (40). d goes there.
    expect(d).toMatchObject({ column: 2, x: 200, y: 40, height: 50 })
  })

  it('applies both stamps and columnStamps together', () => {
    const cells: Cell[] = [
      { id: 'a', type: 'height', height: 30 },
      { id: 'b', type: 'height', height: 30 },
      { id: 'c', type: 'height', height: 30 },
      { id: 'd', type: 'height', height: 30 },
    ]

    const layout = computeLayout(cells, {
      gridWidth: 400,
      columnWidth: 100,
      gap: 0,
      stamps: [{ x: 0, y: 0, width: 100, height: 40 }], // raises col 0 to 40
      columnStamps: [{ column: 2, span: 1, y: 0, height: 20 }], // raises col 2 to 20
    })

    // Baselines: col0=40, col1=0, col2=20, col3=0
    // Place a → col1, b → col3, c → col2 (y=20), d → col1 (y=30)
    const [a, b, c, d] = layout.cells
    expect(a).toMatchObject({ column: 1, y: 0 })
    expect(b).toMatchObject({ column: 3, y: 0 })
    expect(c).toMatchObject({ column: 2, y: 20 })
    expect(d).toMatchObject({ column: 1, y: 30 })
  })

  it('preserves input order and cell ids across a large input', () => {
    const cells: Cell[] = Array.from({ length: 500 }, (_, i) => ({
      id: `c${i}`,
      type: 'height' as const,
      height: 50 + (i % 7) * 20,
    }))

    const layout = computeLayout(cells, { gridWidth: 800, columnWidth: 100, gap: 8 })

    expect(layout.cells.length).toBe(500)
    expect(layout.cells[0]!.id).toBe('c0')
    expect(layout.cells[499]!.id).toBe('c499')
    // cols = floor((800 + 8) / (100 + 8)) = 7
    expect(layout.columns.count).toBe(7)

    // All positions are non-negative integers
    for (const c of layout.cells) {
      expect(Number.isInteger(c.x)).toBe(true)
      expect(Number.isInteger(c.y)).toBe(true)
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.y).toBeGreaterThanOrEqual(0)
    }

    // No cell's right edge exceeds the grid width
    for (const c of layout.cells) {
      expect(c.x + c.width).toBeLessThanOrEqual(layout.width)
    }
  })

  it('carries generic meta through to LayoutCell', () => {
    type Photo = { src: string; alt: string }

    const cells: Cell<Photo>[] = [
      {
        id: 'p1',
        type: 'height',
        height: 100,
        meta: { src: '/a.jpg', alt: 'A' },
      },
      {
        id: 'p2',
        type: 'aspect',
        aspectRatio: 1,
        meta: { src: '/b.jpg', alt: 'B' },
      },
    ]

    const layout = computeLayout<Photo>(cells, { gridWidth: 200, columnWidth: 100 })
    expect(layout.cells[0]!.meta).toEqual({ src: '/a.jpg', alt: 'A' })
    expect(layout.cells[1]!.meta).toEqual({ src: '/b.jpg', alt: 'B' })
  })

  it('omits meta on LayoutCell when the input omits it', () => {
    const cells: Cell[] = [{ id: 'a', type: 'height', height: 100 }]
    const layout = computeLayout(cells, { gridWidth: 200, columnWidth: 100 })
    expect('meta' in layout.cells[0]!).toBe(false)
  })

  it('handles zero-height cells without breaking placement', () => {
    // A zero-height cell takes no vertical space; the next cell can still pick col 0.
    const cells: Cell[] = [
      { id: 'a', type: 'height', height: 0 },
      { id: 'b', type: 'height', height: 100 },
    ]
    const layout = computeLayout(cells, { gridWidth: 200, columnWidth: 100, gap: 0 })
    expect(layout.cells[0]).toMatchObject({ height: 0, x: 0, y: 0 })
    expect(layout.cells[1]).toMatchObject({ height: 100, x: 0, y: 0 })
    expect(layout.height).toBe(100)
  })

  it('clamps negative height to 0', () => {
    const cells: Cell[] = [{ id: 'a', type: 'height', height: -50 }]
    const layout = computeLayout(cells, { gridWidth: 200, columnWidth: 100 })
    expect(layout.cells[0]!.height).toBe(0)
  })
})
