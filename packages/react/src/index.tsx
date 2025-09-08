/**
 * @packageDocumentation
 * @public
 */
import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

import {
  computeColumns,
  computeMasonryLayout,
  type MasonryLayoutResult,
  type MasonryStamp,
  type MasonryCellInput,
} from '@masonrykit/browser'
import { observeElementWidth } from '@masonrykit/browser'
// Masonry React entry: data-driven, writer-based API (no preset CSS var names or classes).

export type StampCol = {
  /**
   * Zero-based column index where the stamp starts.
   */
  startCol: number
  /**
   * Number of columns the stamp spans (>= 1).
   */
  span: number
  /**
   * Top offset in pixels from the grid's top edge.
   */
  top: number
  /**
   * Height of the stamp rectangle in pixels.
   */
  height: number
}

export type UseMasonryOptions = {
  /**
   * Grid inner width resolver: literal number, CSS var, or function.
   */
  width: Resolver<number> | undefined
  /**
   * Gap resolver: literal number, CSS var, or function.
   */
  gap: Resolver<number> | undefined
  /**
   * Column width resolver: literal number, CSS var, or function.
   */
  columnWidth: Resolver<number> | undefined
  /**
   * Horizontal order resolver: literal boolean, CSS var, or function.
   */
  horizontalOrder: Resolver<boolean> | undefined
  /**
   * Optional px-based stamps that pre-occupy space.
   */
  stamps: MasonryStamp[] | undefined
  /**
   * Optional column-aligned stamps that will be converted to pixel stamps using resolved column/gap sizes.
   */
  stampsCols: Array<StampCol> | undefined
}

/**
 * React hook that computes a Masonry layout for a list of cells.
 *
 * - If `options.gridWidth` is provided, it will be used directly (no measuring).
 * - Otherwise, the hook measures the width of the attached grid element.
 * - Optionally reads CSS variables when `cssVars` is enabled; variable names are determined by the consumer.
 */
export function useMasonry<M>(
  cells: readonly MasonryCellInput<M>[],
  options: UseMasonryOptions,
): {
  /**
   * Attach this ref to the grid element when you want the hook to measure width automatically.
   * If options.width is a literal number, no measuring occurs.
   */
  ref: React.RefObject<HTMLDivElement | null>
  /**
   * The latest measured or provided grid width.
   */
  width: number
  /**
   * The computed Masonry layout result.
   */
  layout: MasonryLayoutResult<M>
} {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [measuredWidth, setMeasuredWidth] = useState<number>(0)

  // Observe the element width when width is not provided as a literal number
  useEffect(() => {
    if (typeof options.width === 'number') return
    const el = gridRef.current
    if (!el) return
    const dispose = observeElementWidth(el, (w) => setMeasuredWidth(Math.max(0, Math.floor(w))))
    return dispose
  }, [options.width])

  const layout = useMemo(() => {
    const el = gridRef.current

    // Resolve width
    const resolvedWidth =
      typeof options.width === 'number'
        ? options.width
        : el
          ? resolveInput(el, options.width)
          : undefined
    const gridWidth = Math.max(0, Math.floor((resolvedWidth ?? measuredWidth) || 0))

    if (gridWidth <= 0 || cells.length === 0) {
      return {
        cells: [],
        grid: { width: gridWidth, height: 0, columnCount: 0, columnWidth: 0, gap: 0 },
      } as MasonryLayoutResult<M>
    }

    // Resolve other inputs
    const gap = el ? (resolveInput(el, options.gap) ?? 0) : 0
    const columnWidth = el ? resolveInput(el, options.columnWidth) : undefined
    const horizontalOrder = !!(el ? resolveInput(el, options.horizontalOrder) : undefined)

    // Resolve columns (final columnWidth/gap) to support stampsCols conversion
    const resolved = computeColumns({
      gridWidth,
      gap: Math.max(0, Math.round(gap)),
      ...(typeof columnWidth === 'number'
        ? { columnWidth: Math.max(1, Math.round(columnWidth)) }
        : {}),
    })

    // Convert column-aligned stamps to pixel-based stamps
    const pixelStamps: MasonryStamp[] = []
    if (options.stampsCols && options.stampsCols.length > 0) {
      const cw = Math.round(resolved.columnWidth)
      const g = Math.round(resolved.gap)
      const step = cw + g
      for (const sc of options.stampsCols) {
        const span = Math.max(1, Math.floor(sc.span))
        const x = Math.round(sc.startCol * step)
        const width = Math.round(span * resolved.columnWidth + (span - 1) * resolved.gap)
        pixelStamps.push({
          x,
          y: Math.round(sc.top),
          width,
          height: Math.round(sc.height),
        })
      }
    }

    const mergedStamps = (options.stamps && options.stamps.length ? options.stamps : []).concat(
      pixelStamps,
    )

    return computeMasonryLayout(cells, {
      gridWidth,
      gap: resolved.gap,
      columnWidth: resolved.columnWidth,
      horizontalOrder,
      ...(mergedStamps.length ? { stamps: mergedStamps } : {}),
    })
  }, [
    cells,
    measuredWidth,
    options.width,
    options.gap,
    options.columnWidth,
    options.horizontalOrder,
    options.stamps,
    options.stampsCols,
  ])

  return {
    ref: gridRef,
    width: typeof options.width === 'number' ? options.width : measuredWidth,
    layout,
  }
}

