import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import {
  computeColumns,
  computeMasonryLayout,
  type MasonryCellInput,
  type MasonryLayoutCell,
  type MasonryLayoutResult,
  type MasonryOptions,
  type MasonryStamp,
} from '@masonrykit/core'
import { observeElementWidth } from '@masonrykit/browser'

export type { MasonryLayoutCell, MasonryLayoutResult, MasonryOptions, MasonryStamp }

/**
 * Declarative column-aligned stamp descriptor.
 * These values are resolved to pixel-based stamps using the resolved columnWidth and gap.
 */
export type StampCols = {
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

/**
 * Options for the useMasonry hook.
 *
 * This hook is CSS-first by default:
 * - When `cssVars !== false`, it reads `--mk-cw` (or `--mk-cell-width`) and `--mk-gap` (or `--mk-cell-gap`)
 *   from the grid element's computed styles to derive columnWidth and gap.
 * - Explicit `columnWidth` and `gap` props override CSS variables when provided.
 *
 * Stamps:
 * - Provide px-based stamps via `stamps`, or
 * - Provide column-aligned stamps via `stampsCols`, which are converted to px using the resolved column/gap sizes.
 */
export type UseMasonryOptions = {
  /**
   * Horizontal/vertical gap between cells (in pixels). Overrides CSS vars when provided.
   */
  gap?: number
  /**
   * Desired column width; columns are derived to fit the grid. Overrides CSS vars when provided.
   */
  columnWidth?: number
  /**
   * When true, place cells in horizontal (row-wise) order.
   */
  horizontalOrder?: boolean
  /**
   * Optional explicit grid width. When provided, the hook will not measure width via ResizeObserver.
   */
  gridWidth?: number
  /**
   * Optional px-based stamps that pre-occupy space.
   */
  stamps?: MasonryStamp[]
  /**
   * Optional column-aligned stamps that will be converted to px stamps using resolved column/gap sizes.
   */
  stampsCols?: StampCols[]
  /**
   * When true (default), attempt to read CSS variables for columnWidth and gap:
   * --mk-cw (or --mk-cell-width) and --mk-gap (or --mk-cell-gap).
   *
   * Set to false to disable reading CSS vars.
   */
  cssVars?: boolean
}

/**
 * React hook that computes a Masonry layout for a list of cells.
 *
 * - If `options.gridWidth` is provided, it will be used directly (no measuring).
 * - Otherwise, the hook measures the width of the attached grid element.
 * - CSS variables (--mk-cw/--mk-cell-width and --mk-gap/--mk-cell-gap) are read by default unless `cssVars === false`.
 */
export function useMasonry<T extends MasonryCellInput<any>>(
  cells: readonly T[],
  options: UseMasonryOptions,
): {
  /**
   * Attach this ref to the grid element when you want the hook to measure width automatically.
   * Ignored if `options.gridWidth` is provided.
   */
  ref: React.RefObject<HTMLElement | null>
  /**
   * The latest measured or provided grid width.
   */
  width: number
  /**
   * The computed Masonry layout result.
   */
  layout: MasonryLayoutResult<T extends { meta: infer M } ? M : unknown>
} {
  const gridRef = useRef<HTMLElement | null>(null)

  const [measuredWidth, setMeasuredWidth] = useState<number>(0)

  // Observe the element width when gridWidth is not explicitly provided
  useEffect(() => {
    if (options.gridWidth != null) return
    const el = gridRef.current
    if (!el) return

    const dispose = observeElementWidth(el, (w) => setMeasuredWidth(w))
    return dispose
  }, [options.gridWidth])

  const layout = useMemo(() => {
    const effectiveGridWidth = options.gridWidth ?? measuredWidth

    // Read CSS variables for columnWidth and gap unless disabled
    let cssCw: number | undefined
    let cssGap: number | undefined
    if (options.cssVars !== false) {
      const el = gridRef.current as HTMLElement | null
      if (el && typeof window !== 'undefined') {
        const cs = window.getComputedStyle(el)
        const rawCw = cs.getPropertyValue('--mk-cw') || cs.getPropertyValue('--mk-cell-width')
        const rawGap = cs.getPropertyValue('--mk-gap') || cs.getPropertyValue('--mk-cell-gap')
        const parseNum = (v: string) => {
          const n = parseFloat(v)
          return Number.isFinite(n) ? n : undefined
        }
        cssCw = rawCw ? parseNum(rawCw) : undefined
        cssGap = rawGap ? parseNum(rawGap) : undefined
      }
    }

    const desiredCw = options.columnWidth ?? cssCw
    const desiredGap = options.gap ?? cssGap ?? 0

    // Resolve columns for this width and desired targets
    const resolved = computeColumns({
      gridWidth: effectiveGridWidth,
      gap: desiredGap,
      ...(typeof desiredCw === 'number' ? { columnWidth: desiredCw } : {}),
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

    const mergedStamps =
      (options.stamps && options.stamps.length > 0) || pixelStamps.length > 0
        ? [...(options.stamps ?? []), ...pixelStamps]
        : undefined

    type Meta = T extends { meta: infer M } ? M : unknown
    return computeMasonryLayout<Meta, T>(cells, {
      gridWidth: effectiveGridWidth,
      gap: resolved.gap,
      columnWidth: resolved.columnWidth,
      ...(options.horizontalOrder !== undefined
        ? { horizontalOrder: options.horizontalOrder }
        : {}),
      ...(mergedStamps ? { stamps: mergedStamps } : {}),
    })
  }, [
    cells,
    measuredWidth,
    options.gridWidth,
    options.gap,
    options.columnWidth,
    options.horizontalOrder,
    options.stamps,
    options.stampsCols,
    options.cssVars,
  ])

  return {
    ref: gridRef,
    width: options.gridWidth ?? measuredWidth,
    layout,
  }
}
