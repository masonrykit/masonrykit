/**
 * @masonrykit/browser
 *
 * Browser-specific utilities for MasonryKit.
 */

export * from '@masonrykit/core'

export function observeElementWidth(
  element: Element | null | undefined,
  onWidth: (width: number) => void,
): () => void {
  if (typeof window === 'undefined' || !element) {
    return () => {}
  }

  let disposed = false
  const measure = () => {
    if (disposed) return
    const rect = (element as HTMLElement).getBoundingClientRect?.()
    if (rect) onWidth(rect.width)
  }

  measure()

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => raf(measure))
    ro.observe(element)
    return () => {
      disposed = true
      ro.disconnect()
    }
  } else {
    // Fallback to window resize listener
    const handleResize = () => raf(measure)
    window.addEventListener('resize', handleResize)
    return () => {
      disposed = true
      window.removeEventListener('resize', handleResize)
    }
  }
}

export function raf(fn: () => void) {
  if (typeof window === 'undefined') {
    fn()
    return
  }
  window.requestAnimationFrame(() => fn())
}

export function parseCssNumber(v: string | null | undefined): number | undefined {
  if (!v) return undefined
  const n = parseFloat(v.trim())
  return Number.isFinite(n) ? n : undefined
}

export function getCssNumber(el: Element, ...names: string[]): number | undefined {
  if (typeof window === 'undefined') return undefined
  const cs = window.getComputedStyle(el as Element)
  for (const name of names) {
    const v = cs.getPropertyValue(name)
    const n = parseCssNumber(v)
    if (typeof n === 'number') return n
  }
  return undefined
}
