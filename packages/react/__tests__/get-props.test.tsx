/**
 * getGridProps / getCellProps behavior.
 */
import { describe, it, expect, assert } from 'vitest'
import { createRef } from 'react'
import { render } from 'vitest-browser-react'
import { heightCell, useMasonry, type Cell } from '../src/index'

/** Query helper — throws with a clear message on miss, returns typed HTMLElement. */
function $(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector(selector)
  assert.instanceOf(el, HTMLElement, `no element matching ${selector}`)
  return el
}

describe('getGridProps / getCellProps', () => {
  it('grid gets position:relative, height, and grid CSS vars', async () => {
    const cells: Cell[] = [heightCell('a', 100), heightCell('b', 50)]

    function Test() {
      const { getGridProps, stableCells, getCellProps } = useMasonry(cells, {
        gridWidth: 400,
        columnWidth: 200,
        gap: 0,
      })
      return (
        <section {...getGridProps({ className: 'grid', 'aria-label': 'Photos' })}>
          {stableCells.map((cell) => (
            <article key={cell.id} {...getCellProps(cell)}>
              {cell.id}
            </article>
          ))}
        </section>
      )
    }

    const screen = await render(<Test />)
    const grid = screen.getByLabelText('Photos')
    await expect.element(grid).toBeInTheDocument()
    await expect.element(grid).toHaveStyle({ position: 'relative', height: '100px' })
    // CSS custom properties aren't typed in CSSStyleDeclaration; read raw.
    const el = $(screen.container, '.grid')
    expect(el.style.getPropertyValue('--mk-grid-width')).toBe('400px')
    expect(el.style.getPropertyValue('--mk-grid-columns')).toBe('2')
  })

  it('cell gets position:absolute, size, translate, and cell CSS vars', async () => {
    const cells: Cell[] = [heightCell('a', 100), heightCell('b', 50)]

    function Test() {
      const { getGridProps, stableCells, getCellProps } = useMasonry(cells, {
        gridWidth: 400,
        columnWidth: 200,
        gap: 0,
      })
      return (
        <div {...getGridProps()}>
          {stableCells.map((cell) => (
            <div key={cell.id} {...getCellProps(cell)} data-id={cell.id} />
          ))}
        </div>
      )
    }

    const screen = await render(<Test />)
    const a = $(screen.container, '[data-id="a"]')
    expect(a.style.position).toBe('absolute')
    expect(a.style.top).toBe('0px')
    expect(a.style.left).toBe('0px')
    expect(a.style.width).toBe('200px')
    expect(a.style.height).toBe('100px')
    // Browsers normalize `translate: 0px 0px` to `0px`.
    expect(a.style.translate).toBe('0px')
    expect(a.style.getPropertyValue('--mk-cell-x')).toBe('0px')
    expect(a.style.getPropertyValue('--mk-cell-width')).toBe('200px')
    expect(a.style.getPropertyValue('--mk-cell-column')).toBe('0')

    const b = $(screen.container, '[data-id="b"]')
    expect(b.style.translate).toBe('200px')
    expect(b.style.getPropertyValue('--mk-cell-column')).toBe('1')
  })

  it('merges user style; user overrides on non-positioning keys', async () => {
    function Test() {
      const { getGridProps, stableCells, getCellProps } = useMasonry([heightCell('a', 100)], {
        gridWidth: 400,
        columnWidth: 200,
        gap: 0,
      })
      return (
        <div
          {...getGridProps({
            style: { background: 'red', border: '1px solid blue' },
          })}
          data-grid
        >
          {stableCells.map((cell) => (
            <div
              key={cell.id}
              {...getCellProps(cell, {
                style: { opacity: 0.5, transition: 'translate 200ms ease' },
              })}
              data-id={cell.id}
            />
          ))}
        </div>
      )
    }

    const screen = await render(<Test />)
    const grid = $(screen.container, '[data-grid]')
    expect(grid.style.position).toBe('relative')
    expect(grid.style.background).toBe('red')
    expect(grid.style.border).toBe('1px solid blue')

    const cell = $(screen.container, '[data-id="a"]')
    expect(cell.style.position).toBe('absolute')
    expect(cell.style.translate).toBe('0px')
    expect(cell.style.opacity).toBe('0.5')
    expect(cell.style.transition).toBe('translate 200ms')
  })

  it('user transform does not conflict with library translate', async () => {
    function Test() {
      const { getGridProps, stableCells, getCellProps } = useMasonry([heightCell('a', 100)], {
        gridWidth: 400,
        columnWidth: 200,
        gap: 0,
      })
      return (
        <div {...getGridProps()}>
          {stableCells.map((cell) => (
            <div
              key={cell.id}
              {...getCellProps(cell, { style: { transform: 'scale(0.95)' } })}
              data-id={cell.id}
            />
          ))}
        </div>
      )
    }

    const screen = await render(<Test />)
    const el = $(screen.container, '[data-id="a"]')
    expect(el.style.transform).toBe('scale(0.95)')
    expect(el.style.translate).toBe('0px')
  })

  it('composes user refs with the library ref (grid)', async () => {
    const userRef = createRef<HTMLElement>()

    function Test() {
      const { getGridProps, stableCells, getCellProps } = useMasonry([heightCell('a', 100)], {
        gridWidth: 400,
        columnWidth: 200,
        gap: 0,
      })
      return (
        <section {...getGridProps({ ref: userRef })}>
          {stableCells.map((cell) => (
            <div key={cell.id} {...getCellProps(cell)} />
          ))}
        </section>
      )
    }

    await render(<Test />)
    // assert narrows userRef.current to HTMLElement, so .tagName works without `?.`
    assert.instanceOf(userRef.current, HTMLElement)
    expect(userRef.current.tagName).toBe('SECTION')
  })

  it('composes user refs with the library ref (cell)', async () => {
    const userRef = createRef<HTMLElement>()

    function Test() {
      const { getGridProps, stableCells, getCellProps } = useMasonry([heightCell('a', 100)], {
        gridWidth: 400,
        columnWidth: 200,
        gap: 0,
      })
      return (
        <div {...getGridProps()}>
          {stableCells.map((cell) => (
            <article key={cell.id} {...getCellProps(cell, { ref: userRef })}>
              {cell.id}
            </article>
          ))}
        </div>
      )
    }

    await render(<Test />)
    assert.instanceOf(userRef.current, HTMLElement)
    expect(userRef.current.tagName).toBe('ARTICLE')
  })

  it('passes through HTML attributes and event handlers (userEvent click)', async () => {
    let clicked = false

    function Test() {
      const { getGridProps, stableCells, getCellProps } = useMasonry([heightCell('a', 100)], {
        gridWidth: 400,
        columnWidth: 200,
        gap: 0,
      })
      return (
        <div {...getGridProps()}>
          {stableCells.map((cell) => (
            <button
              type="button"
              key={cell.id}
              {...getCellProps(cell, {
                onClick: () => {
                  clicked = true
                },
                'aria-label': 'open',
              })}
            >
              {cell.id}
            </button>
          ))}
        </div>
      )
    }

    const screen = await render(<Test />)
    await screen.getByRole('button', { name: 'open' }).click()
    expect(clicked).toBe(true)
  })
})
