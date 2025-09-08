/**
 * @packageDocumentation
 * @public
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  memo,
} from 'react'
import {
  computeColumns,
  computeMasonryLayout,
  type MasonryLayoutCell,
  type MasonryLayoutResult,
  type MasonryStamp,
} from '@masonrykit/core'

/**
 * @masonrykit/react (CSS-first)
 *
 * Declarative Masonry components where:
 * - All configuration is via CSS variables (ideally using container queries / Tailwind v4).
 * - JS only bridges: measure container width, read CSS vars, compute layout, write output vars.
 *
 * Components:
 * - Grid: reads CSS vars (--mk-column-width, --mk-gap, --mk-horizontal-order), collects Cells and Stamps,
 *         computes layout with @masonrykit/core, writes --mk-cell-* vars per Cell and --mk-grid-height on itself.
 * - Cell: declares item inputs via CSS vars: --mk-cell-span, --mk-cell-height, --mk-cell-ar.
 * - StampCols: declares column-aligned stamps via CSS vars: --mk-stamp-start-col, --mk-stamp-span, --mk-stamp-top, --mk-stamp-height.
 * - Stamp: declares pixel-based stamps via: --mk-stamp-x, --mk-stamp-y, --mk-stamp-width, --mk-stamp-height.
 *
 * Naming conventions:
 * - Grid input vars: --mk-column-width, --mk-gap, --mk-horizontal-order (0|1).
 * - Grid output vars: --mk-grid-height
 * - Cell input vars: --mk-cell-span, --mk-cell-height, --mk-cell-aspect-ratio
 * - Cell output vars: --mk-cell-left, --mk-cell-top, --mk-cell-width, --mk-cell-height, --mk-cell-column, --mk-cell-span, --mk-cell-index
 * - StampCols input vars: --mk-stamp-start-col, --mk-stamp-span, --mk-stamp-top, --mk-stamp-height
 * - Stamp (px) input vars: --mk-stamp-x, --mk-stamp-y, --mk-stamp-width, --mk-stamp-height
 */

/* ---------------------------------- Utils ---------------------------------- */

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (!ref) return
  if (typeof ref === 'function') {
    ref(value)
  } else {
    ;(ref as unknown as { current: T | null }).current = value
  }
}

function parseCssNumber(v: string | null | undefined): number | undefined {
  if (!v) return undefined
  const n = parseFloat(v.trim())
  return Number.isFinite(n) ? n : undefined
}

function getCssNumber(el: Element, ...names: string[]): number | undefined {
  if (typeof window === 'undefined') return undefined
  const cs = window.getComputedStyle(el as Element)
  for (const name of names) {
    const v = cs.getPropertyValue(name)
    const n = parseCssNumber(v)
    if (typeof n === 'number') return n
  }
  return undefined
}

function raf(fn: () => void) {
  if (typeof window === 'undefined' || !('requestAnimationFrame' in window)) {
    fn()
    return
  }
  window.requestAnimationFrame(fn)
}

function observeElementWidth(
  element: Element | null | undefined,
  onWidth: (w: number) => void,
): () => void {
  if (typeof window === 'undefined' || !element) return () => {}

  let disposed = false
  const measure = () => {
    if (disposed) return
    const rect = (element as HTMLElement)?.getBoundingClientRect?.()
    if (rect) onWidth(rect.width)
  }

  // Initial call and again on next frame to ensure width is picked up after mount
  measure()
  raf(measure)

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => raf(measure))
    ro.observe(element)
    return () => {
      disposed = true
      ro.disconnect()
    }
  }

  const handler = () => raf(measure)
  if (typeof window !== 'undefined' && 'addEventListener' in window) {
    window.addEventListener('resize', handler, { passive: true })
    return () => {
      disposed = true
      window.removeEventListener('resize', handler)
    }
  }

  return () => {
    disposed = true
  }
}

