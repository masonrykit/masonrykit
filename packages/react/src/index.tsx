/**
 * @masonrykit/react
 *
 * React bindings for MasonryKit. The hook computes the layout and hands
 * back two things:
 *
 *   1. `gridRef` + `cellRef(id)` — refs that wire the DOM observers
 *      (grid auto-width measurement and per-cell `ResizeObserver` for
 *      measured cells).
 *   2. `layout`, `stableCells`, `visibleCells` — the raw layout data.
 *
 * Consumers pick the elements, styles, CSS var naming, positioning
 * strategy, and animation coordination.
 *
 * Framework-agnostic pieces live in `@masonrykit/core` (pure math) and
 * `@masonrykit/browser` (DOM integrations). This module is the React
 * wiring: state, effects, and stable refs.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  computeLayout,
  filterVisibleCells,
  resolveBreakpoint,
  type Breakpoint,
  type Cell as CoreCell,
  type ColumnStamp,
  type HeightCell,
  type Layout,
  type LayoutCell,
  type Stamp,
  type Viewport,
} from '@masonrykit/core'
import {
  createMeasuredHeightTracker,
  observeElementWidth,
  type MeasuredHeightTracker,
} from '@masonrykit/browser'

// Re-export so consumers can `import { ... } from '@masonrykit/react'` for
// everything they need, without reaching into core/browser directly.
export {
  aspectCell,
  columnStampsToPixels,
  computeColumns,
  computeLayout,
  filterVisibleCells,
  heightCell,
  measuredCell,
  resolveBreakpoint,
  type AspectCell,
  type Breakpoint,
  type Cell,
  type ColumnStamp,
  type Columns,
  type HeightCell,
  type Layout,
  type LayoutCell,
  type LayoutOptions,
  type MeasuredCell,
  type Meta,
  type Stamp,
  type Viewport,
} from '@masonrykit/core'
export { startViewTransition, type MeasuredHeightTracker } from '@masonrykit/browser'

export type VirtualizeOptions = {
  /**
   * Pixels of cells to render outside the visible viewport on each side.
   * Higher values reduce pop-in when scrolling quickly; lower values reduce
   * DOM count. Default 200.
   */
  overscan?: number
  /**
   * The scrolling ancestor. Defaults to the window. Set this if the grid is
   * inside an `overflow: auto/scroll` container.
   */
  scrollParent?: HTMLElement | null
}

export type MasonryOptions = {
  gap?: number
  columnWidth?: number
  /**
   * Explicit grid width. When omitted, the grid width is auto-measured via
   * `ResizeObserver` on the element `gridRef` attaches to.
   */
  gridWidth?: number
  /**
   * Width used before `ResizeObserver` has reported a measurement. Lets the
   * server and first client render produce identical output, so hydration
   * doesn't mismatch while still allowing the layout to adapt to the real
   * container width after mount. Ignored when `gridWidth` is set.
   */
  initialGridWidth?: number
  /**
   * Responsive overrides. The entry with the largest `minWidth <= gridWidth`
   * wins; unset fields fall through to `columnWidth` / `gap` / defaults.
   */
  breakpoints?: readonly Breakpoint[]
  horizontalOrder?: boolean
  stamps?: readonly Stamp[]
  columnStamps?: readonly ColumnStamp[]
  /**
   * Render only cells that intersect the viewport (± overscan). Off by default.
   * Set to `true` for default overscan, or pass `{ overscan, scrollParent }`.
   *
   * When enabled, render `visibleCells` instead of `stableCells`.
   */
  virtualize?: boolean | VirtualizeOptions
}

export type MasonryResult<M = undefined> = {
  /** Full computed layout (cells in input order, width, height, columns). */
  layout: Layout<M>
  /**
   * All cells in stable render order — preserves DOM identity across
   * shuffles so the same React node renders for a given `id` before and
   * after the input `cells` array is reordered.
   */
  stableCells: readonly LayoutCell<M>[]
  /**
   * Cells to render. Equals `stableCells` when `virtualize` is off;
   * otherwise a subset intersecting the scroll viewport (± overscan).
   * Measured cells that haven't reported a height yet are always included
   * so their `ResizeObserver` can fire before the user scrolls to them.
   */
  visibleCells: readonly LayoutCell<M>[]
  /**
   * Ref to attach to the grid element. Wires the auto-width
   * `ResizeObserver` so the layout reflows when the container resizes.
   * No-op when `gridWidth` is supplied. Stable across renders.
   */
  gridRef: React.RefCallback<HTMLElement>
  /**
   * Returns a ref for the cell with this `id`. For `measuredCell` inputs,
   * attaches a `ResizeObserver` so the layout reflows when the content's
   * intrinsic height changes. For `heightCell` / `aspectCell` inputs,
   * returns a shared no-op — safe to spread on every cell unconditionally.
   *
   * Function identity is stable per id across renders, so React doesn't
   * re-run attach/detach cycles.
   */
  cellRef: (id: string) => React.RefCallback<HTMLElement>
  /**
   * Ids of cells of type `'measured'` in the input. Useful for branching
   * on "let content drive the height" vs "pin to `cell.height`" in the
   * render, since `LayoutCell` itself doesn't carry the origin type.
   */
  measuredIds: ReadonlySet<string>
}

