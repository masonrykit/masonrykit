import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import {
  Masonry,
  createHeightCell,
  createGridCssVarsStyle,
  createCellCssVarsStyle,
  type Cell,
} from '../src/index'

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

describe('Masonry component', () => {
  let container: HTMLElement
  let root: Root | null = null

  beforeEach(() => {
    container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '0'
    container.style.top = '0'
    container.style.width = '900px'
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) {
      root.unmount()
      root = null
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('renders with function children', async () => {
    const cells: Cell[] = [createHeightCell('a', 100), createHeightCell('b', 150)]

    root!.render(
      <Masonry
        cells={cells}
        gridWidth={400}
        gap={10}
        columnWidth={180}
        getGridStyle={createGridCssVarsStyle()}
        getCellStyle={createCellCssVarsStyle()}
        className="masonry-grid"
      >
        {(cell, index) => (
          <div key={cell.id} data-index={index} className="cell">
            Cell {cell.id}
          </div>
        )}
      </Masonry>,
    )

    await nextFrame()

    const gridEl = container.querySelector('.masonry-grid')
    expect(gridEl).toBeTruthy()

    const cellEls = container.querySelectorAll('.cell')
    expect(cellEls.length).toBe(2)

    // Check that cells have index attributes
    expect(cellEls[0]?.getAttribute('data-index')).toBe('0')
    expect(cellEls[1]?.getAttribute('data-index')).toBe('1')
  })

  it('renders with static children', async () => {
    const cells: Cell[] = [createHeightCell('a', 100)]

    root!.render(
      <Masonry
        cells={cells}
        gridWidth={400}
        gap={10}
        columnWidth={180}
        className="masonry-grid"
        style={{ border: '1px solid red' }}
      >
        <div className="static-child">Static content</div>
      </Masonry>,
    )

    await nextFrame()

    const gridEl = container.querySelector('.masonry-grid') as HTMLElement
    expect(gridEl).toBeTruthy()
    expect(gridEl.style.border).toBe('1px solid red')

    const staticChild = container.querySelector('.static-child')
    expect(staticChild).toBeTruthy()
    expect(staticChild?.textContent).toBe('Static content')
  })
})