/**
 * Helper to build CSS custom properties with proper units (for DX).
 * - gapPx: writes --mk-gap-px (px)
 * - gap: writes unitless --mk-gap (numeric, used with calc(* 1px) in CSS)
 * - columnWidth: unitless desired column width (number)
 * - height: writes --mk-cell-height (px)
 * - aspectRatio: writes --mk-cell-aspect-ratio (number)
 * - span: writes --mk-cell-span (number)
 * - horizontalOrder: writes --mk-horizontal-order (0|1)
 * @public
 */
/** @public */
export function cssVars(input: {
  gapPx?: number
  gap?: number
  columnWidth?: number
  height?: number
  aspectRatio?: number
  span?: number
  horizontalOrder?: boolean
}): React.CSSProperties {
  const out: Record<string, string | number> = {}
  if (input.gapPx != null) out['--mk-gap-px'] = `${Math.max(0, Math.round(input.gapPx))}px`
  if (input.gap != null) out['--mk-gap'] = `${Math.max(0, Math.round(input.gap))}`
  if (input.columnWidth != null)
    out['--mk-column-width'] = `${Math.max(1, Math.round(input.columnWidth))}`
  if (input.height != null) out['--mk-cell-height'] = `${Math.max(0, Math.round(input.height))}px`
  if (input.aspectRatio != null) out['--mk-cell-aspect-ratio'] = `${input.aspectRatio}`
  if (input.span != null) out['--mk-cell-span'] = `${Math.max(1, Math.round(input.span))}`
  if (input.horizontalOrder != null) out['--mk-horizontal-order'] = input.horizontalOrder ? 1 : 0
  return out as React.CSSProperties
}

/* ------------------------------- Grid Context ------------------------------- */

type _RegisteredCell = {
  id: number
  ref: React.RefObject<HTMLElement | null>
  // Read input CSS vars from this cell element
  readInputs: () => {
    span: number
    height?: number
    aspectRatio?: number
  }
}

type GridRegistry = {
  addCell: (entry: _RegisteredCell) => void
  removeCell: (entry: _RegisteredCell) => void
  requestCompute: () => void
  getGridRef: () => HTMLElement | null
  getPositionFor: (el: HTMLElement | null) => any
  layoutVersion: number
}

const GridContext = createContext<GridRegistry | null>(null)

function useGridRegistry(): GridRegistry {
  const ctx = useContext(GridContext)
  if (!ctx) {
    throw new Error('Masonry components must be used inside <Masonry.Grid>')
  }
  return ctx
}

/* ---------------------------------- Grid ----------------------------------- */

/** @public */
/** @public */
export type GridProps = {
  as?: React.ElementType
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  /**
   * Apply computed positions to cells.
   * - 'dom' (default): write CSS variables directly to the cell DOM nodes (renderless).
   * - 'react': store positions and trigger a re-render so Cells can apply styles via props.
   */
  applyInlineStyles?: 'dom' | 'react'
  /**
   * Optional pixel-based stamps applied directly in the layout.
   */
  stamps?: MasonryStamp[]
  /**
   * Optional column-aligned stamps that will be converted to px using resolved columns.
   */
  stampsCols?: Array<{ startCol: number; span: number; top: number; height: number }>
  /**
   * Optional callback invoked after each successful layout compute.
   */
  onLayout?: (layout: MasonryLayoutResult<any>) => void
}

