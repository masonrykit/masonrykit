/**
 * Regression tests for issues filed against 0.2.0.
 *
 * Both should FAIL against the hook as shipped in 0.2.0; the
 * accompanying fixes in `src/index.tsx` make them pass.
 */
import { describe, it, expect, assert } from 'vitest'
import { StrictMode, useMemo, useState, type ReactNode } from 'react'
import { render } from 'vitest-browser-react'
import { heightCell, measuredCell, useMasonry } from '../src/index'

/** Wrap a tree in StrictMode so React's dev-only double-invocation of
 * effects and refs exercises the hook. Consumers hit this code path
 * whenever their app is wrapped in `<StrictMode>` during development —
 * that's where the regression in issue #9 surfaces. */
function Strict({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>
}

function $(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector(selector)
  assert.instanceOf(el, HTMLElement, `no element matching ${selector}`)
  return el
}

describe('issue #9 — adding measured cells after measurement', () => {
  it('preserves measured heights for existing cells when new cells are added', async () => {
    function Harness() {
      const [ids, setIds] = useState(['a', 'b', 'c'])
      const cells = useMemo(() => ids.map((id) => measuredCell(id, { estimatedHeight: 20 })), [ids])
      const { stableCells, gridRef, cellRef, measuredIds, layout } = useMasonry(cells, {
        gridWidth: 100,
        columnWidth: 100,
        gap: 0,
      })
      return (
        <>
          <button
            type="button"
            data-testid="add"
            onClick={() => {
              setIds((prev) => [...prev, 'd'])
            }}
          />
          <div
            ref={gridRef}
            data-testid="grid"
            data-height={layout.height}
            style={{ position: 'relative', height: layout.height }}
          >
            {stableCells.map((cell) => (
              <div
                key={cell.id}
                ref={cellRef(cell.id)}
                data-id={cell.id}
                data-y={cell.y}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: cell.width,
                  // `undefined` tells React to omit the property, so measured
                  // cells keep `height: auto` from the UA default.
                  height: measuredIds.has(cell.id) ? undefined : cell.height,
                  transform: `translate(${cell.x}px, ${cell.y}px)`,
                }}
              >
                {/* 150px fixed content so the measured height is stable. */}
                <div style={{ height: 150, width: 100 }}>{cell.id}</div>
              </div>
            ))}
          </div>
        </>
      )
    }

    const screen = await render(
      <Strict>
        <Harness />
      </Strict>,
    )
    const grid = $(screen.container, '[data-testid="grid"]')

    // Wait for the three initial cells to get measured to 150px each. Grid
    // height settles at 3 × 150 = 450.
    await expect.poll(() => Number(grid.dataset.height), { timeout: 2000 }).toBe(450)

    // cell c should sit below a + b (each 150)
    const cBefore = Number($(screen.container, '[data-id="c"]').dataset.y)
    expect(cBefore).toBe(300)

    // Add a 4th cell.
    await screen.getByTestId('add').click()

    // After add: a/b/c should KEEP their measured y positions; d lands below c.
    // If the hook loses measurements on cells-change, a/b/c would fall back to
    // estimatedHeight (20) and the layout would collapse: c would sit at y=40
    // and d at y=60. That's the bug we're guarding against.
    await expect
      .poll(() => Number($(screen.container, '[data-id="c"]').dataset.y), { timeout: 1000 })
      .toBe(300)

    // Grid height grows to include d. d starts at estimatedHeight=20, then
    // the ResizeObserver fires and settles at 150. Poll for the final value.
    await expect.poll(() => Number(grid.dataset.height), { timeout: 2000 }).toBe(600)

    // cell d should sit below the measured c (y=300, height=150)
    const dY = Number($(screen.container, '[data-id="d"]').dataset.y)
    expect(dY).toBe(450)
  })
})

describe('issue #10 — gridRef element mounts after initial render', () => {
  it('attaches the width observer when the grid element arrives after mount', async () => {
    // Simulates a component that shows a loading state first and only mounts
    // the grid once data is ready. If the hook's width-observer effect
    // latches on the initial null element, it'll never re-attach and cells
    // render with width: 0 forever.
    function Harness() {
      const [ready, setReady] = useState(false)
      const { stableCells, gridRef, cellRef, layout } = useMasonry([heightCell('a', 100)], {
        columnWidth: 100,
        gap: 0,
      })
      return (
        <>
          <button
            type="button"
            data-testid="ready"
            onClick={() => {
              setReady(true)
            }}
          />
          {ready ? (
            <div
              ref={gridRef}
              data-testid="grid"
              data-cols={layout.columns.count}
              style={{ position: 'relative', width: 300, height: layout.height }}
            >
              {stableCells.map((cell) => (
                <div
                  key={cell.id}
                  ref={cellRef(cell.id)}
                  data-id={cell.id}
                  data-width={cell.width}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: cell.width,
                    height: cell.height,
                  }}
                />
              ))}
            </div>
          ) : (
            <div data-testid="loading">loading…</div>
          )}
        </>
      )
    }

    const screen = await render(
      <Strict>
        <Harness />
      </Strict>,
    )
    // Grid isn't mounted yet — the hook's width observer has nothing to
    // attach to.
    expect(screen.container.querySelector('[data-testid="grid"]')).toBeNull()

    // Now mount the grid.
    await screen.getByTestId('ready').click()

    // The hook should attach the ResizeObserver once the element arrives and
    // report the measured width. With width=300 and columnWidth=100, the
    // layout should compute 3 columns. If the bug is present, the observer
    // never attaches and the layout stays at 1 column with cell.width ~= 0.
    await expect
      .poll(() => Number($(screen.container, '[data-testid="grid"]').dataset.cols), {
        timeout: 2000,
      })
      .toBe(3)

    // cell a should have width=100 (300px / 3 columns)
    const cellWidth = Number($(screen.container, '[data-id="a"]').dataset.width)
    expect(cellWidth).toBe(100)
  })
})
