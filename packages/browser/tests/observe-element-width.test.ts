import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { observeElementWidth } from '../src/index'

describe('observeElementWidth', () => {
  let el: HTMLElement

  beforeEach(() => {
    el = document.createElement('div')
    el.style.width = '100px'
    el.style.height = '50px'
    document.body.append(el)
  })

  afterEach(() => {
    el.remove()
  })

  it('calls onWidth immediately with the current width', () => {
    const onWidth = vi.fn<(width: number) => void>()
    const dispose = observeElementWidth(el, onWidth)
    expect(onWidth).toHaveBeenCalledWith(100)
    dispose()
  })

  it('returns a dispose function that stops observing', () => {
    const disconnect = vi.fn<() => void>()
    const observe = vi.fn<(target: Element) => void>()
    class MockRO {
      observe = observe
      disconnect = disconnect
      unobserve = () => {}
    }
    vi.stubGlobal('ResizeObserver', MockRO)

    const onWidth = vi.fn<(width: number) => void>()
    observeElementWidth(el, onWidth)()
    expect(disconnect).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('re-reports width when ResizeObserver fires', async () => {
    const onWidth = vi.fn<(width: number) => void>()
    const dispose = observeElementWidth(el, onWidth)
    onWidth.mockClear()

    el.style.width = '250px'

    // Allow ResizeObserver + rAF to flush.
    await new Promise<void>((r) => {
      setTimeout(r, 50)
    })

    expect(onWidth).toHaveBeenCalledWith(250)
    dispose()
  })
})

describe('@masonrykit/browser re-exports', () => {
  it('re-exports core symbols', async () => {
    const mod = await import('../src/index')
    expect(typeof mod.computeLayout).toBe('function')
    expect(typeof mod.computeColumns).toBe('function')
    expect(typeof mod.columnStampsToPixels).toBe('function')
  })
})
