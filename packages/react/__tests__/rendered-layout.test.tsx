/**
 * Real-browser geometry tests. Renders a headless grid and asserts that
 * `getBoundingClientRect()` of each cell matches the computed layout.
 *
 * The `<Grid>` fixture mirrors the shape the hook documents: `gridRef`
 * + `cellRef(id)` + inline styles on every cell. No stylesheet, no CSS
 * vars — just the same code a consumer would write to put real pixels on
 * screen.
 */
import { describe, it, expect, assert } from 'vitest'
import { Component, type CSSProperties, type ReactNode } from 'react'
import { render } from 'vitest-browser-react'
import {
  aspectCell,
  heightCell,
  useMasonry,
  type Cell,
  type ColumnStamp,
  type LayoutCell,
  type Stamp,
} from '../src/index'

type Rect = { x: number; y: number; width: number; height: number }

function rectOf(child: HTMLElement, parent: HTMLElement): Rect {
  const c = child.getBoundingClientRect()
  const p = parent.getBoundingClientRect()
  return {
    x: Math.round(c.left - p.left),
    y: Math.round(c.top - p.top),
    width: Math.round(c.width),
    height: Math.round(c.height),
  }
}

/**
 * Query helper — throws with a clear message if the selector misses, and
 * returns a properly typed HTMLElement (no `!` or cast needed).
 */
function $(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector(selector)
  assert.instanceOf(el, HTMLElement, `no element matching ${selector}`)
  return el
}

/** Build a per-cell inline style from the raw layout data — exactly what the
 *  README example shows consumers doing. Height is omitted for measured
 *  cells so content drives the box. Generic so it accepts `LayoutCell<M>`
 *  for any `M`. */
function cellStyle<M>(cell: LayoutCell<M>, isMeasured = false): CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: cell.width,
    // `undefined` tells React to omit the property, so measured cells keep
    // `height: auto` from the UA default.
    height: isMeasured ? undefined : cell.height,
    transform: `translate(${cell.x}px, ${cell.y}px)`,
  }
}

function Grid<M = unknown>({
  cells,
  gridWidth = 300,
  columnWidth = 100,
  gap = 0,
  horizontalOrder = false,
  stamps,
  columnStamps,
}: {
  cells: readonly Cell<M>[]
  gridWidth?: number
  columnWidth?: number
  gap?: number
  horizontalOrder?: boolean
  stamps?: readonly Stamp[]
  columnStamps?: readonly ColumnStamp[]
}): React.ReactElement {
  const { stableCells, gridRef, cellRef, layout } = useMasonry<M>(cells, {
    gridWidth,
    columnWidth,
    gap,
    horizontalOrder,
    ...(stamps ? { stamps } : {}),
    ...(columnStamps ? { columnStamps } : {}),
  })
  return (
    <div ref={gridRef} className="grid" style={{ position: 'relative', height: layout.height }}>
      {stableCells.map((cell) => (
        <div key={cell.id} ref={cellRef(cell.id)} data-id={cell.id} style={cellStyle(cell)} />
      ))}
    </div>
  )
}

class Boundary extends Component<
  { children: ReactNode; onError: (e: Error) => void },
  { error: Error | null }
> {
  override state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  override componentDidCatch(error: Error) {
    this.props.onError(error)
  }
  override render() {
    return this.state.error ? <div data-error="1" /> : this.props.children
  }
}

