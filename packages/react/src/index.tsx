/**
 * @masonrykit/react
 *
 * React bindings for MasonryKit. The hook provides positioning via inline
 * styles and CSS custom properties; users supply the elements, classes,
 * styles, refs, event handlers, and ARIA.
 *
 * Framework-agnostic pieces live in `@masonrykit/core` (pure math) and
 * `@masonrykit/browser` (DOM integrations). This module is just the
 * React wiring: state, effects, and prop-getters.
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
  type MeasuredCell,
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

/** CSS properties with support for custom property (`--*`) keys. */
type CSSProperties = React.CSSProperties & {
  [key: `--${string}`]: string | number | undefined
}

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
   * `ResizeObserver` on the element that `getGridProps().ref` attaches to.
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
   * When `true`, each cell wrapper is given a `view-transition-name` so the
   * browser can animate adds, removes, and position changes natively when
   * state updates are wrapped in `startViewTransition`. (React users should
   * additionally `flushSync` inside the callback so the DOM commit lands
   * before the browser's "after" snapshot is captured.)
   *
   * No-op in browsers without the View Transitions API.
   */
  animate?: boolean
  /**
   * Render only cells that intersect the viewport (± overscan). Off by default.
   * Set to `true` for default overscan, or pass `{ overscan, scrollParent }`.
   *
   * When enabled, render `visibleCells` instead of `stableCells`.
   */
  virtualize?: boolean | VirtualizeOptions
}

type AnyRef<T> = React.Ref<T> | undefined

type ElementProps = React.HTMLAttributes<HTMLElement> & {
  ref?: AnyRef<HTMLElement>
}

export type GridPropsOut<P extends ElementProps> = Omit<P, 'ref' | 'style'> & {
  ref: React.RefCallback<HTMLElement>
  style: CSSProperties
}

export type CellPropsOut<P extends ElementProps> = Omit<P, 'ref' | 'style'> & {
  ref: React.RefCallback<HTMLElement>
  style: CSSProperties
}

export type MasonryResult<M = undefined> = {
  layout: Layout<M>
  /** All cells in stable render order (preserves DOM identity across shuffles). */
  stableCells: readonly LayoutCell<M>[]
  /**
   * Cells to render. Equals `stableCells` when `virtualize` is off; otherwise
   * a subset intersecting the scroll viewport (± overscan). Measured cells
   * that haven't reported a height yet are always included so their
   * `ResizeObserver` can fire.
   */
  visibleCells: readonly LayoutCell<M>[]
  getGridProps: <P extends ElementProps = ElementProps>(userProps?: P) => GridPropsOut<P>
  getCellProps: <P extends ElementProps = ElementProps>(
    cell: LayoutCell<M>,
    userProps?: P,
  ) => CellPropsOut<P>
}

function composeRefs<T>(...refs: readonly AnyRef<T>[]): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') ref(node)
      else ref.current = node
    }
  }
}

