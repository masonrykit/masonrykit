import { test, expect, assert } from 'vitest'
import { render } from 'vitest-browser-react'
import { heightCell, useMasonry, type Cell } from '../src/index'

test('DOM elements remain stable during shuffle; translate updates to new positions', async () => {
  const initial: Cell[] = [heightCell('A', 100), heightCell('B', 150), heightCell('C', 80)]
  const shuffled: Cell[] = [heightCell('C', 80), heightCell('A', 100), heightCell('B', 150)]

  function Demo({ cells }: { cells: Cell[] }) {
    const { stableCells, getGridProps, getCellProps } = useMasonry(cells, {
      gridWidth: 600,
      columnWidth: 200,
      gap: 10,
    })
    return (
      <div {...getGridProps({ className: 'grid' })}>
        {stableCells.map((cell) => (
          <div key={cell.id} {...getCellProps(cell)} data-id={cell.id}>
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
  const beforeTranslates = before.map((el) => el.style.translate)

  await screen.rerender(<Demo cells={shuffled} />)

  const after = Array.from(grid.children) as HTMLElement[]
  for (let i = 0; i < before.length; i++) {
    expect(after[i]).toBe(before[i])
  }

  const changed = beforeTranslates.some((t, i) => t !== after[i]!.style.translate)
  expect(changed).toBe(true)
})
