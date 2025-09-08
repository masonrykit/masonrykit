/**
 * @masonrykit/core
 *
 * Pure, framework-agnostic utilities to compute Masonry-style grid layouts.
 * - No DOM measurements are performed here; you provide grid width and item sizing.
 * - Pure and deterministic: same inputs => same outputs.
 *
 * @example
 * ```ts
 * const { columnCount, columnWidth } = computeColumns({ gridWidth, columnWidth: 220, gap: 12 })
 * const layout = computeMasonryLayout(items, { gridWidth, columnWidth: 220, gap: 12 })
 * ```
 */

/**
 * Input shape for a Masonry layout item.
 * Height (px) takes precedence; otherwise height is derived from aspectRatio.
 * @public
 */
/**
 * Input shape for a Masonry layout item.
 * Height (px) takes precedence; otherwise height is derived from aspectRatio.
 * @public
 */
export type MasonryCellInput<M = undefined> = {
  /**
   * Optional stable identifier for the item.
   */
  id?: string
  /**
   * Optional number of columns this item spans. Defaults to 1. Clamped to [1, columnCount].
   */
  columnSpan?: number
  /**
   * Free-form metadata you might want to carry through the layout.
   */
} & ([M] extends [undefined] ? { meta?: M } : { meta: M }) &
  (
    | {
        /**
         * Explicit height in pixels.
         * When provided, aspectRatio must not be specified.
         */
        height: number
        aspectRatio?: never
      }
    | {
        /**
         * width / height ratio (e.g., 16/9 or 4/3).
         * Used to derive height when explicit height is not provided.
         * When provided, height must not be specified.
         */
        aspectRatio: number
        height?: never
      }
  )

/**
 * Pixel-based rectangle that reserves space in the grid.
 * @public
 */
export type MasonryStamp = {
  /**
   * X position from the left edge of the grid (px).
   */
  x: number
  /**
   * Y position from the top edge of the grid (px).
   */
  y: number
  /**
   * Rectangle width (px).
   */
  width: number
  /**
   * Rectangle height (px).
   */
  height: number
}

/**
 * Resolved column system for a given grid width and gap.
 * @public
 */
export type MasonryResolvedColumns = {
  columnCount: number
  columnWidth: number
  gap: number
}

/**
 * Options for computing a Masonry layout.
 * @public
 */
export type MasonryOptions = {
  /**
   * The grid's inner width in pixels (excluding paddings you don't want to use).
   */
  gridWidth: number
  /**
   * Horizontal/vertical gap between items (in pixels). Default: 0.
   */
  gap?: number
  /**
   * Provide a desired column width; columns are derived to fit the grid.
   */
  columnWidth?: number
  /**
   * When true, place items in horizontal (row-wise) order, which can be preferable
   * for certain visual flows. Default: false uses the classic "shortest column" strategy.
   */
  horizontalOrder?: boolean
  /**
   * Optional stamps (rectangles) that pre-occupy space in the grid.
   * Each stamp is applied as a baseline to any overlapped column: baseline = y + height + gap.
   */
  stamps?: MasonryStamp[]
}

/**
 * Represents a computed item in the Masonry layout result.
 * @public
 */
export type MasonryLayoutCell<M = undefined> = {
  index: number
  id?: string | undefined
  column: number
  span: number
  x: number
  y: number
  width: number
  height: number
} & ([M] extends [undefined] ? { meta?: M } : { meta: M })

/**
 * Result of a Masonry layout computation: grid info and per-cell geometry.
 * @public
 */
export type MasonryLayoutResult<M = unknown> = {
  cells: MasonryLayoutCell<M>[]

  grid: {
    width: number
    height: number
    columnCount: number
    columnWidth: number
    gap: number
  }
}

/**
 * Compute column count/width for a given grid width and a desired column width.
 *
 * Rules:
 * - Column count is derived from columnWidth and gridWidth.
 * - At least 1 column is always returned.
 *
 * @public
 */
export function computeColumns(options: {
  gridWidth: number
  gap?: number
  columnWidth?: number
}): MasonryResolvedColumns {
  const gridWidth = Math.max(0, options.gridWidth || 0)
  const gap = Math.max(0, options.gap ?? 0)

  // Derive columnCount from a desired columnWidth (or fallback to 1 column with full width)
  const targetWidth = Math.max(1, (options.columnWidth ?? gridWidth) || 1)
  const cols = Math.floor((gridWidth + gap) / (targetWidth + gap))
  const columnCount = Math.max(1, cols)
  const totalGaps = gap * Math.max(0, columnCount - 1)
  const available = Math.max(0, gridWidth - totalGaps)
  const columnWidth = columnCount > 0 ? available / columnCount : available

  return {
    columnCount,
    columnWidth,
    gap,
  }
}

/**
 * Computes a Masonry layout.
 *
 * Each cell is placed either:
 * - in the next column (row-wise) if horizontalOrder is true, or
 * - in the column with the current smallest total height (classic Masonry).
 *
 * Cell height is:
 * - `height` if provided, otherwise
 * - `columnWidth / aspectRatio` if `aspectRatio` is provided, otherwise 0.
 * @public
 */
