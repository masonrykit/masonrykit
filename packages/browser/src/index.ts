/**
 * @masonrykit/browser
 *
 * DOM-level integrations on top of `@masonrykit/core`. Framework-agnostic;
 * the React binding (`@masonrykit/react`) composes these primitives.
 */

export * from '@masonrykit/core'

/**
 * Observe an element's width. Coalesces `ResizeObserver` callbacks through
 * `requestAnimationFrame` so rapid resizes only trigger one measurement per
 * frame. Returns a disposer that disconnects the observer.
 */
export function observeElementWidth(
  element: Element,
  onWidth: (width: number) => void,
): () => void {
  let disposed = false
  let rafId: number | null = null

  const measure = () => {
    rafId = null
    if (disposed) return
    onWidth(element.getBoundingClientRect().width)
  }

  // Initial read is synchronous — most callers want a width on attach so
  // they don't render with `0` on first paint.
  onWidth(element.getBoundingClientRect().width)

  const ro = new ResizeObserver(() => {
    // Guard the rAF so rapid resize events collapse to a single measurement
    // per frame. Without this, every RO entry queues another rAF and we do
    // N `getBoundingClientRect()` reads in one frame.
    if (rafId !== null) return
    rafId = window.requestAnimationFrame(measure)
  })
  ro.observe(element)

  return () => {
    disposed = true
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    ro.disconnect()
  }
}

/* -------------------------------------------------------------------------- */
/* Measured-height tracker                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Per-cell `ResizeObserver` aggregator for `MeasuredCell`. Framework bindings
 * wire one observer per rendered element; the tracker calls `onChange` each
 * time a cell's intrinsic height changes (debounced by the RO itself).
 *
 * Spurious 0-height reports — which can land before a child has laid out —
 * are filtered. The caller sees only measurements with a real height.
 */
export type MeasuredHeightTracker = {
  /**
   * Start observing `element` for height changes, keyed by `id`. If `id` is
   * already observed, the previous observer is disconnected first.
   */
  observe(id: string, element: Element): void
  /** Stop observing the element for `id`. */
  unobserve(id: string): void
  /** Disconnect every observer. Call when tearing down the grid. */
  disconnect(): void
}

export function createMeasuredHeightTracker(
  onChange: (id: string, height: number) => void,
): MeasuredHeightTracker {
  const observers = new Map<string, ResizeObserver>()

  return {
    observe(id, element) {
      observers.get(id)?.disconnect()
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const h = Math.round(entry.contentRect.height)
          // Drop spurious 0-height reports; they land before the child has
          // laid out and would trick a virtualizer into unmounting the cell
          // before the real measurement arrives.
          if (h <= 0) continue
          onChange(id, h)
        }
      })
      ro.observe(element)
      observers.set(id, ro)
    },

    unobserve(id) {
      observers.get(id)?.disconnect()
      observers.delete(id)
    },

    disconnect() {
      for (const ro of observers.values()) ro.disconnect()
      observers.clear()
    },
  }
}

/* -------------------------------------------------------------------------- */
/* View Transitions                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Wraps a callback in `document.startViewTransition` when supported so the
 * browser animates layout changes. Falls back to a synchronous call in
 * browsers without the View Transitions API (Firefox today, older Safari).
 *
 * For React state updates, wrap the body in `flushSync` so the DOM mutation
 * commits before the browser captures the "after" snapshot — otherwise
 * React's async batching will produce identical before/after frames and the
 * transition will silently run no animation.
 *
 * @example
 * startViewTransition(() => {
 *   flushSync(() => setCells(shuffled))
 * })
 */
export function startViewTransition(callback: () => void): void {
  if (typeof document === 'undefined') {
    callback()
    return
  }
  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(callback)
  } else {
    callback()
  }
}