export type Resolver<T> =
  | T
  | { cssVar: string; parse?: (raw: string) => T | undefined }
  | ((el: HTMLElement) => T | undefined)

/**
 * Resolve a value from a consumer-provided resolver:
 * - number/boolean literal
 * - CSS variable name (with optional parser)
 * - function that reads from the DOM element
 */
function resolveInput<T>(el: HTMLElement, resolver: Resolver<T> | undefined): T | undefined {
  if (resolver == null) return undefined
  if (typeof resolver === 'function') {
    try {
      return (resolver as (el: HTMLElement) => T | undefined)(el)
    } catch {
      return undefined
    }
  }
  if (typeof resolver === 'object' && 'cssVar' in resolver) {
    const raw =
      typeof window !== 'undefined'
        ? window.getComputedStyle(el).getPropertyValue(resolver.cssVar).trim()
        : ''
    if (!raw) return undefined
    if (resolver.parse) {
      try {
        return resolver.parse(raw)
      } catch {
        return undefined
      }
    }
    // Default parse for number/boolean-ish values
    const lowered = raw.toLowerCase()
    if (lowered === 'true') return true as unknown as T
    if (lowered === 'false') return false as unknown as T
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) ? (n as unknown as T) : (undefined as unknown as T)
  }
  // literal value
  return resolver as T
}