/** @public */
/** @public */
export const Grid = memo(
  forwardRef<HTMLElement, GridProps>(function Grid(props, forwardedRef) {
    const {
      as: As = 'div',
      className,
      style,
      children,
      onLayout,
      applyInlineStyles = 'dom',
      stamps,
      stampsCols,
    } = props
    const gridRef = useRef<HTMLElement | null>(null)

    const [layoutVersion, setLayoutVersion] = useState(0)

    // Expose ref via callback ref
    const setGridRef = useCallback(
      (node: HTMLElement | null) => {
        gridRef.current = node
        setRef(forwardedRef, node)
      },
      [forwardedRef],
    )

    // DOM query approach (no registries) to ensure we always see current children
    const positionsRef = useRef<Map<HTMLElement, MasonryLayoutCell<any>>>(new Map())
    const cellsRef = useRef<_RegisteredCell[]>([])
    const [width, setWidth] = useState(0)
    const widthRef = useRef(0)
    const widthUpdateScheduledRef = useRef(false)
    const pendingWidthRef = useRef<number | null>(null)
    const lastComputedWidthRef = useRef(0)
    useLayoutEffect(() => {
      widthRef.current = width
    }, [width])
    const computeLayoutRef = useRef<() => void>(() => {})
    const computePendingRef = useRef(false)
    const requestCompute = useCallback(() => {
      if (computePendingRef.current) return
      computePendingRef.current = true
      raf(() => {
        computePendingRef.current = false
        const run = computeLayoutRef.current
        if (typeof run === 'function') run()
      })
    }, [])

    // Observe grid width (layout effect)
    useLayoutEffect(() => {
      const el = gridRef.current
      if (!el) return

      const disposeWidth = observeElementWidth(el, (w) => {
        const mw = Math.max(0, Math.floor(w))
        if (mw === widthRef.current) return
        pendingWidthRef.current = mw
        if (!widthUpdateScheduledRef.current) {
          widthUpdateScheduledRef.current = true
          raf(() => {
            widthUpdateScheduledRef.current = false
            const next = pendingWidthRef.current
            pendingWidthRef.current = null
            if (typeof next === 'number' && next !== widthRef.current) {
              widthRef.current = next
              setWidth(next)
            }
          })
        }
      })

      return () => {
        disposeWidth?.()
      }
    }, [requestCompute])

    // Keep latest computeLayout in a ref so requestCompute always uses fresh closure values
    useLayoutEffect(() => {
      computeLayoutRef.current = computeLayout
    })

    // Minimal registry implementation retained for compatibility with children,
    // but all reads happen via DOM queries inside computeLayout.
    const registry = useMemo<GridRegistry>(
      () => ({
        addCell(entry) {
          cellsRef.current.push(entry)
          requestCompute()
        },
        removeCell(entry) {
          cellsRef.current = cellsRef.current.filter((e) => e !== entry)
          requestCompute()
        },
        requestCompute,
        getGridRef() {
          return gridRef.current
        },
        getPositionFor(el: HTMLElement | null) {
          return el ? positionsRef.current.get(el) : undefined
        },
        layoutVersion,
      }),
      [requestCompute, layoutVersion],
    )

    // Fire initial compute after children have had a chance to register:
    // defer to next microtask and then next animation frame
    useLayoutEffect(() => {
      requestCompute()
    }, [])
    // Recompute when width changes: coalesce via RAF and dedupe if same width
    useLayoutEffect(() => {
      if (width <= 0) return
      if (width === lastComputedWidthRef.current) return
      raf(() => {
        requestCompute()
      })
    }, [width, requestCompute])
    // Recompute when className/style change (e.g., CSS var changes)
    useLayoutEffect(() => {
      raf(() => {
        requestCompute()
      })
    }, [className, style, requestCompute])

    function readGridInputs(el: HTMLElement | null): {
      cw?: number
      gap: number
      horizontalOrder: boolean
    } {
      if (!el) return { gap: 0, horizontalOrder: false }
      // Support px or unitless values and common aliases
      const cw = getCssNumber(el, '--mk-column-width', '--mk-cw', '--mk-cell-width')
      const gap = getCssNumber(el, '--mk-gap', '--mk-cell-gap') ?? 0
      const horiz = getCssNumber(el, '--mk-horizontal-order') ?? 0
      const out: { cw?: number; gap: number; horizontalOrder: boolean } = {
        gap,
        horizontalOrder: horiz > 0.5,
      }
      if (typeof cw === 'number') out.cw = cw
      return out
    }

    function computeLayout() {
      const root = gridRef.current
      if (!root) return
      const containerWidth = width
      if (containerWidth <= 0) {
        // Attempt a fallback measurement to trigger first compute if possible
        const fallback = root.clientWidth
        if (fallback > 0) {
          const mw = Math.max(0, Math.floor(fallback))
          setWidth(mw)
        }
        return
      }

      const gridInputs = readGridInputs(root)
      const desiredCw = gridInputs.cw
      const desiredGap = gridInputs.gap

      // Resolve columns with current width and desired values
      const columnsInput: { gridWidth: number; gap?: number; columnWidth?: number } = {
        gridWidth: containerWidth,
        gap: desiredGap,
      }
      if (typeof desiredCw === 'number') {
        columnsInput.columnWidth = desiredCw
      }
      const resolved = computeColumns(columnsInput)

      // Build cells using the React registry entries
      const items = cellsRef.current.map((entry) => {
        const inputs = entry.readInputs()
        const out: any = {
          id: String(entry.id),
          columnSpan: inputs.span,
          meta: undefined as unknown as never,
        }
        if (typeof inputs.height === 'number') {
          out.height = Math.max(0, inputs.height)
        } else if (typeof inputs.aspectRatio === 'number' && inputs.aspectRatio > 0) {
          out.aspectRatio = inputs.aspectRatio
        }
        return out
      })

      const stampsPxFromProps = (stamps ?? [])
        .map((s) => ({
          x: Math.round(s.x),
          y: Math.round(s.y),
          width: Math.max(0, Math.round(s.width)),
          height: Math.max(0, Math.round(s.height)),
        }))
        .filter((s) => s.width > 0 && s.height > 0)

      const stampsColsFromProps = (stampsCols ?? [])
        .map((s) => {
          const startCol = Math.max(0, Math.floor(s.startCol))
          const span = Math.max(1, Math.floor(s.span))
          const top = Math.max(0, Math.floor(s.top))
          const h = Math.max(0, Math.floor(s.height))
          const x = Math.round(startCol * (resolved.columnWidth + resolved.gap))
          const width = Math.round(span * resolved.columnWidth + (span - 1) * resolved.gap)
          return { x, y: top, width, height: h }
        })
        .filter((s) => s.width > 0 && s.height > 0)

      const mergedStamps = ([] as MasonryStamp[])
        .concat(stampsPxFromProps)
        .concat(stampsColsFromProps)

      /* */
      const layout = computeMasonryLayout(items, {
        gridWidth: containerWidth,
        gap: resolved.gap,
        columnWidth: resolved.columnWidth,
        horizontalOrder: gridInputs.horizontalOrder,
        ...(mergedStamps.length ? { stamps: mergedStamps } : {}),
      })

      // Write grid height
      root.style.setProperty('--mk-grid-height', `${layout.grid.height}px`)

      // Update positions map and optionally write inline styles directly (renderless DOM mode)
      positionsRef.current = new Map()
      layout.cells.forEach((pos: MasonryLayoutCell<any>, index: number) => {
        const el = cellsRef.current[index]?.ref.current
        if (!el) return
        if (applyInlineStyles === 'dom') {
          el.style.setProperty('--mk-cell-x', `${pos.x}px`)
          el.style.setProperty('--mk-cell-y', `${pos.y}px`)
          el.style.setProperty('--mk-cell-width', `${pos.width}px`)
          el.style.setProperty('--mk-cell-height', `${pos.height}px`)
          el.style.setProperty('--mk-cell-column', `${pos.column}`)
          el.style.setProperty('--mk-cell-span', `${pos.span}`)
          el.style.setProperty('--mk-cell-index', `${pos.index}`)
        }
        positionsRef.current.set(el, pos as MasonryLayoutCell<any>)
      })
      lastComputedWidthRef.current = containerWidth
      if (applyInlineStyles === 'react') {
        setLayoutVersion((v) => v + 1)
      }
      if (onLayout) onLayout(layout as MasonryLayoutResult<any>)
    }

    // Class for position mode

    return (
      <GridContext.Provider value={registry}>
        <As ref={setGridRef} className={className} style={style}>
          {children}
        </As>
      </GridContext.Provider>
    )
  }),
)

