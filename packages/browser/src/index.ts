/**
 * @masonrykit/browser
 *
 * Browser-only helpers for MasonryKit.
 *
 * Exports include:
 * - observeElementWidth (SSR-safe; no-ops outside browser)
 * - raf (requestAnimationFrame wrapper)
 * - parseCssNumber, getCssNumber
 */

export * from '@masonrykit/core'

/**
 * Observe an element's width and invoke a callback when it changes.
 * Returns a disposer function to stop observing.
 *
 * Notes:
 * - Calls the callback once immediately with the current width (if available).
 * - Uses ResizeObserver when available, otherwise falls back to a window resize listener.
 * - Safe for SSR: no-ops when not in a browser environment.
 *
 * @public
 */
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

  // Initial call
  measure()

  // Prefer ResizeObserver if present
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => raf(measure))
    ro.observe(element)
    return () => {
      disposed = true
      ro.disconnect()
    }
  }

  // Fallback to window resize
  const handler = () => raf(measure)
  window.addEventListener('resize', handler, { passive: true })
  return () => {
    disposed = true
    window.removeEventListener('resize', handler)
  }
}

/**
 * Tiny requestAnimationFrame wrapper to coalesce rapid calls.
 * @public
 */
export function raf(fn: () => void) {
  if (typeof window === 'undefined' || !('requestAnimationFrame' in window)) {
    fn()
    return
  }
  window.requestAnimationFrame(() => fn())
}

/**
 * Parse a CSS number from a string value. Returns undefined if the value
 * is not a finite number.
 * @public
 */
export function parseCssNumber(v: string | null | undefined): number | undefined {
  if (!v) return undefined
  const n = parseFloat(String(v).trim())
  return Number.isFinite(n) ? n : undefined
}

/**
 * Read the first defined numeric CSS custom property from the element.
 * Supports unitless or px values (e.g. "12" or "12px").
 * Returns undefined if none are valid numbers.
 * @public
 */
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

// VERSION is re-exported from @masonrykit/core