const NOOP_CLEANUP = (): void => {}

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
    animate = false,
    virtualize = false,
  } = options

  const gridElRef = useRef<HTMLElement | null>(null)
  const [measuredWidth, setMeasuredWidth] = useState(initialGridWidth)

  const setGridEl = useCallback((el: HTMLElement | null) => {
    gridElRef.current = el
  }, [])

  useEffect(() => {
    if (gridWidth !== undefined) return NOOP_CLEANUP
    const el = gridElRef.current
    if (!el) return NOOP_CLEANUP
    return observeElementWidth(el, (w) => {
      setMeasuredWidth(Math.max(0, Math.floor(w)))
    })
  }, [gridWidth])

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

  const trackerRef = useRef<MeasuredHeightTracker | null>(null)
  trackerRef.current ??= createMeasuredHeightTracker((id, h) => {
    setMeasuredHeights((prev) => {
      if (prev.get(id) === h) return prev
      return new Map(prev).set(id, h)
    })
  })

  useEffect(
    () => () => {
      trackerRef.current?.disconnect()
      trackerRef.current = null
    },
    [],
  )

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

  // Per-id ref callback for measured cells. Cached so the same function is
  // handed back every render — React uses function identity to decide when
  // to re-run the attach/cleanup cycle.
  const refCacheRef = useRef(new Map<string, React.RefCallback<HTMLElement>>())
  const getMeasureRef = useCallback((id: string): React.RefCallback<HTMLElement> => {
    const cache = refCacheRef.current
    let refFn = cache.get(id)
    if (!refFn) {
      refFn = (el) => {
        const tracker = trackerRef.current
        if (!tracker) return
        if (el) tracker.observe(id, el)
        else tracker.unobserve(id)
      }
      cache.set(id, refFn)
    }
    return refFn
  }, [])

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
    const onChange = () => {
      setViewportTick((t) => t + 1)
    }
    scrollParent.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('resize', onChange, { passive: true })
    onChange() // kick an initial computation once mounted
    return () => {
      scrollParent.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [virtualizeEnabled, virtualizeScrollParent])

  const visibleCells = useMemo<readonly LayoutCell<M>[]>(() => {
    if (!virtualizeEnabled) return stableCells
    const grid = gridElRef.current
    if (!grid) return stableCells
    const gridRect = grid.getBoundingClientRect()
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
  ])

  const getGridProps = useCallback(
    <P extends ElementProps = ElementProps>(userProps?: P): GridPropsOut<P> => {
      const { ref: userRef, style: userStyle, ...rest } = (userProps ?? {}) as ElementProps
      const libraryStyle: CSSProperties = {
        position: 'relative',
        height: layout.height,
        '--mk-grid-width': `${layout.width}px`,
        '--mk-grid-height': `${layout.height}px`,
        '--mk-grid-columns': `${layout.columns.count}`,
      }
      // Library wins on positioning / sizing keys it owns; user styles fill
      // in anything else (colors, borders, shadows, etc.). Preventing user
      // overrides of `position` / `height` keeps the layout contract intact.
      return {
        ...rest,
        ref: composeRefs(setGridEl, userRef),
        style: { ...userStyle, ...libraryStyle },
      } as GridPropsOut<P>
    },
    [layout, setGridEl],
  )

  const getCellProps = useCallback(
    <P extends ElementProps = ElementProps>(
      cell: LayoutCell<M>,
      userProps?: P,
    ): CellPropsOut<P> => {
      const { ref: userRef, style: userStyle, ...rest } = (userProps ?? {}) as ElementProps
      const isMeasured = measuredIds.has(cell.id)
      const libraryStyle: CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: cell.width,
        translate: `${cell.x}px ${cell.y}px`,
        '--mk-cell-x': `${cell.x}px`,
        '--mk-cell-y': `${cell.y}px`,
        '--mk-cell-width': `${cell.width}px`,
        '--mk-cell-height': `${cell.height}px`,
        '--mk-cell-column': `${cell.column}`,
      }
      if (!isMeasured) {
        // Measured cells let their content drive the box so the RO reports
        // real content height, not a stale placeholder from the previous pass.
        libraryStyle.height = cell.height
      }
      if (animate) {
        libraryStyle.viewTransitionName = `mk-${cell.id}`
      }
      const refs: AnyRef<HTMLElement>[] = [userRef]
      if (isMeasured) refs.push(getMeasureRef(cell.id))
      // Library wins on positioning keys (position, top, left, width,
      // translate, height, view-transition-name, --mk-cell-*); user styles
      // fill in everything else (transition, background, border, etc.).
      return {
        ...rest,
        ref: composeRefs(...refs),
        style: { ...userStyle, ...libraryStyle },
      } as CellPropsOut<P>
    },
    [animate, measuredIds, getMeasureRef],
  )

  return { layout, stableCells, visibleCells, getGridProps, getCellProps }
}
