import { test, expect, assert } from 'vitest'
import { render } from 'vitest-browser-react'
import { heightCell, useMasonry, type Cell } from '../src/index'

test('DOM elements remain stable during shuffle; cell transforms update', async () => {
  const initial: Cell[] = [heightCell('A', 100), heightCell('B', 150), heightCell('C', 80)]
  const shuffled: Cell[] = [heightCell('C', 80), heightCell('A', 100), heightCell('B', 150)]

  function Demo({ cells }: { cells: Cell[] }) {
    const { stableCells, gridRef, cellRef, layout } = useMasonry(cells, {
      gridWidth: 600,
      columnWidth: 200,
      gap: 10,
    })
    return (
      <div ref={gridRef} className="grid" style={{ position: 'relative', height: layout.height }}>
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
              height: cell.height,
              transform: `translate(${cell.x}px, ${cell.y}px)`,
            }}
          >
            Content {cell.id}
          </div>
        ))}
      </div>
    )
  }

  const screen = await render(<Demo cells={initial} />)
  const grid = screen.container.querySelector('.grid')
  assert.instanceOf(grid, HTMLElement)

  const before = Array.from(grid.children) as HTMLElement[]
  const beforeTransforms = before.map((el) => el.style.transform)

  await screen.rerender(<Demo cells={shuffled} />)

  const after = Array.from(grid.children) as HTMLElement[]
  // Same DOM node identity per id across the shuffle.
  for (let i = 0; i < before.length; i++) {
    expect(after[i]).toBe(before[i])
  }

  // But the transforms updated — cells moved to their new positions.
  const changed = beforeTransforms.some((t, i) => t !== after[i]!.style.transform)
  expect(changed).toBe(true)
})
