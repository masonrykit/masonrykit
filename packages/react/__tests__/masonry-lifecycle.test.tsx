/**
 * Lifecycle / mutation tests: add, remove, update, option changes.
 */
import { describe, it, expect, assert } from 'vitest'
import { render } from 'vitest-browser-react'
import { heightCell, useMasonry, type Cell, type Stamp } from '../src/index'

type Rect = { x: number; y: number; width: number; height: number }

function rectOf(el: HTMLElement, parent: HTMLElement): Rect {
  const c = el.getBoundingClientRect()
  const p = parent.getBoundingClientRect()
  return {
    x: Math.round(c.left - p.left),
    y: Math.round(c.top - p.top),
    width: Math.round(c.width),
    height: Math.round(c.height),
  }
}

/** Query helper that throws if the selector misses, with proper typing. */
function $(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector(selector)
  assert.instanceOf(el, HTMLElement, `no element matching ${selector}`)
  return el
}

function cellById(grid: HTMLElement): Map<string, HTMLElement> {
  const map = new Map<string, HTMLElement>()
  for (const el of Array.from(grid.children) as HTMLElement[]) {
    const id = el.dataset.id
    if (id !== undefined) map.set(id, el)
  }
  return map
}

function cell(cells: Map<string, HTMLElement>, id: string): HTMLElement {
  const el = cells.get(id)
  assert.instanceOf(el, HTMLElement, `expected cell ${id} to be rendered`)
  return el
}

type Options = {
  columnWidth?: number
  gap?: number
  gridWidth?: number
  horizontalOrder?: boolean
  stamps?: readonly Stamp[]
}

function Grid({ cells, opts }: { cells: readonly Cell[]; opts: Options }) {
  const { columnWidth = 100, gap = 0, gridWidth = 300, horizontalOrder = false, stamps } = opts

  const { stableCells, gridRef, cellRef, layout } = useMasonry(cells, {
    gridWidth,
    columnWidth,
    gap,
    horizontalOrder,
    ...(stamps ? { stamps } : {}),
  })

  return (
    <div ref={gridRef} className="grid" style={{ position: 'relative', height: layout.height }}>
      {stableCells.map((c) => (
        <div
          key={c.id}
          ref={cellRef(c.id)}
          data-id={c.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: c.width,
            height: c.height,
            transform: `translate(${c.x}px, ${c.y}px)`,
          }}
        />
      ))}
    </div>
  )
}

