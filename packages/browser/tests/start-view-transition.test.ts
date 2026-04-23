import { describe, it, expect, vi, afterEach } from 'vitest'
import { startViewTransition } from '../src/index'

describe('startViewTransition', () => {
  const original = document.startViewTransition?.bind(document)

  afterEach(() => {
    document.startViewTransition = original as unknown as Document['startViewTransition']
  })

  it('calls document.startViewTransition when supported', () => {
    const vt = vi.fn<(cb: () => void) => unknown>((cb) => {
      cb()
      return { finished: Promise.resolve() }
    })
    document.startViewTransition = vt as unknown as Document['startViewTransition']

    const cb = vi.fn<() => void>()
    startViewTransition(cb)
    expect(vt).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('falls back to a synchronous call when unsupported', () => {
    document.startViewTransition = undefined as unknown as Document['startViewTransition']
    const cb = vi.fn<() => void>()
    startViewTransition(cb)
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
