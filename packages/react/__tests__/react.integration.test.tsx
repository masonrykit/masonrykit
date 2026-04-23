import { describe, it, expect } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { aspectCell, heightCell, useMasonry, type Cell } from '../src/index'

describe('@masonrykit/react', () => {
  it('computes layout correctly via renderHook', async () => {
    const { result } = await renderHook(() => {
      const cells: Cell[] = [heightCell('a', 100), aspectCell('b', 1), heightCell('c', 50)]
      return useMasonry(cells, { gridWidth: 400, gap: 10, columnWidth: 180 })
    })

    expect(result.current.layout.columns.count).toBe(2)
    expect(result.current.layout.cells.length).toBe(3)
    expect(result.current.stableCells.length).toBe(3)
  })

  it('handles an empty cells array', async () => {
    const { result } = await renderHook(() =>
      useMasonry([], { gridWidth: 400, gap: 10, columnWidth: 180 }),
    )
    expect(result.current.layout.cells.length).toBe(0)
    expect(result.current.stableCells.length).toBe(0)
  })

  it('auto-measures width when gridWidth is not provided', async () => {
    function Test() {
      const cells: Cell[] = [heightCell('a', 100)]
      const { layout, getGridProps, getCellProps, stableCells } = useMasonry(cells, {
        gap: 10,
        columnWidth: 180,
      })
      return (
        <div {...getGridProps({ style: { width: '400px' } })} data-width={layout.width}>
          {stableCells.map((c) => (
            <span key={c.id} {...getCellProps(c)}>
              {c.id}
            </span>
          ))}
        </div>
      )
    }

    const screen = await render(<Test />)
    const el = screen.container.querySelector('[data-width]') as HTMLElement
    // Retry-able: wait until ResizeObserver has reported a positive width.
    await expect.poll(() => Number(el.dataset.width)).toBeGreaterThan(0)
  })
})
