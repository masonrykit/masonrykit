/**
 * Tests for the hook's opt-in options:
 *   - initialGridWidth (SSR hydration-safe initial width)
 *   - breakpoints (responsive columnWidth/gap)
 *   - measuredCell (ResizeObserver-driven content heights)
 *   - startViewTransition (safe wrapper for View Transitions API)
 *   - virtualize (viewport-filtered visibleCells)
 */
import { describe, it, expect, assert } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { heightCell, measuredCell, startViewTransition, useMasonry, type Cell } from '../src/index'

function $(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector(selector)
  assert.instanceOf(el, HTMLElement, `no element matching ${selector}`)
  return el
}

describe('initialGridWidth', () => {
  it('seeds the layout before ResizeObserver has fired', async () => {
    const { result } = await renderHook(() =>
      useMasonry([heightCell('a', 100)], { columnWidth: 100, initialGridWidth: 300 }),
    )
    // Even without a mounted grid element, the hook's first-render layout
    // reflects the initial width.
    expect(result.current.layout.columns.count).toBe(3)
  })
})

describe('breakpoints', () => {
  it('applies the largest matching entry', async () => {
    const cells: Cell[] = [heightCell('a', 50), heightCell('b', 50), heightCell('c', 50)]

    // gridWidth 1200 → matches the 768 entry; doesn't reach the 1280 entry.
    // That entry requests columnWidth=200, gap=8. The resolved column count is
    // floor((1200+8) / (200+8)) = 5 and the layout fills the grid, so we
    // verify the gap and column count rather than the widened column width.
    const { result } = await renderHook(() =>
      useMasonry(cells, {
        gridWidth: 1200,
        breakpoints: [
          { minWidth: 0, columnWidth: 100, gap: 0 },
          { minWidth: 768, columnWidth: 200, gap: 8 },
          { minWidth: 1280, columnWidth: 300, gap: 16 },
        ],
      }),
    )
    expect(result.current.layout.columns.count).toBe(5)
    expect(result.current.layout.columns.gap).toBe(8)
  })

  it('falls through to columnWidth/gap when no entry matches', async () => {
    const { result } = await renderHook(() =>
      useMasonry([heightCell('a', 50)], {
        gridWidth: 500,
        columnWidth: 80,
        gap: 4,
        breakpoints: [{ minWidth: 768, columnWidth: 200, gap: 8 }],
      }),
    )
    expect(result.current.layout.columns.width).toBe(80)
    expect(result.current.layout.columns.gap).toBe(4)
  })
})

describe('startViewTransition', () => {
  it('eventually runs the callback (sync or async)', async () => {
    await new Promise<void>((resolve) => {
      startViewTransition(() => {
        resolve()
      })
    })
    // If we got here, the callback ran. The API is a fire-and-forget wrapper;
    // in browsers without View Transitions it runs synchronously, otherwise
    // inside the browser's transition scheduler. Consumers pair this with
    // `viewTransitionName: 'mk-' + cell.id` on each animating cell — the
    // hook does not do that wiring.
    expect(true).toBe(true)
  })
})

describe('measuredCell', () => {
  it('reflows once the content height is measured', async () => {
    function Test() {
      const { stableCells, gridRef, cellRef, layout } = useMasonry(
        [measuredCell('a', { estimatedHeight: 20 }), heightCell('b', 50)],
        { gridWidth: 200, columnWidth: 100, gap: 0 },
      )
      return (
        <div ref={gridRef} style={{ position: 'relative', height: layout.height }}>
          {stableCells.map((cell) => (
            <div
              key={cell.id}
              ref={cellRef(cell.id)}
              data-id={cell.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: cell.width,
                // `undefined` omits the property so measured cells keep
                // `height: auto` from the UA default and content drives the box.
                height: cell.id === 'a' ? undefined : cell.height,
                transform: `translate(${cell.x}px, ${cell.y}px)`,
              }}
            >
              {cell.id === 'a' ? <div style={{ height: 150, width: 100 }}>content</div> : null}
            </div>
          ))}
        </div>
      )
    }

    const screen = await render(<Test />)
    const a = $(screen.container, '[data-id="a"]')

    // Height gets set from the ResizeObserver readout (150px). Poll because
    // ResizeObserver fires asynchronously.
    await expect
      .poll(() => Math.round(a.getBoundingClientRect().height), { timeout: 1000 })
      .toBe(150)
  })
})