/* ---------------------------------- Cell ----------------------------------- */

/** @public */
/** @public */
export type CellProps = {
  as?: React.ElementType
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  /**
   * Optional marker class to allow DOM queries to find cells.
   * Defaults to 'mk-cell' if not provided.
   */
  markerClassName?: string
  /**
   * Provide dynamic styles based on computed position. Return any CSS properties
   * (including CSS custom properties) to be merged into the element's inline style.
   */
  setDynamicStyle?: (ctx: {
    pos: MasonryLayoutCell<any>
    index: number
    column: number
    span: number
  }) => React.CSSProperties
}

/** @public */
/** @public */
export const Cell = memo(
  forwardRef<HTMLElement, CellProps>(function Cell(props, forwardedRef) {
    const {
      as: As = 'div',
      className,
      style,
      children,
      markerClassName = 'mk-cell',
      setDynamicStyle,
    } = props
    const grid = useGridRegistry()
    const ref = useRef<HTMLElement | null>(null)
    const idRef = useRef<number | null>(null)

    // Expose ref via callback ref
    const setCellRef = useCallback(
      (node: HTMLElement | null) => {
        ref.current = node
        setRef(forwardedRef, node)
      },
      [forwardedRef],
    )

    const _readInputs = useCallback(() => {
      const el = ref.current
      if (!el) return { span: 1 } as const
      const span = Math.max(1, Math.floor(getCssNumber(el, '--mk-cell-span') ?? 1))
      const height = getCssNumber(el, '--mk-cell-height')
      const aspectRatio =
        height == null ? getCssNumber(el, '--mk-cell-aspect-ratio') : undefined /* height wins */
      return {
        span,
        ...(height != null ? { height } : {}),
        ...(aspectRatio != null ? { aspectRatio } : {}),
      }
    }, [])

    // Register with Grid (layout effect to ensure registry available before compute)
    useLayoutEffect(() => {
      const id = idRef.current ?? gridIdNext(grid)
      idRef.current = id
      const entry: _RegisteredCell = { id, ref, readInputs: _readInputs }
      grid.addCell(entry)
      return () => grid.removeCell(entry)
    }, [])

    // Merge static style and dynamic style (if provided). No base positioning is applied by default.

    const pos = grid.getPositionFor(ref.current)

    // Always expose computed geometry via CSS vars on the element's style prop.
    // Allow setDynamicStyle to augment/override if provided.
    const baseDynamic: React.CSSProperties = pos
      ? ({
          ['--mk-cell-x']: `${pos.x}px`,
          ['--mk-cell-y']: `${pos.y}px`,
          ['--mk-cell-width']: `${pos.width}px`,
          ['--mk-cell-height']: `${pos.height}px`,
          ['--mk-cell-column']: `${pos.column}`,
          ['--mk-cell-span']: `${pos.span}`,
          ['--mk-cell-index']: `${pos.index}`,
        } as React.CSSProperties)
      : {}

    const extraDynamic: React.CSSProperties =
      pos && setDynamicStyle
        ? setDynamicStyle({
            pos: pos,
            index: pos.index,
            column: pos.column,
            span: pos.span,
          })
        : ({} as React.CSSProperties)

    const mergedStyle: React.CSSProperties = useMemo(
      () => ({
        ...(style ?? {}),
        ...baseDynamic,
        ...extraDynamic,
      }),
      // Include layoutVersion so Cells re-render styles right after a new layout
      [style, grid.layoutVersion],
    )

    /* */

    return (
      <As
        ref={setCellRef}
        className={Array.from(
          new Set([markerClassName, className].filter((v): v is string => !!v)),
        ).join(' ')}
        style={mergedStyle}
      >
        {children}
      </As>
    )
  }),
)

/* --------------------------------- Helpers --------------------------------- */

function gridIdNext(_grid: GridRegistry): number {
  // We rely on closure-local nextIdRef inside Grid, but here we cannot access it.
  // Instead, we generate per-add unique ids by using timestamp + random.
  // For deterministic order across a single render, the order in cellsRef is stable.
  // The exact id value is opaque to consumers; it only needs to be unique in the current grid.
  return Number(
    `${Date.now()}${Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0')}`,
  )
}

/* --------------------------------- Exports --------------------------------- */

export type { MasonryLayoutCell, MasonryStamp, MasonryLayoutResult }
