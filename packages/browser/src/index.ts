/**
 * @masonrykit/browser
 *
 * This package now re-exports the core math and helpers from @masonrykit/core.
 * Use this entry when you specifically want a browser-targeted build artifact.
 *
 * Exports include:
 * - computeColumns
 * - computeMasonryLayout
 * - observeElementWidth (SSR-safe; no-ops outside browser)
 * - Types: MasonryItemInput, MasonryOptions, MasonryLayoutResult, etc.
 * - VERSION
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
 */
function raf(fn: () => void) {
  if (typeof window === 'undefined' || !('requestAnimationFrame' in window)) {
    fn()
    return
  }
  window.requestAnimationFrame(() => fn())
}

/**
 * Version of the library at build time. Replaced via bundler define.
 * Falls back to process.env when available, otherwise a neutral default.
 *
 * @public
 */
declare const __MK_VERSION__: string | undefined
declare const process:
  | undefined
  | {
      env?: {
        MASONRYKIT_VERSION?: string
      }
    }
export const VERSION: string =
  typeof __MK_VERSION__ !== 'undefined'
    ? __MK_VERSION__
    : (typeof process !== 'undefined' && process.env?.MASONRYKIT_VERSION) || '0.0.0'
