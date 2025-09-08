import { test, expect } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import {
  useMasonry,
  createHeightCell,
  createGridCssVarsStyle,
  createCellCssVarsStyle,
  type Cell,
} from '../src/index'

test('DOM elements remain stable during shuffle, only CSS variables change', async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  const initialCells: Cell[] = [
    createHeightCell('A', 100),
    createHeightCell('B', 150),
    createHeightCell('C', 80),
  ]

  const shuffledCells: Cell[] = [
    createHeightCell('C', 80),
    createHeightCell('A', 100),
    createHeightCell('B', 150),
  ]

  function TestMasonry({ cells }: { cells: Cell[] }) {
    const { gridRef, stableCells } = useMasonry(cells, {
      gridWidth: 600,
      gap: 10,
      columnWidth: 200,
      getGridStyle: createGridCssVarsStyle(),
      getCellStyle: createCellCssVarsStyle(),
    })

    return (
      <div ref={gridRef} className="masonry-grid">
        {stableCells.map((cell) => (
          <div
            key={cell.id}
            className="absolute w-[var(--mk-cell-width)] h-[var(--mk-cell-height)] translate-x-[var(--mk-cell-x)] translate-y-[var(--mk-cell-y)] translate-z-0 cell"
          >
            Content {cell.id}
          </div>
        ))}
      </div>
    )
  }

  // Render initial
  await act(async () => {
    root.render(<TestMasonry cells={initialCells} />)
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  // Capture initial state
  const initialElements = Array.from(container.querySelectorAll('.cell')) as HTMLElement[]
  const initialState = initialElements.map((el, index) => ({
    index,
    element: el,
    content: el.textContent!.trim(),
    x: el.style.getPropertyValue('--mk-cell-x'),
    y: el.style.getPropertyValue('--mk-cell-y'),
  }))

  // Render shuffled
  await act(async () => {
    root.render(<TestMasonry cells={shuffledCells} />)
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  // Capture shuffled state
  const shuffledElements = Array.from(container.querySelectorAll('.cell')) as HTMLElement[]
  const shuffledState = shuffledElements.map((el, index) => ({
    index,
    element: el,
    content: el.textContent!.trim(),
    x: el.style.getPropertyValue('--mk-cell-x'),
    y: el.style.getPropertyValue('--mk-cell-y'),
  }))

  // Verify DOM stability
  for (let i = 0; i < initialState.length; i++) {
    const initial = initialState[i]!
    const shuffled = shuffledState[i]!

    expect(shuffled.element).toBe(initial.element)
    expect(shuffled.content).toBe(initial.content)
  }

  // Verify positions changed
  const positionsChanged = initialState.some((initial, index) => {
    const shuffled = shuffledState[index]!
    return initial.x !== shuffled.x || initial.y !== shuffled.y
  })

  expect(positionsChanged).toBe(true)

  // Cleanup
  document.body.removeChild(container)
})
