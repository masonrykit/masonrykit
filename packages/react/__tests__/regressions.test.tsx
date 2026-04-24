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

describe('StrictMode — tracker survives simulated unmount/remount', () => {
  it('reflows when a cell resizes after StrictMode has settled', async () => {
    // StrictMode simulates an unmount/remount by running the cleanup
    // useEffect between the two mount passes, which disconnects the
    // height tracker and nulls `trackerRef.current`. If no mechanism
    // recovers the tracker, a cell resizing AFTER the initial settle
    // won't be measured and the layout won't reflow.
    //
    // This test mounts in StrictMode, waits for initial measurements,
    // then toggles a cell's inner content from 150px to 250px tall and
    // asserts the grid height grows accordingly.
    function Harness() {
      const [tall, setTall] = useState(false)
      const cells = useMemo(() => [measuredCell('a', { estimatedHeight: 20 })], [])
      const { stableCells, gridRef, cellRef, measuredIds, layout } = useMasonry(cells, {
        gridWidth: 100,
        columnWidth: 100,
        gap: 0,
      })
      return (
        <>
          <button
            type="button"
            data-testid="grow"
            onClick={() => {
              setTall(true)
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
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: cell.width,
                  height: measuredIds.has(cell.id) ? undefined : cell.height,
                  transform: `translate(${cell.x}px, ${cell.y}px)`,
                }}
              >
                <div style={{ height: tall ? 250 : 150, width: 100 }}>{cell.id}</div>
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

    // Initial measurement settles at 150.
    await expect.poll(() => Number(grid.dataset.height), { timeout: 2000 }).toBe(150)

    // Trigger a resize of the cell's content. If the tracker is still
    // live after StrictMode's simulated cleanup, the ResizeObserver
    // fires and the layout grows to 250. If the tracker is dead, the
    // layout stays at 150 and this poll times out.
    await screen.getByTestId('grow').click()

    await expect.poll(() => Number(grid.dataset.height), { timeout: 2000 }).toBe(250)
  })
})

describe('issue #15 — measuredHeights stays empty under StrictMode remount', () => {
  it('re-observes previously-attached cells after the tracker is cleaned up', async () => {
    // Issue #15's root-cause claim (paraphrased): React 18 StrictMode
    // simulates an unmount/remount between the two mount passes; the
    // cleanup effect disconnects the tracker and nulls its ref; React
    // does NOT re-fire cached callback refs on the remount, so the new
    // tracker ends up with zero observers and all measurements are lost.
    //
    // The hook defends against this with an `observedElementsRef` map
    // that the setup effect replays on mount — so even if the cleanup
    // ran spuriously between passes, every still-attached element gets
    // re-observed. This test simulates that flow by unmounting and
    // remounting the grid (forcing the effect cleanup + setup to run),
    // then asserting the measurement still reaches state.
    function Harness({ mounted }: { mounted: boolean }) {
      const cells = useMemo(() => [measuredCell('a', { estimatedHeight: 20 })], [])
      const { stableCells, gridRef, cellRef, measuredIds, layout } = useMasonry(cells, {
        gridWidth: 100,
        columnWidth: 100,
        gap: 0,
      })
      if (!mounted) return null
      return (
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
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: cell.width,
                height: measuredIds.has(cell.id) ? undefined : cell.height,
                transform: `translate(${cell.x}px, ${cell.y}px)`,
              }}
            >
              <div style={{ height: 180, width: 100 }}>{cell.id}</div>
            </div>
          ))}
        </div>
      )
    }

    // Keep the Harness mounted (so useMasonry state persists) but toggle
    // the grid subtree so cellRef sees ref(null) then ref(el) again,
    // analogous to what StrictMode does between its two mount passes.
    function Wrapper() {
      const [mounted, setMounted] = useState(true)
      return (
        <>
          <button
            type="button"
            data-testid="toggle"
            onClick={() => {
              setMounted((m) => !m)
            }}
          />
          <Harness mounted={mounted} />
        </>
      )
    }

    // `<Strict>` is load-bearing here: React double-invokes the hook's
    // mount effect on initial render (cleanup disconnects the tracker,
    // setup re-observes everything from `observedElementsRef`). Without
    // the wrapper this test would only exercise the simpler cellRef
    // detach/re-attach cycle, not the effect's replay path.
    const screen = await render(
      <Strict>
        <Wrapper />
      </Strict>,
    )
    const grid = () => $(screen.container, '[data-testid="grid"]')

    // Initial measurement settles.
    await expect.poll(() => Number(grid().dataset.height), { timeout: 2000 }).toBe(180)

    // Unmount the grid subtree — triggers cellRef(null) and, if
    // `observedElementsRef` doesn't track elements, the tracker forgets
    // about them.
    await screen.getByTestId('toggle').click()
    expect(screen.container.querySelector('[data-testid="grid"]')).toBeNull()

    // Remount.
    await screen.getByTestId('toggle').click()

    // The grid should re-measure and settle at 180 again. With the fix,
    // the effect re-runs its setup and re-observes any still-tracked
    // elements — but here the element is freshly mounted, so the cellRef
    // attach path must also still work.
    await expect.poll(() => Number(grid().dataset.height), { timeout: 2000 }).toBe(180)
  })
})

describe('perf — ref cache prune on cells removal', () => {
  it('cleanly re-measures a cell that was removed and re-added', async () => {
    // The internal `refCacheRef` keeps a per-id ref callback. A prune
    // effect drops entries for ids no longer in `cells`. This test
    // verifies the side-effect we can see from outside: removing and
    // re-adding the same cell id re-measures correctly (no stale
    // cached ref confuses the observer lifecycle).
    function Harness() {
      const [ids, setIds] = useState<string[]>(['a'])
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
            data-testid="remove"
            onClick={() => {
              setIds([])
            }}
          />
          <button
            type="button"
            data-testid="readd"
            onClick={() => {
              setIds(['a'])
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
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: cell.width,
                  height: measuredIds.has(cell.id) ? undefined : cell.height,
                  transform: `translate(${cell.x}px, ${cell.y}px)`,
                }}
              >
                <div style={{ height: 140, width: 100 }}>{cell.id}</div>
              </div>
            ))}
          </div>
        </>
      )
    }

    const screen = await render(<Harness />)
    const grid = () => $(screen.container, '[data-testid="grid"]')

    await expect.poll(() => Number(grid().dataset.height), { timeout: 2000 }).toBe(140)

    await screen.getByTestId('remove').click()
    await expect.poll(() => Number(grid().dataset.height), { timeout: 1000 }).toBe(0)

    await screen.getByTestId('readd').click()
    await expect.poll(() => Number(grid().dataset.height), { timeout: 2000 }).toBe(140)
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