export type MasonryProps<M = unknown> = {
  /**
   * Grid cells driving the layout. Use height or aspectRatio (width/height).
   */
  cells: ReadonlyArray<MasonryCellInput<M>>
  /**
   * Grid inner width (px). If omitted, the component observes its own width.
   * Accepts a literal number, a CSS variable resolver, or a function resolver.
   */
  width?: Resolver<number>
  /**
   * Gap resolver: literal number, CSS var, or function.
   */
  gap?: Resolver<number>
  /**
   * Column width resolver: literal number, CSS var, or function.
   */
  columnWidth?: Resolver<number>
  /**
   * Horizontal order resolver: literal boolean, CSS var, or function.
   */
  horizontalOrder?: Resolver<boolean>
  /**
   * Optional px-based stamps that pre-occupy space.
   */
  stamps?: MasonryStamp[]
  /**
   * Optional column-aligned stamps; converted to px using resolved columns.
   */
  stampsCols?: Array<{ startCol: number; span: number; top: number; height: number }>
  /**
   * Return styles for each cell wrapper. You control which CSS properties/variables to set.
   */
  setCellStyle: (
    geom: { x: number; y: number; width: number; height: number },
    ctx: {
      index: number
      cell: MasonryCellInput<M>
      layout: MasonryLayoutResult<M>
    },
  ) => React.CSSProperties
  /**
   * Optionally return grid-level styles (for example, setting the grid height).
   */
  setGridStyle?: (
    grid: MasonryLayoutResult<M>['grid'],
    ctx: { layout: MasonryLayoutResult<M> },
  ) => React.CSSProperties
  /**
   * Optional applier to apply a style object to an element (used on updates).
   * Defaults to an internal applier that sets CSS custom properties and inline styles.
   */
  applyStyle?: (el: HTMLElement, style: React.CSSProperties) => void
  /**
   * Render function for a cell's content. Must return stable JSX for the cell key.
   */
  renderCell: (cell: MasonryCellInput<M>, index: number) => React.ReactNode
  /**
   * Optional function to derive a stable key for each cell. Defaults to cell.id || String(index).
   */
  keyForCell?: (cell: MasonryCellInput<M>, index: number) => string
  /**
   * Optional initial className/style for the grid wrapper.
   */
  gridClassName?: string
  gridStyle?: React.CSSProperties
  /**
   * Optional initial className/style for each cell wrapper.
   */
  cellClassName?: string
  cellStyle?: React.CSSProperties
  /**
   * Props applied to the root grid element. You control className/styles; this component won't dictate them.
   */
  gridProps?: React.HTMLAttributes<HTMLDivElement>
}

/**
 * Data-driven, imperative Masonry grid. Does not dictate class names or CSS variable names.
 * - Accepts data items and computes geometry with @masonrykit/core (re-exported via @masonrykit/browser).
 * - Renders imperatively for performance: creates DOM nodes once via renderItem and updates geometry inline.
 * - The container's width is either observed or provided, and the container's height is set inline.
 */
export function Masonry<M = unknown>({
  cells,
  width: widthInput,
  gap: gapInput,
  columnWidth: columnWidthInput,
  horizontalOrder: horizontalOrderInput,
  stamps,
  stampsCols,
  setCellStyle,
  setGridStyle,
  applyStyle: applyStyleProp,
  renderCell,
  keyForCell,
  gridClassName,
  gridStyle,
  cellClassName,
  cellStyle,
  gridProps,
}: MasonryProps<M>) {
  const {
    ref: rootRef,
    width: _gridWidth,
    layout,
  } = useMasonry<M>(cells, {
    width: widthInput ?? undefined,
    gap: gapInput ?? undefined,
    columnWidth: columnWidthInput ?? undefined,
    horizontalOrder: horizontalOrderInput ?? undefined,
    stamps: stamps ?? undefined,
    stampsCols: stampsCols ?? undefined,
  })

  // Track DOM nodes per cell key for stable reconciliation
  const nodesRef = useRef<Map<string, HTMLDivElement>>(new Map())

  // Prepare stable keys and refs for cells; content is provided by renderCell
  const keyFn =
    keyForCell ??
    ((cell: MasonryCellInput<M>, i: number) => (cell.id != null ? String(cell.id) : String(i)))

  const setCellRefForKey = (key: string) => (el: HTMLDivElement | null) => {
    if (el) {
      nodesRef.current.set(key, el)
    } else {
      nodesRef.current.delete(key)
    }
  }

  function defaultApplyStyle(el: HTMLElement, style: React.CSSProperties | undefined) {
    if (!style) return
    for (const [key, val] of Object.entries(style)) {
      try {
        if (key.startsWith('--')) {
          el.style.setProperty(key, String(val))
        } else {
          const prop = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
          el.style.setProperty(prop, val == null ? '' : String(val))
        }
      } catch {
        // noop
      }
    }
  }

  // Apply geometry from hook-computed layout
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (!cells || cells.length === 0) {
      root.style.height = '0px'
      return
    }

    if (layout.grid.width <= 0) return

    // Optionally let consumer set grid-level styles (e.g., height)
    if (setGridStyle) {
      const gs = setGridStyle(layout.grid, { layout })
      // Merge user-provided static gridStyle with dynamic styles before applying
      const mergedGridStyle: React.CSSProperties = { ...(gridStyle || {}), ...(gs || {}) }
      ;(applyStyleProp ?? defaultApplyStyle)(root, mergedGridStyle)
    } else if (gridStyle) {
      // Apply static gridStyle if provided
      ;(applyStyleProp ?? defaultApplyStyle)(root, gridStyle)
    }

    // Let consumer write per-cell geometry
    for (const cell of layout.cells) {
      const cellData = cells[cell.index]!
      const key = (keyForCell?.(cellData, cell.index) ??
        (cellData.id != null ? String(cellData.id) : String(cell.index))) as string
      const node = nodesRef.current.get(key)
      if (!node) continue

      const cs = setCellStyle(
        { x: cell.x, y: cell.y, width: cell.width, height: cell.height },
        { index: cell.index, cell: cellData, layout },
      )
      // Merge user-provided static cellStyle with dynamic styles before applying
      const mergedCellStyle: React.CSSProperties = { ...(cellStyle || {}), ...(cs || {}) }
      ;(applyStyleProp ?? defaultApplyStyle)(node, mergedCellStyle)
    }
  }, [layout, cells, keyForCell, setCellStyle, setGridStyle])

  return (
    <div
      {...gridProps}
      ref={rootRef}
      className={[gridProps?.className, gridClassName].filter(Boolean).join(' ')}
      style={{ ...(gridProps?.style || {}), ...(gridStyle || {}) }}
    >
      {cells.map((cell, index) => {
        const key = keyFn(cell, index)
        return (
          <div key={key} ref={setCellRefForKey(key)} className={cellClassName} style={cellStyle}>
            {renderCell(cell, index)}
          </div>
        )
      })}
    </div>
  )
}