export function computeMasonryLayout<M = undefined>(
  cells: readonly MasonryCellInput<M>[],
  options: MasonryOptions,
): MasonryLayoutResult<M> {
  const { columnCount, columnWidth, gap } = computeColumns(options)

  // Track the running height of each column.
  const columnsHeights = Array.from({ length: columnCount }, () => 0)

  const out: MasonryLayoutCell<M>[] = []

  // Always round to avoid sub-pixel jitter (no option).
  const r = (v: number) => Math.round(v)
  const cw = r(columnWidth)
  const g = r(gap)

  // Apply stamp baselines to columns before placing items.
  // Any column whose interior overlaps a stamp gets its baseline raised to (stamp.y + stamp.height + gap).
  if (options.stamps && options.stamps.length > 0) {
    const step = cw + g
    for (const s of options.stamps) {
      const sx = Math.max(0, s.x)
      const sy = Math.max(0, s.y)
      const sw = Math.max(0, s.width)
      const sh = Math.max(0, s.height)
      const sRight = sx + sw

      for (let c = 0; c < columnCount; c++) {
        const colLeft = c * step
        const colRight = colLeft + cw
        // Overlap occurs if stamp rectangle intersects the column's interior area.
        const overlaps = Math.max(colLeft, sx) < Math.min(colRight, sRight)
        if (overlaps) {
          const base = r(sy + sh + g)
          columnsHeights[c] = Math.max(columnsHeights[c] ?? 0, base)
        }
      }
    }
  }

  // Optional horizontal (row-wise) ordering
  const horizontal = !!options.horizontalOrder
  let horizontalColIndex = 0

  for (let i = 0; i < cells.length; i++) {
    const it = cells[i]
    if (!it) continue

    // Resolve column span and pixel width across columns (including inter-column gaps)
    const span = Math.max(1, Math.min(columnCount, it.columnSpan ?? 1))
    const itemPixelWidth = span * cw + (span - 1) * g

    // Derive height: explicit height wins; otherwise use aspectRatio against actual pixel width
    const rawHeight =
      typeof it.height === 'number'
        ? Math.max(0, it.height)
        : typeof it.aspectRatio === 'number' && it.aspectRatio > 0
        ? Math.max(0, itemPixelWidth / it.aspectRatio)
        : 0
    const h = r(rawHeight)

    // Choose column index and y position
    let col = 0
    let y = 0

    // Helper to compute the baseline for a span range: max of involved column heights
    const rangeHeight = (start: number, spanLen: number) => {
      let maxY = 0
      for (let k = 0; k < spanLen; k++) {
        const yk = columnsHeights[start + k] ?? 0
        if (yk > maxY) maxY = yk
      }
      return maxY
    }

    if (horizontal) {
      // Row-wise placement for spans:
      // - choose starting column from a running cursor
      // - wrap to 0 if span exceeds the columnCount near the edge
      let start = horizontalColIndex % Math.max(1, columnCount)
      if (start + span > columnCount) start = 0
      col = start
      y = rangeHeight(col, span)
      if (itemPixelWidth > 0 && h > 0) {
        horizontalColIndex += span
      }
    } else {
      // Classic "shortest column" placement for spans:
      // Evaluate each valid start (0..columnCount-span), pick the one with smallest range baseline.
      let bestCol = 0
      let bestY = Number.POSITIVE_INFINITY
      for (let c = 0; c <= columnCount - span; c++) {
        const yCandidate = rangeHeight(c, span)
        if (yCandidate < bestY) {
          bestY = yCandidate
          bestCol = c
        }
      }
      col = bestCol
      y = bestY === Number.POSITIVE_INFINITY ? 0 : bestY
    }

    const x = col * (cw + g)

    out.push({
      index: i,
      id: it.id,
      column: col,
      span,
      x: r(x),
      y: r(y),
      width: itemPixelWidth,
      height: h,
      meta: it.meta,
    } as MasonryLayoutCell<M>)

    // Update the column heights for the spanned range with this item's bottom (including gap)
    const newBottom = y + h + g
    for (let k = 0; k < span; k++) {
      const cIndex = col + k
      columnsHeights[cIndex] = Math.max(columnsHeights[cIndex] ?? 0, newBottom)
    }
  }

  // Grid height is the tallest column minus the final trailing gap
  const tallest = columnsHeights.length ? Math.max(...columnsHeights.map((v) => v ?? 0)) : 0
  const gridHeight = Math.max(0, tallest - (cells.length > 0 ? g : 0))

  return {
    cells: out,

    grid: {
      width: options.gridWidth,
      height: r(gridHeight),
      columnCount,
      columnWidth: cw,
      gap: g,
    },
  }
}

/* Browser helpers removed from @masonrykit/core to keep it math-only */

/**
 * Version of the library at build time. Replaced via bundler define.
 * Falls back to process.env when available, otherwise a neutral default.
 */
declare const __MK_VERSION__: string | undefined
declare const process:
  | undefined
  | {
      env?: {
        MASONRYKIT_VERSION?: string
      }
    }
/**
 * Version of the library at build time.
 * @public
 */
export const VERSION: string =
  typeof __MK_VERSION__ !== 'undefined'
    ? __MK_VERSION__
    : (typeof process !== 'undefined' && process.env?.MASONRYKIT_VERSION) || '0.0.0'