describe('rendered geometry', () => {
  it('renders each cell at its computed (x, y, width, height)', async () => {
    const cells: Cell[] = [
      heightCell('a', 100),
      heightCell('b', 200),
      heightCell('c', 50),
      heightCell('d', 150),
    ]

    const screen = await render(<Grid cells={cells} gridWidth={600} columnWidth={200} gap={0} />)
    const grid = $(screen.container, '.grid')

    // Use expect.soft so a single layout bug reports ALL mismatching cells,
    // not just the first — much faster to diagnose layout regressions.
    const expected: Record<string, Rect> = {
      a: { x: 0, y: 0, width: 200, height: 100 },
      b: { x: 200, y: 0, width: 200, height: 200 },
      c: { x: 400, y: 0, width: 200, height: 50 },
      d: { x: 400, y: 50, width: 200, height: 150 },
    }
    for (const [id, want] of Object.entries(expected)) {
      expect
        .soft(rectOf($(screen.container, `[data-id="${id}"]`), grid), `cell ${id}`)
        .toEqual(want)
    }
    expect(Math.round(grid.getBoundingClientRect().height)).toBe(200)
  })

  it('honors gap in x, y, and grid height', async () => {
    const cells: Cell[] = [heightCell('a', 30), heightCell('b', 30), heightCell('c', 30)]
    const screen = await render(<Grid cells={cells} gridWidth={220} columnWidth={60} gap={20} />)
    const grid = $(screen.container, '.grid')

    const get = (id: string) => $(screen.container, `[data-id="${id}"]`)

    expect.soft(rectOf(get('a'), grid), 'cell a').toEqual({ x: 0, y: 0, width: 60, height: 30 })
    expect.soft(rectOf(get('b'), grid), 'cell b').toEqual({ x: 80, y: 0, width: 60, height: 30 })
    expect.soft(rectOf(get('c'), grid), 'cell c').toEqual({ x: 160, y: 0, width: 60, height: 30 })
    expect(Math.round(grid.getBoundingClientRect().height)).toBe(30)
  })

  it('renders multi-span cells at the correct pixel width', async () => {
    const cells: Cell[] = [heightCell('wide', 50, { columnSpan: 2 }), heightCell('normal', 50)]
    const screen = await render(<Grid cells={cells} gridWidth={300} columnWidth={100} gap={0} />)
    const grid = $(screen.container, '.grid')
    const get = (id: string) => $(screen.container, `[data-id="${id}"]`)

    expect(rectOf(get('wide'), grid)).toEqual({ x: 0, y: 0, width: 200, height: 50 })
    expect(rectOf(get('normal'), grid)).toEqual({ x: 200, y: 0, width: 100, height: 50 })
  })

  it('renders aspect-ratio cells with height = width / ratio', async () => {
    const cells: Cell[] = [aspectCell('square', 1), aspectCell('wide', 2)]
    const screen = await render(<Grid cells={cells} gridWidth={200} columnWidth={100} gap={0} />)
    const grid = $(screen.container, '.grid')
    const get = (id: string) => $(screen.container, `[data-id="${id}"]`)

    expect(rectOf(get('square'), grid)).toEqual({ x: 0, y: 0, width: 100, height: 100 })
    expect(rectOf(get('wide'), grid)).toEqual({ x: 100, y: 0, width: 100, height: 50 })
  })

  it('places cells around a stamp', async () => {
    const stamps: Stamp[] = [{ x: 0, y: 0, width: 200, height: 40 }]
    const cells: Cell[] = [heightCell('a', 50), heightCell('b', 50), heightCell('c', 50)]
    const screen = await render(
      <Grid cells={cells} gridWidth={300} columnWidth={100} gap={0} stamps={stamps} />,
    )
    const grid = $(screen.container, '.grid')
    const get = (id: string) => $(screen.container, `[data-id="${id}"]`)

    expect.soft(rectOf(get('a'), grid), 'a').toEqual({ x: 200, y: 0, width: 100, height: 50 })
    expect.soft(rectOf(get('b'), grid), 'b').toEqual({ x: 0, y: 40, width: 100, height: 50 })
    expect.soft(rectOf(get('c'), grid), 'c').toEqual({ x: 100, y: 40, width: 100, height: 50 })
  })

  it('places cells around a columnStamp', async () => {
    const columnStamps: ColumnStamp[] = [{ column: 0, span: 2, y: 0, height: 40 }]
    const cells: Cell[] = [heightCell('a', 50), heightCell('b', 50), heightCell('c', 50)]
    const screen = await render(
      <Grid cells={cells} gridWidth={300} columnWidth={100} gap={0} columnStamps={columnStamps} />,
    )
    const grid = $(screen.container, '.grid')
    const get = (id: string) => $(screen.container, `[data-id="${id}"]`)

    expect.soft(rectOf(get('a'), grid), 'a').toEqual({ x: 200, y: 0, width: 100, height: 50 })
    expect.soft(rectOf(get('b'), grid), 'b').toEqual({ x: 0, y: 40, width: 100, height: 50 })
    expect.soft(rectOf(get('c'), grid), 'c').toEqual({ x: 100, y: 40, width: 100, height: 50 })
  })

  it('reflows when the container resizes (auto-measured gridWidth)', async () => {
    const cells: Cell[] = [heightCell('a', 50), heightCell('b', 50), heightCell('c', 50)]

    function Test({ width }: { width: number }) {
      const { stableCells, gridRef, cellRef, layout } = useMasonry(cells, {
        columnWidth: 100,
        gap: 0,
      })
      return (
        <div
          ref={gridRef}
          className="grid"
          data-cols={layout.columns.count}
          style={{ position: 'relative', width, height: layout.height }}
        >
          {stableCells.map((cell) => (
            <div key={cell.id} ref={cellRef(cell.id)} data-id={cell.id} style={cellStyle(cell)} />
          ))}
        </div>
      )
    }

    const screen = await render(<Test width={300} />)
    const grid = $(screen.container, '.grid')
    await expect.poll(() => grid.dataset.cols).toBe('3')

    await screen.rerender(<Test width={200} />)
    await expect.poll(() => grid.dataset.cols).toBe('2')

    const firstCell = $(grid, '[data-id="a"]')
    expect(Math.round(firstCell.getBoundingClientRect().width)).toBe(100)
  })

  it('throws when an aspect cell has an invalid ratio', async () => {
    let captured: unknown
    const origError = console.error
    console.error = () => {}

    try {
      await render(
        <Boundary onError={(e) => (captured = e)}>
          <Grid cells={[aspectCell('bad', 0)]} gridWidth={200} columnWidth={100} gap={0} />
        </Boundary>,
      )
      assert.instanceOf(captured, Error)
      // captured is now narrowed to Error — no cast, no `!`
      expect(captured.message).toMatch(/invalid aspectRatio/)
    } finally {
      console.error = origError
    }
  })

  it('layout.cells preserves input order; stableCells preserves render order', async () => {
    const a = heightCell('a', 100)
    const b = heightCell('b', 200)
    const c = heightCell('c', 50)
    let captured: readonly LayoutCell[] = []

    function Probe({ cells }: { cells: readonly Cell[] }) {
      const { stableCells } = useMasonry(cells, { gridWidth: 300, columnWidth: 100, gap: 0 })
      captured = stableCells
      return null
    }

    const screen = await render(<Probe cells={[a, b, c]} />)
    const initialOrder = captured.map((x) => x.id)
    expect(initialOrder).toEqual(['a', 'b', 'c'])

    await screen.rerender(<Probe cells={[c, b, a]} />)
    expect(captured.map((x) => x.id)).toEqual(initialOrder)
  })
})
