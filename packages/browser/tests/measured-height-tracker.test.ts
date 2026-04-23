import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMeasuredHeightTracker } from '../src/index'

describe('createMeasuredHeightTracker', () => {
  let el1: HTMLElement
  let el2: HTMLElement

  beforeEach(() => {
    el1 = document.createElement('div')
    el1.style.cssText = 'width: 200px; height: 100px;'
    el2 = document.createElement('div')
    el2.style.cssText = 'width: 200px; height: 150px;'
    document.body.append(el1, el2)
  })

  afterEach(() => {
    el1.remove()
    el2.remove()
  })

  it('emits the measured height once a ResizeObserver fires', async () => {
    const onChange = vi.fn<(id: string, height: number) => void>()
    const tracker = createMeasuredHeightTracker(onChange)
    tracker.observe('a', el1)

    await new Promise<void>((r) => {
      setTimeout(r, 50)
    })

    // RO fires on observe; content height is 100px.
    expect(onChange).toHaveBeenCalledWith('a', 100)
    tracker.disconnect()
  })

  it('ignores 0-height readings (spurious RO fires before layout)', async () => {
    const disconnect = vi.fn<() => void>()
    const observe = vi.fn<(target: Element) => void>()
    let callback: ((entries: ResizeObserverEntry[]) => void) | undefined

    class MockRO {
      constructor(cb: (entries: ResizeObserverEntry[]) => void) {
        callback = cb
      }
      observe = observe
      disconnect = disconnect
      unobserve = () => {}
    }

    vi.stubGlobal('ResizeObserver', MockRO)

    const onChange = vi.fn<(id: string, height: number) => void>()
    const tracker = createMeasuredHeightTracker(onChange)
    tracker.observe('a', el1)

    // Simulate a 0-height report (would happen if RO fires before child
    // content has laid out).
    callback?.([{ contentRect: { height: 0 }, target: el1 } as unknown as ResizeObserverEntry])
    expect(onChange).not.toHaveBeenCalled()

    // Then a real measurement — should pass through.
    callback?.([{ contentRect: { height: 180 }, target: el1 } as unknown as ResizeObserverEntry])
    expect(onChange).toHaveBeenCalledWith('a', 180)

    tracker.disconnect()
    vi.unstubAllGlobals()
  })

  it('re-observing the same id replaces the previous observer', () => {
    const disconnect = vi.fn<() => void>()
    class MockRO {
      observe = vi.fn<(target: Element) => void>()
      disconnect = disconnect
      unobserve = () => {}
    }
    vi.stubGlobal('ResizeObserver', MockRO)

    const tracker = createMeasuredHeightTracker(() => {})
    tracker.observe('a', el1)
    tracker.observe('a', el2) // should disconnect the first RO

    expect(disconnect).toHaveBeenCalledTimes(1)

    tracker.disconnect()
    vi.unstubAllGlobals()
  })

  it('unobserve disconnects just one id', () => {
    const disconnect = vi.fn<() => void>()
    class MockRO {
      observe = vi.fn<(target: Element) => void>()
      disconnect = disconnect
      unobserve = () => {}
    }
    vi.stubGlobal('ResizeObserver', MockRO)

    const tracker = createMeasuredHeightTracker(() => {})
    tracker.observe('a', el1)
    tracker.observe('b', el2)
    tracker.unobserve('a')

    expect(disconnect).toHaveBeenCalledTimes(1)

    tracker.disconnect()
    vi.unstubAllGlobals()
  })

  it('disconnect tears down every observer', () => {
    const disconnect = vi.fn<() => void>()
    class MockRO {
      observe = vi.fn<(target: Element) => void>()
      disconnect = disconnect
      unobserve = () => {}
    }
    vi.stubGlobal('ResizeObserver', MockRO)

    const tracker = createMeasuredHeightTracker(() => {})
    tracker.observe('a', el1)
    tracker.observe('b', el2)
    tracker.disconnect()

    expect(disconnect).toHaveBeenCalledTimes(2)

    vi.unstubAllGlobals()
  })
})