describe('lifecycle', () => {
  it('appending cells adds new elements, preserves existing DOM nodes', async () => {
    const a = heightCell('a', 100)
    const b = heightCell('b', 150)
    const c = heightCell('c', 80)

    const screen = await render(<Grid cells={[a, b]} opts={{}} />)
    const grid = $(screen.container, '.grid')
    const before = cellById(grid)
    expect(before.size).toBe(2)

    await screen.rerender(<Grid cells={[a, b, c]} opts={{}} />)

    const after = cellById(grid)
    expect(after.size).toBe(3)
    expect(cell(after, 'a')).toBe(cell(before, 'a'))
    expect(cell(after, 'b')).toBe(cell(before, 'b'))
    expect(rectOf(cell(after, 'c'), grid)).toEqual({ x: 200, y: 0, width: 100, height: 80 })
  })

  it('removing cells drops the element and re-lays out the rest', async () => {
    const a = heightCell('a', 100)
    const b = heightCell('b', 150)
    const c = heightCell('c', 80)

    const screen = await render(<Grid cells={[a, b, c]} opts={{}} />)
    const grid = $(screen.container, '.grid')
    expect(cellById(grid).size).toBe(3)

    await screen.rerender(<Grid cells={[a, c]} opts={{}} />)
    const after = cellById(grid)
    expect(after.size).toBe(2)
    expect(after.has('b')).toBe(false)
    expect(rectOf(cell(after, 'a'), grid)).toEqual({ x: 0, y: 0, width: 100, height: 100 })
    expect(rectOf(cell(after, 'c'), grid)).toEqual({ x: 100, y: 0, width: 100, height: 80 })
  })

  it('updating an existing cell reflows only its size, keeps the DOM node', async () => {
    const b = heightCell('b', 100)
    const c = heightCell('c', 100)

    const screen = await render(<Grid cells={[heightCell('a', 100), b, c]} opts={{}} />)
    const grid = $(screen.container, '.grid')
    const beforeA = cell(cellById(grid), 'a')

    await screen.rerender(<Grid cells={[heightCell('a', 250), b, c]} opts={{}} />)

    const after = cellById(grid)
    expect(cell(after, 'a')).toBe(beforeA)
    expect(rectOf(cell(after, 'a'), grid)).toEqual({ x: 0, y: 0, width: 100, height: 250 })
  })

  it('changing columnWidth reflows column count and widths', async () => {
    const cells: Cell[] = [heightCell('a', 60), heightCell('b', 60), heightCell('c', 60)]

    const screen = await render(<Grid cells={cells} opts={{ columnWidth: 100 }} />)
    const grid = $(screen.container, '.grid')
    let ws = cellById(grid)
    expect(rectOf(cell(ws, 'a'), grid).width).toBe(100)
    expect(rectOf(cell(ws, 'c'), grid)).toEqual({ x: 200, y: 0, width: 100, height: 60 })

    await screen.rerender(<Grid cells={cells} opts={{ columnWidth: 150 }} />)
    ws = cellById(grid)
    expect.soft(rectOf(cell(ws, 'a'), grid), 'a').toEqual({ x: 0, y: 0, width: 150, height: 60 })
    expect.soft(rectOf(cell(ws, 'b'), grid), 'b').toEqual({ x: 150, y: 0, width: 150, height: 60 })
    expect.soft(rectOf(cell(ws, 'c'), grid), 'c').toEqual({ x: 0, y: 60, width: 150, height: 60 })
  })

  it('changing gap reflows spacing and grid height', async () => {
    const cells: Cell[] = [heightCell('a', 40), heightCell('b', 40)]

    const screen = await render(<Grid cells={cells} opts={{ columnWidth: 300, gap: 0 }} />)
    const grid = $(screen.container, '.grid')
    let ws = cellById(grid)
    expect(rectOf(cell(ws, 'b'), grid).y).toBe(40)

    await screen.rerender(<Grid cells={cells} opts={{ columnWidth: 300, gap: 20 }} />)
    ws = cellById(grid)
    expect(rectOf(cell(ws, 'b'), grid).y).toBe(60)
    expect(Math.round(grid.getBoundingClientRect().height)).toBe(100)
  })

  it('toggling stamps on/off changes baselines', async () => {
    const cells: Cell[] = [heightCell('a', 50), heightCell('b', 50), heightCell('c', 50)]

    const screen = await render(<Grid cells={cells} opts={{ columnWidth: 100 }} />)
    const grid = $(screen.container, '.grid')
    let ws = cellById(grid)
    expect(rectOf(cell(ws, 'a'), grid).y).toBe(0)

    await screen.rerender(
      <Grid
        cells={cells}
        opts={{ columnWidth: 100, stamps: [{ x: 0, y: 0, width: 200, height: 40 }] }}
      />,
    )
    ws = cellById(grid)
    expect.soft(rectOf(cell(ws, 'a'), grid), 'a').toEqual({ x: 200, y: 0, width: 100, height: 50 })
    expect.soft(rectOf(cell(ws, 'b'), grid), 'b').toEqual({ x: 0, y: 40, width: 100, height: 50 })
    expect.soft(rectOf(cell(ws, 'c'), grid), 'c').toEqual({ x: 100, y: 40, width: 100, height: 50 })

    await screen.rerender(<Grid cells={cells} opts={{ columnWidth: 100 }} />)
    ws = cellById(grid)
    expect(rectOf(cell(ws, 'a'), grid).y).toBe(0)
  })

  it('survives a long sequence of mixed mutations without leaking DOM nodes', async () => {
    let cells: Cell[] = Array.from({ length: 10 }, (_, i) => heightCell(`c${i}`, 50 + (i % 4) * 25))
    const opts: Options = { columnWidth: 100, gap: 10 }
    const screen = await render(<Grid cells={cells} opts={opts} />)
    const grid = $(screen.container, '.grid')

    cells = [...cells, ...Array.from({ length: 5 }, (_, i) => heightCell(`x${i}`, 80))]
    await screen.rerender(<Grid cells={cells} opts={opts} />)
    expect(grid.children.length).toBe(15)

    cells = cells.filter((c) => !c.id.startsWith('c') || Number(c.id.slice(1)) % 2 !== 0)
    await screen.rerender(<Grid cells={cells} opts={opts} />)
    expect(grid.children.length).toBe(cells.length)

    cells = cells.toReversed()
    await screen.rerender(<Grid cells={cells} opts={opts} />)
    expect(grid.children.length).toBe(cells.length)

    await screen.rerender(<Grid cells={cells} opts={{ columnWidth: 150, gap: 10 }} />)
    expect(grid.children.length).toBe(cells.length)

    await screen.rerender(<Grid cells={[]} opts={{ columnWidth: 150, gap: 10 }} />)
    expect(grid.children.length).toBe(0)
    expect(Math.round(grid.getBoundingClientRect().height)).toBe(0)
  })
})
