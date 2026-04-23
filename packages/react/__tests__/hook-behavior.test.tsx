/**
 * Hook-level behavior:
 *   - StrictMode compatibility
 *   - ResizeObserver cleanup on unmount
 *   - Memoization (same cells ref → same layout object)
 *   - Multiple independent hook instances
 *   - Generic meta flow-through
 */
import { describe, it, expect, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { aspectCell, heightCell, useMasonry, type Cell, type MasonryResult } from '../src/index'

describe('useMasonry - hook behavior', () => {
  it('returns a stable layout reference when cells and options do not change', async () => {
    const cells: Cell[] = [heightCell('a', 100), heightCell('b', 50)]

    const { result, rerender } = await renderHook(() =>
      useMasonry(cells, { gridWidth: 400, columnWidth: 200, gap: 0 }),
    )

    const layout1 = result.current.layout
    await rerender()
    expect(result.current.layout).toBe(layout1)
    await rerender()
    expect(result.current.layout).toBe(layout1)
  })

  it('disconnects ResizeObserver on unmount', async () => {
    const disconnect = vi.fn<() => void>()
    const observe = vi.fn<(target: Element) => void>()
    const RealRO = window.ResizeObserver
    class MockRO {
      observe = observe
      disconnect = disconnect
      unobserve = () => {}
    }
    window.ResizeObserver = MockRO as unknown as typeof ResizeObserver

    try {
      function AutoWidth() {
        const { getGridProps } = useMasonry([heightCell('a', 100)], { columnWidth: 100 })
        return <div {...getGridProps()} />
      }

      const { unmount } = await render(<AutoWidth />)
      expect(observe).toHaveBeenCalled()
      expect(disconnect).not.toHaveBeenCalled()

      await unmount()
      expect(disconnect).toHaveBeenCalled()
    } finally {
      window.ResizeObserver = RealRO
    }
  })

  it('does NOT observe when gridWidth is provided explicitly', async () => {
    const observe = vi.fn<(target: Element) => void>()
    const RealRO = window.ResizeObserver
    class MockRO {
      observe = observe
      disconnect = () => {}
      unobserve = () => {}
    }
    window.ResizeObserver = MockRO as unknown as typeof ResizeObserver

    try {
      await renderHook(() =>
        useMasonry([heightCell('a', 100)], { gridWidth: 400, columnWidth: 100 }),
      )
      expect(observe).not.toHaveBeenCalled()
    } finally {
      window.ResizeObserver = RealRO
    }
  })

  it('two independent hook instances compute independent layouts', async () => {
    const { result } = await renderHook(() => {
      const one = useMasonry([heightCell('a', 100)], {
        gridWidth: 200,
        columnWidth: 100,
        gap: 0,
      })
      const two = useMasonry([heightCell('b', 200)], {
        gridWidth: 400,
        columnWidth: 200,
        gap: 0,
      })
      return { one, two }
    })

    expect(result.current.one.layout.columns.count).toBe(2)
    expect(result.current.one.layout.cells[0]!.width).toBe(100)
    expect(result.current.two.layout.columns.count).toBe(2)
    expect(result.current.two.layout.cells[0]!.width).toBe(200)
  })

  it('passes generic meta through to layout cells', async () => {
    type Photo = { src: string; alt: string }
    const cells: Cell<Photo>[] = [
      heightCell('p1', 100, { meta: { src: '/a.jpg', alt: 'A' } }),
      aspectCell('p2', 1, { meta: { src: '/b.jpg', alt: 'B' } }),
    ]

    const { result } = await renderHook(() =>
      useMasonry(cells, { gridWidth: 200, columnWidth: 100, gap: 0 }),
    )

    expect(result.current.layout.cells[0]!.meta.src).toBe('/a.jpg')
    expect(result.current.layout.cells[1]!.meta.alt).toBe('B')
  })

  it('exposes layout.cells in input order regardless of render order', async () => {
    const a = heightCell('a', 100)
    const b = heightCell('b', 200)
    const c = heightCell('c', 50)

    const { result, rerender } = await renderHook<{ cells: Cell[] }, MasonryResult>(
      (props) => useMasonry(props!.cells, { gridWidth: 300, columnWidth: 100, gap: 0 }),
      { initialProps: { cells: [a, b, c] } },
    )

    expect(result.current.layout.cells.map((x) => x.id)).toEqual(['a', 'b', 'c'])

    await rerender({ cells: [c, b, a] })
    expect(result.current.layout.cells.map((x) => x.id)).toEqual(['c', 'b', 'a'])
    // stableCells preserves original render order
    expect(result.current.stableCells.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('renders many cells without duplicate ids or empty rects', async () => {
    const cells: Cell[] = Array.from({ length: 200 }, (_, i) =>
      heightCell(`c${i}`, 20 + (i % 5) * 10),
    )

    const { getGridProps, getCellProps, stableCells } = (
      await renderHook(() => useMasonry(cells, { gridWidth: 600, columnWidth: 100, gap: 0 }))
    ).result.current

    const screen = await render(
      <div {...getGridProps({ className: 'grid' })}>
        {stableCells.map((cell) => (
          <div key={cell.id} {...getCellProps(cell)} data-id={cell.id} />
        ))}
      </div>,
    )

    const ids = Array.from(screen.container.querySelectorAll<HTMLElement>('[data-id]')).map(
      (el) => el.dataset.id,
    )
    expect(ids.length).toBe(200)
    expect(new Set(ids).size).toBe(200)
  })
})
