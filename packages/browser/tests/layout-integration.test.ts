/**
 * End-to-end browser test: observeElementWidth feeds computeLayout, and the
 * resulting layout matches actual rendered DOM geometry.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { computeLayout, observeElementWidth, type Cell } from '../src/index'

function tick(ms = 30): Promise<void> {
  return new Promise<void>((r) => {
    setTimeout(r, ms)
  })
}

describe('observeElementWidth + computeLayout integration', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '300px'
    document.body.append(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('renders cells at pixel-accurate positions from the observed width', async () => {
    const cells: Cell[] = [
      { id: 'a', type: 'height', height: 80 },
      { id: 'b', type: 'height', height: 120 },
      { id: 'c', type: 'height', height: 40 },
    ]

    let latestWidth = 0
    const dispose = observeElementWidth(container, (w) => {
      latestWidth = w
    })

    await tick()
    expect(latestWidth).toBe(300)

    const layout = computeLayout(cells, {
      gridWidth: latestWidth,
      columnWidth: 100,
      gap: 0,
    })
    expect(layout.columns.count).toBe(3)

    // Paint the cells and verify they match layout.
    for (const cell of layout.cells) {
      const el = document.createElement('div')
      el.dataset.id = cell.id
      el.style.position = 'absolute'
      el.style.left = `${cell.x}px`
      el.style.top = `${cell.y}px`
      el.style.width = `${cell.width}px`
      el.style.height = `${cell.height}px`
      container.append(el)
    }

    for (const cell of layout.cells) {
      const el = container.querySelector<HTMLElement>(`[data-id="${cell.id}"]`)!
      const rect = el.getBoundingClientRect()
      const parentRect = container.getBoundingClientRect()
      expect(Math.round(rect.left - parentRect.left)).toBe(cell.x)
      expect(Math.round(rect.top - parentRect.top)).toBe(cell.y)
      expect(Math.round(rect.width)).toBe(cell.width)
      expect(Math.round(rect.height)).toBe(cell.height)
    }

    dispose()
  })

  it('re-emits width when the observed element resizes', async () => {
    const widths: number[] = []
    const dispose = observeElementWidth(container, (w) => {
      widths.push(w)
    })

    await tick()
    container.style.width = '500px'
    await tick(60)
    container.style.width = '250px'
    await tick(60)

    expect(widths[0]).toBe(300)
    expect(widths).toContain(500)
    expect(widths).toContain(250)

    dispose()
  })

  it('stops emitting after dispose', async () => {
    const widths: number[] = []
    const dispose = observeElementWidth(container, (w) => {
      widths.push(w)
    })
    await tick()
    dispose()
    const before = widths.length
    container.style.width = '400px'
    await tick(60)

    // All reports are still the original width — the resize after dispose is ignored.
    expect(widths.every((w) => w === 300)).toBe(true)
    // And no new callbacks fired after dispose.
    expect(widths.length).toBe(before)
  })
})