describe('virtualize', () => {
  it('visibleCells === stableCells when disabled', async () => {
    const { result } = await renderHook(() =>
      useMasonry(
        Array.from({ length: 10 }, (_, i) => heightCell(`c${i}`, 50)),
        { gridWidth: 200, columnWidth: 100, gap: 0 },
      ),
    )
    expect(result.current.visibleCells).toBe(result.current.stableCells)
  })

  it('filters cells to the viewport when enabled', async () => {
    // 50 cells of height 100 in a single column → a very tall grid.
    // Render into a scrollable container with a small viewport.
    const cells = Array.from({ length: 50 }, (_, i) => heightCell(`c${i}`, 100))

    function Test() {
      const { stableCells, visibleCells, gridRef, cellRef, layout } = useMasonry(cells, {
        gridWidth: 200,
        columnWidth: 200,
        gap: 0,
        virtualize: { overscan: 50 },
      })
      return (
        <>
          <div
            ref={gridRef}
            className="grid"
            data-visible={visibleCells.length}
            style={{ position: 'relative', height: layout.height }}
          >
            {visibleCells.map((cell) => (
              <div
                key={cell.id}
                ref={cellRef(cell.id)}
                data-id={cell.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: cell.width,
                  height: cell.height,
                  transform: `translate(${cell.x}px, ${cell.y}px)`,
                }}
              />
            ))}
          </div>
          <div data-stable={stableCells.length} />
        </>
      )
    }

    const screen = await render(<Test />)
    const grid = $(screen.container, '.grid')

    // With overscan=50 and a window viewport (default Chromium test size),
    // we expect to see a subset of cells.
    await expect.poll(() => Number(grid.dataset.visible), { timeout: 500 }).toBeLessThan(50)
    // But we should still see at least the cells intersecting the top of the viewport.
    expect(Number(grid.dataset.visible)).toBeGreaterThan(0)
    // stableCells always has all cells.
    expect($(screen.container, '[data-stable]').dataset.stable).toBe('50')
  })

  it("measures cells outside the viewport so scrolling doesn't shift the layout", async () => {
    // 50 height cells + 1 measured cell well below the viewport. If the
    // library only rendered cells inside the viewport, the measured cell
    // would never mount, its ResizeObserver would never fire, and the
    // layout height would stay at the estimated total. Scrolling to it
    // later would then trigger a visible shift when the real height landed.
    const cells = [
      ...Array.from({ length: 50 }, (_, i) => heightCell(`h${i}`, 100)),
      measuredCell('m1', { estimatedHeight: 100 }),
    ]

    function Test() {
      const { visibleCells, gridRef, cellRef, layout } = useMasonry(cells, {
        gridWidth: 200,
        columnWidth: 200,
        gap: 0,
        virtualize: { overscan: 50 },
      })
      return (
        <div
          ref={gridRef}
          className="grid"
          data-height={layout.height}
          style={{ position: 'relative', height: layout.height }}
        >
          {visibleCells.map((cell) => (
            <div
              key={cell.id}
              ref={cellRef(cell.id)}
              data-id={cell.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: cell.width,
                height: cell.id === 'm1' ? undefined : cell.height,
                transform: `translate(${cell.x}px, ${cell.y}px)`,
              }}
            >
              {cell.id === 'm1' ? <div style={{ height: 200, width: 200 }}>measured</div> : null}
            </div>
          ))}
        </div>
      )
    }

    const screen = await render(<Test />)
    const grid = $(screen.container, '.grid')

    // Grid height should settle at 5200 (50 * 100 + m1's measured 200px).
    // If m1 were never rendered, the layout would keep m1 at its estimated
    // 100px and the total would be 5100.
    await expect.poll(() => Number(grid.dataset.height), { timeout: 2000 }).toBe(5200)
  })
})