const NOOP_CLEANUP = (): void => {}

// Shared no-op ref handed out by `cellRef(id)` for non-measured cells.
// Module-level singleton keeps function identity stable across renders so
// React doesn't re-run the attach/detach cycle.
const NOOP_REF: React.RefCallback<HTMLElement> = () => {}

export function useMasonry<M = undefined>(
  cells: readonly CoreCell<M>[],
  options: MasonryOptions = {},
): MasonryResult<M> {
  const {
    gap = 0,
    columnWidth,
    gridWidth,
    initialGridWidth = 0,
    breakpoints,
    horizontalOrder = false,
    stamps,
    columnStamps,
    virtualize = false,
  } = options

  // Track the grid element in state (not a plain ref) so the effect below
  // re-runs when it becomes available. Components that render a loading
  // state before the grid would otherwise see the effect latch on `null`
  // at first mount and never re-attach the `ResizeObserver`.
  //
  // `setGridEl` from `useState` is already a stable, element-taking callback —
  // we return it directly as `gridRef` (no `useCallback` wrapper needed).
  const [gridEl, setGridEl] = useState<HTMLElement | null>(null)
  const [measuredWidth, setMeasuredWidth] = useState(initialGridWidth)

  useEffect(() => {
    if (gridWidth !== undefined) return NOOP_CLEANUP
    if (!gridEl) return NOOP_CLEANUP
    return observeElementWidth(gridEl, (w) => {
      setMeasuredWidth(Math.max(0, Math.floor(w)))
    })
  }, [gridWidth, gridEl])

  const resolvedWidth = gridWidth ?? measuredWidth

  const { resolvedColumnWidth, resolvedGap } = useMemo(() => {
    if (!breakpoints || breakpoints.length === 0) {
      return { resolvedColumnWidth: columnWidth, resolvedGap: gap }
    }
    const match = resolveBreakpoint(breakpoints, resolvedWidth)
    return {
      resolvedColumnWidth: match?.columnWidth ?? columnWidth,
      resolvedGap: match?.gap ?? gap,
    }
  }, [breakpoints, resolvedWidth, columnWidth, gap])

  // Measured heights for `MeasuredCell` inputs, keyed by id. Populated by the
  // tracker's `ResizeObserver`s (one per rendered measured cell).
  const [measuredHeights, setMeasuredHeights] = useState<ReadonlyMap<string, number>>(
    () => new Map(),
  )

  // Per-cell `ResizeObserver` aggregator.
  //
  // Incoming measurements buffer in `pendingMeasurementsRef` and flush
  // once per frame via `requestAnimationFrame`. Without the buffer, each
  // RO callback would run `new Map(prev).set(id, h)` in its own state
  // updater — on initial mount of N cells that's O(N²) Map allocations
  // because each updater copies every prior update's changes. Coalescing
  // to one setter call per frame makes it O(N).
  //
  // `ensureTracker` is shared between the eager init below, the mount
  // effect's replay, and the per-cell ref callback so all three paths
  // create the tracker via the same batched `onChange`.
  const trackerRef = useRef<MeasuredHeightTracker | null>(null)
  const pendingMeasurementsRef = useRef(new Map<string, number>())
  const flushRafRef = useRef<number | null>(null)

  const ensureTracker = useCallback((): MeasuredHeightTracker => {
    trackerRef.current ??= createMeasuredHeightTracker((id, h) => {
      pendingMeasurementsRef.current.set(id, h)
      if (flushRafRef.current !== null) return
      flushRafRef.current = window.requestAnimationFrame(() => {
        flushRafRef.current = null
        const pending = pendingMeasurementsRef.current
        pendingMeasurementsRef.current = new Map()
        setMeasuredHeights((prev) => {
          let changed = false
          for (const [pid, ph] of pending) {
            if (prev.get(pid) !== ph) {
              changed = true
              break
            }
          }
          if (!changed) return prev
          const next = new Map(prev)
          for (const [pid, ph] of pending) next.set(pid, ph)
          return next
        })
      })
    })
    return trackerRef.current
  }, [])

  // Eager init — tracker exists before any ref fires, and `ensureTracker`
  // also recreates it if StrictMode's simulated cleanup nulled it.
  ensureTracker()

  // Elements currently observed, keyed by cell id. The cell ref callback
  // updates this map on attach/detach. The effect below re-observes every
  // tracked element on mount ONLY after a cleanup has run, which recovers
  // from React 18 StrictMode's simulated unmount/remount: the cleanup
  // disconnects the tracker, then the setup re-attaches observers for
  // every previously-tracked element.
  //
  // Skipping the replay on the very first mount matters: the per-cell ref
  // callback already calls `tracker.observe(id, el)` during the same
  // commit, so replaying would disconnect + recreate an RO for every
  // measured cell — doubling `ResizeObserver` allocations and triggering
  // redundant initial `onChange` notifications.
  const observedElementsRef = useRef(new Map<string, Element>())
  const shouldReplayRef = useRef(false)

  useEffect(() => {
    const tracker = ensureTracker()
    if (shouldReplayRef.current) {
      for (const [id, element] of observedElementsRef.current) {
        tracker.observe(id, element)
      }
    }
    return () => {
      trackerRef.current?.disconnect()
      trackerRef.current = null
      shouldReplayRef.current = true
      if (flushRafRef.current !== null) {
        cancelAnimationFrame(flushRafRef.current)
        flushRafRef.current = null
      }
      pendingMeasurementsRef.current.clear()
    }
  }, [ensureTracker])

  // Swap measured cells out for a `HeightCell` once we have their real height;
  // leave them as-is otherwise (core's `computeLayout` falls back to
  // `estimatedHeight`).
  const { resolvedCells, measuredIds } = useMemo<{
    resolvedCells: readonly CoreCell<M>[]
    measuredIds: ReadonlySet<string>
  }>(() => {
    const ids = new Set<string>()
    const out: CoreCell<M>[] = []
    for (const c of cells) {
      if (c.type === 'measured') {
        ids.add(c.id)
        const known = measuredHeights.get(c.id)
        if (known !== undefined) {
          const base: Record<string, unknown> = { id: c.id, type: 'height', height: known }
          if (c.columnSpan !== undefined) base.columnSpan = c.columnSpan
          if (c.meta !== undefined) base.meta = c.meta
          out.push(base as HeightCell<M>)
        } else {
          out.push(c)
        }
      } else {
        out.push(c)
      }
    }
    return { resolvedCells: out, measuredIds: ids }
  }, [cells, measuredHeights])

  const layout = useMemo(
    () =>
      computeLayout<M>(resolvedCells, {
        gridWidth: resolvedWidth,
        gap: resolvedGap,
        ...(resolvedColumnWidth !== undefined ? { columnWidth: resolvedColumnWidth } : {}),
        horizontalOrder,
        ...(stamps ? { stamps } : {}),
        ...(columnStamps ? { columnStamps } : {}),
      }),
    [
      resolvedCells,
      resolvedWidth,
      resolvedGap,
      resolvedColumnWidth,
      horizontalOrder,
      stamps,
      columnStamps,
    ],
  )

  // Per-id ref factory. Returns the shared no-op for non-measured cells
  // (safe to spread on every cell unconditionally). For measured cells,
  // returns a cached per-id ref callback that calls `tracker.observe` on
  // attach and `tracker.unobserve` on detach.
  const refCacheRef = useRef(new Map<string, React.RefCallback<HTMLElement>>())
  const cellRef = useCallback(
    (id: string): React.RefCallback<HTMLElement> => {
      if (!measuredIds.has(id)) return NOOP_REF
      const cache = refCacheRef.current
      let refFn = cache.get(id)
      if (!refFn) {
        refFn = (el) => {
          if (el) {
            // Track the element so the mount effect can re-attach the
            // observer after StrictMode's simulated unmount/remount.
            observedElementsRef.current.set(id, el)
            ensureTracker().observe(id, el)
          } else {
            observedElementsRef.current.delete(id)
            trackerRef.current?.unobserve(id)
          }
        }
        cache.set(id, refFn)
      }
      return refFn
    },
    [measuredIds, ensureTracker],
  )

  // Prune `refCacheRef` of entries for ids no longer in the input.
  // Without this, long-running apps (infinite scroll, filters) would
  // accumulate stale per-id closures indefinitely.
  useEffect(() => {
    const activeIds = new Set<string>()
    for (const c of cells) activeIds.add(c.id)
    const cache = refCacheRef.current
    for (const id of cache.keys()) {
      if (!activeIds.has(id)) cache.delete(id)
    }
  }, [cells])

  const stableOrderRef = useRef<string[]>([])
  const stableCells = useMemo<readonly LayoutCell<M>[]>(() => {
    // `useMemo` must be pure — read the previous order but don't mutate
    // the ref here. The effect below commits the new order after render.
    const byId = new Map(layout.cells.map((c) => [c.id, c]))
    const prevOrder = stableOrderRef.current
    const sameSet =
      prevOrder.length === layout.cells.length && prevOrder.every((id) => byId.has(id))
    if (!sameSet) return layout.cells
    const result: LayoutCell<M>[] = []
    for (const id of prevOrder) {
      const laid = byId.get(id)
      if (laid) result.push(laid)
    }
    return result
  }, [layout])
  useEffect(() => {
    stableOrderRef.current = stableCells.map((c) => c.id)
  }, [stableCells])

  // Scroll/resize tick used to recompute `visibleCells` when virtualizing.
  const [viewportTick, setViewportTick] = useState(0)
  const virtualizeEnabled = virtualize !== false
  const virtualizeOpts: VirtualizeOptions =
    typeof virtualize === 'object' && virtualize !== null ? virtualize : {}
  const virtualizeScrollParent = virtualizeOpts.scrollParent ?? null
  const virtualizeOverscan = virtualizeOpts.overscan ?? 200

  useEffect(() => {
    if (!virtualizeEnabled) return NOOP_CLEANUP
    const scrollParent: EventTarget = virtualizeScrollParent ?? window
    // rAF-coalesce: scroll events can fire at ~120 Hz on high-refresh
    // trackpads. Without coalescing we'd run one re-render per event.
    let rafId: number | null = null
    const onChange = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        setViewportTick((t) => t + 1)
      })
    }
    scrollParent.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('resize', onChange, { passive: true })
    onChange() // kick an initial computation once mounted
    return () => {
      scrollParent.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [virtualizeEnabled, virtualizeScrollParent])

  const visibleCells = useMemo<readonly LayoutCell<M>[]>(() => {
    if (!virtualizeEnabled) return stableCells
    if (!gridEl) return stableCells
    const gridRect = gridEl.getBoundingClientRect()
    let viewport: Viewport
    if (virtualizeScrollParent) {
      const rect = virtualizeScrollParent.getBoundingClientRect()
      viewport = { top: rect.top, bottom: rect.bottom }
    } else {
      viewport = { top: 0, bottom: window.innerHeight }
    }

    // Base: cells geometrically inside the viewport (± overscan).
    const base = filterVisibleCells(stableCells, gridRect.top, viewport, virtualizeOverscan)
    if (measuredIds.size === 0) return base

    // Augment: always include measured cells that haven't been measured yet,
    // so their ResizeObserver can fire before the user scrolls to them —
    // otherwise visible layout shift appears on scroll.
    const inBase = new Set(base.map((c) => c.id))
    let augmented = false
    for (const cell of stableCells) {
      if (inBase.has(cell.id)) continue
      if (measuredIds.has(cell.id) && !measuredHeights.has(cell.id)) {
        augmented = true
        break
      }
    }
    if (!augmented) return base

    return stableCells.filter((cell) => {
      if (inBase.has(cell.id)) return true
      return measuredIds.has(cell.id) && !measuredHeights.has(cell.id)
    })
    // `viewportTick` is intentionally a dep so this re-runs on every scroll /
    // resize via the effect below — it isn't read in the body, but bumping it
    // is how we invalidate the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    virtualizeEnabled,
    virtualizeScrollParent,
    virtualizeOverscan,
    stableCells,
    viewportTick,
    measuredIds,
    measuredHeights,
    gridEl,
  ])

  return {
    layout,
    stableCells,
    visibleCells,
    gridRef: setGridEl,
    cellRef,
    measuredIds,
  }
}
