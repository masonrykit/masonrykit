/**
 * `gridRef` + `cellRef(id)` — the hook's only output surface for ref
 * wiring. These tests cover the behaviors that make the primitives safe
 * to use:
 *
 *   - `gridRef` drives the auto-width `ResizeObserver`
 *   - `cellRef(id)` drives measured-cell reflow
 *   - `cellRef(id)` is a stable no-op for non-measured cells
 *   - `cellRef(id)` function identity is stable per id across renders
 */
import { describe, it, expect, assert } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { heightCell, measuredCell, useMasonry } from '../src/index'

function $(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector(selector)
  assert.instanceOf(el, HTMLElement, `no element matching ${selector}`)
  return el
}

describe('gridRef / cellRef primitives', () => {
  it('`gridRef` drives auto-width observation', async () => {
    // Attach `gridRef`, let the ResizeObserver measure the container
    // width, and verify the hook computed the right column count.
    function Test() {
      const { stableCells, gridRef, layout } = useMasonry([heightCell('a', 50)], {
        columnWidth: 100,
        gap: 0,
      })
      return (
        <div
          ref={gridRef}
          data-columns={layout.columns.count}
          style={{ position: 'relative', width: 300, height: layout.height }}
        >
          {stableCells.map((cell) => (
            <div key={cell.id} data-id={cell.id} />
          ))}
        </div>
      )
    }

    const screen = await render(<Test />)
    const grid = $(screen.container, '[data-columns]')
    await expect.poll(() => grid.dataset.columns).toBe('3')
  })

  it('`cellRef` drives measured-cell reflow', async () => {
    // Attach `cellRef(id)` to a measured cell, put tall content inside,
    // and watch the layout height grow once the ResizeObserver fires.
    function Test() {
      const { stableCells, gridRef, cellRef, layout } = useMasonry(
        [measuredCell('a', { estimatedHeight: 50 })],
        { gridWidth: 200, columnWidth: 200, gap: 0 },
      )
      return (
        <div
          ref={gridRef}
          data-height={layout.height}
          style={{ position: 'relative', height: layout.height }}
        >
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
                // No `height` — content drives the box.
                transform: `translate(${cell.x}px, ${cell.y}px)`,
              }}
            >
              <div style={{ height: 180, width: 200 }}>content</div>
            </div>
          ))}
        </div>
      )
    }

    const screen = await render(<Test />)
    const grid = $(screen.container, '[data-height]')
    // Height starts at the estimate (50) and jumps to the measured 180.
    await expect.poll(() => Number(grid.dataset.height), { timeout: 1000 }).toBe(180)
  })

  it('`cellRef` returns a stable no-op for non-measured cells', async () => {
    // Spreading `cellRef(id)` on a non-measured cell should be safe and
    // cheap — the returned ref does nothing. Identity must stay stable
    // across renders so React doesn't re-run attach/detach.
    const { result, rerender } = await renderHook(() =>
      useMasonry([heightCell('a', 100)], { gridWidth: 200, columnWidth: 200, gap: 0 }),
    )
    const first = result.current.cellRef('a')
    await rerender()
    const second = result.current.cellRef('a')
    expect(first).toBe(second)
    // And it really is a no-op — calling it with an element should not
    // throw or mutate state.
    const el = document.createElement('div')
    expect(() => first(el)).not.toThrow()
    expect(() => first(null)).not.toThrow()
  })

  it('`cellRef(id)` for a measured cell is stable across renders', async () => {
    // React uses function identity to decide when to re-run the attach/
    // detach cycle. If `cellRef('m1')` returned a new function every render
    // for a measured cell, the ResizeObserver would re-attach on every
    // render — an O(n) cost per render and a source of subtle bugs.
    const { result, rerender } = await renderHook(() =>
      useMasonry([measuredCell('m1', { estimatedHeight: 100 })], {
        gridWidth: 200,
        columnWidth: 200,
        gap: 0,
      }),
    )
    const first = result.current.cellRef('m1')
    await rerender()
    const second = result.current.cellRef('m1')
    expect(first).toBe(second)
  })
})