/* Masonry is exported as the primary API above */

export type MasonryListProps<T> = {
  data: readonly T[]
  getCell: (
    item: T,
    index: number,
    array: readonly T[],
  ) => {
    id?: string
    height?: number
    aspectRatio?: number
    columnSpan?: number
  }
  renderCell: (item: T, index: number) => React.ReactNode
  keyForItem?: (item: T, index: number) => string
} & Omit<MasonryProps<T>, 'cells' | 'renderCell' | 'keyForCell'>

export function MasonryList<T>(props: MasonryListProps<T>) {
  const { data, getCell, renderCell: renderDataCell, keyForItem, ...rest } = props

  const cells = useMemo(() => {
    return data.map((d, i, arr) => {
      const base =
        getCell(d, i, arr) ??
        ({} as { id?: string; height?: number; aspectRatio?: number; columnSpan?: number })
      const hasHeight = typeof base.height === 'number'
      const hasAspect = typeof base.aspectRatio === 'number'
      const cell: MasonryCellInput<T> = {
        ...(base.id != null ? { id: base.id } : {}),
        ...(base.columnSpan != null ? { columnSpan: base.columnSpan } : {}),
        ...(hasHeight
          ? { height: base.height as number }
          : hasAspect
            ? { aspectRatio: base.aspectRatio as number }
            : { height: 0 }),
        meta: d,
      }
      return cell
    })
  }, [data, getCell])

  return (
    <Masonry<T>
      {...rest}
      cells={cells}
      renderCell={(_cell, index) => renderDataCell(data[index]!, index)}
      keyForCell={(cell, index) =>
        keyForItem ? keyForItem(data[index]!, index) : (cell.id ?? String(index))
      }
    />
  )
}

// Convenience writer with practical --mk-* defaults

export function cssVarWriter() {
  return (geom: { x: number; y: number; width: number; height: number }, _ctx?: unknown) =>
    ({
      '--mk-cell-x': `${geom.x}px`,
      '--mk-cell-y': `${geom.y}px`,
      '--mk-cell-width': `${geom.width}px`,
      '--mk-cell-height': `${geom.height}px`,
    }) as React.CSSProperties
}
