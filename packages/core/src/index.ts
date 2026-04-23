/**
 * @masonrykit/core
 *
 * Pure, framework-agnostic utilities for computing masonry-style grid layouts.
 */

/**
 * Meta<M> — when the cell is parameterized with a concrete meta type,
 * `meta` is required; when left as the default `undefined`, `meta` is optional.
 * This lets `cell.meta.src` type-check without a `!` assertion when users
 * declare their meta shape.
 */
export type Meta<M> = [M] extends [undefined] ? { meta?: M } : { meta: M }

export type HeightCell<M = undefined> = {
  id: string
  type: 'height'
  height: number
  columnSpan?: number
} & Meta<M>

export type AspectCell<M = undefined> = {
  id: string
  type: 'aspect'
  aspectRatio: number
  columnSpan?: number
} & Meta<M>

/**
 * A cell whose height is discovered from the DOM — typically via a
 * `ResizeObserver` attached to the rendered element. `estimatedHeight`
 * seeds the layout before the first measurement lands so the initial
 * paint isn't visibly empty. Framework bindings resolve `MeasuredCell`
 * into a `HeightCell` for `computeLayout`.
 */
export type MeasuredCell<M = undefined> = {
  id: string
  type: 'measured'
  columnSpan?: number
  estimatedHeight?: number
} & Meta<M>

export type Cell<M = undefined> = HeightCell<M> | AspectCell<M> | MeasuredCell<M>

export type Stamp = {
  x: number
  y: number
  width: number
  height: number
}

export type ColumnStamp = {
  column: number
  span: number
  y: number
  height: number
}

export type Columns = {
  count: number
  width: number
  gap: number
}

export type LayoutCell<M = undefined> = {
  index: number
  id: string
  column: number
  span: number
  x: number
  y: number
  width: number
  height: number
} & Meta<M>

export type Layout<M = undefined> = {
  cells: LayoutCell<M>[]
  width: number
  height: number
  columns: Columns
}

export type LayoutOptions = {
  gridWidth: number
  columnWidth?: number
  gap?: number
  horizontalOrder?: boolean
  stamps?: readonly Stamp[]
  columnStamps?: readonly ColumnStamp[]
}

const round = Math.round
const clampMin = (v: number, min: number): number => (v < min ? min : v)

export function computeColumns(options: {
  gridWidth: number
  columnWidth?: number
  gap?: number
}): Columns {
  const gridWidth = clampMin(options.gridWidth, 0)
  const gap = clampMin(options.gap ?? 0, 0)
  const desired = clampMin(options.columnWidth ?? clampMin(gridWidth, 1), 1)

  const count = clampMin(Math.floor((gridWidth + gap) / (desired + gap)), 1)
  const totalGaps = gap * (count - 1)
  const width = (gridWidth - totalGaps) / count

  return { count, width: round(width), gap: round(gap) }
}

export function columnStampsToPixels(
  stamps: readonly ColumnStamp[],
  columns: Pick<Columns, 'width' | 'gap'>,
): Stamp[] {
  const step = columns.width + columns.gap
  return stamps.map((s): Stamp => {
    const span = clampMin(Math.floor(s.span), 1)
    const width = span * columns.width + (span - 1) * columns.gap
    return {
      x: round(s.column * step),
      y: round(s.y),
      width: round(width),
      height: round(s.height),
    }
  })
}

export function computeLayout<M = undefined>(
  cells: readonly Cell<M>[],
  options: LayoutOptions,
): Layout<M> {
  const columns = computeColumns(options)
  const { count, width: cw, gap } = columns
  const step = cw + gap

  const columnHeights: number[] = Array.from({ length: count }, () => 0)

  const applyStamp = (s: Stamp) => {
    const sx = clampMin(s.x, 0)
    const sy = clampMin(s.y, 0)
    const sw = clampMin(s.width, 0)
    const sh = clampMin(s.height, 0)
    const sRight = sx + sw
    const baseline = round(sy + sh + gap)

    for (let c = 0; c < count; c++) {
      const colLeft = c * step
      const colRight = colLeft + cw
      if (Math.max(colLeft, sx) < Math.min(colRight, sRight)) {
        columnHeights[c] = Math.max(columnHeights[c]!, baseline)
      }
    }
  }

  if (options.stamps) for (const s of options.stamps) applyStamp(s)
  if (options.columnStamps) {
    for (const s of columnStampsToPixels(options.columnStamps, columns)) applyStamp(s)
  }

  const placed: LayoutCell<M>[] = []
  let horizontalCursor = 0

  const rangeMax = (start: number, len: number) => {
    let max = 0
    for (let k = 0; k < len; k++) {
      const h = columnHeights[start + k]!
      if (h > max) max = h
    }
    return max
  }

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!
    const span = Math.min(count, clampMin(cell.columnSpan ?? 1, 1))
    const width = span * cw + (span - 1) * gap

    let height: number
    switch (cell.type) {
      case 'height':
        height = clampMin(cell.height, 0)
        break
      case 'aspect':
        if (!(cell.aspectRatio > 0)) {
          throw new Error(
            `@masonrykit/core: cell "${cell.id}" has invalid aspectRatio ${cell.aspectRatio}; must be > 0`,
          )
        }
        height = width / cell.aspectRatio
        break
      case 'measured':
        // Measured cells have no known height at layout time. Framework
        // bindings typically attach a ResizeObserver to the rendered cell
        // and re-run `computeLayout` with the result as a `HeightCell`.
        // `estimatedHeight` is used until that first measurement lands.
        height = clampMin(cell.estimatedHeight ?? 0, 0)
        break
    }
    height = round(height)

    let column: number
    let y: number

    if (options.horizontalOrder === true) {
      let start = horizontalCursor % count
      if (start + span > count) start = 0
      column = start
      y = rangeMax(column, span)
      if (width > 0 && height > 0) horizontalCursor += span
    } else {
      column = 0
      y = rangeMax(0, span)
      for (let c = 1; c <= count - span; c++) {
        const candidate = rangeMax(c, span)
        if (candidate < y) {
          y = candidate
          column = c
        }
      }
    }

    const x = column * step
    const bottom = y + height + gap
    for (let k = 0; k < span; k++) {
      const c = column + k
      columnHeights[c] = Math.max(columnHeights[c]!, bottom)
    }

    const base = {
      index: i,
      id: cell.id,
      column,
      span,
      x: round(x),
      y: round(y),
      width: round(width),
      height,
    }
    const laid = (cell.meta !== undefined ? { ...base, meta: cell.meta } : base) as LayoutCell<M>
    placed.push(laid)
  }

  const tallest = columnHeights.length > 0 ? Math.max(...columnHeights) : 0
  const layoutHeight = round(clampMin(tallest - (cells.length > 0 ? gap : 0), 0))

  return {
    cells: placed,
    width: round(clampMin(options.gridWidth, 0)),
    height: layoutHeight,
    columns,
  }
}

/* -------------------------------------------------------------------------- */
/* Cell factories                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Construct a `HeightCell`. The overloads ensure `meta` is required when
 * supplied so `cell.meta.src` type-checks without a non-null assertion.
 */
export function heightCell(
  id: string,
  height: number,
  options?: { columnSpan?: number },
): HeightCell
export function heightCell<M>(
  id: string,
  height: number,
  options: { columnSpan?: number; meta: M },
): HeightCell<M>
export function heightCell<M = undefined>(
  id: string,
  height: number,
  options?: { columnSpan?: number; meta?: M },
): HeightCell<M> {
  const base: Record<string, unknown> = { id, type: 'height', height }
  if (options?.columnSpan !== undefined) base.columnSpan = options.columnSpan
  if (options?.meta !== undefined) base.meta = options.meta
  return base as HeightCell<M>
}

export function aspectCell(
  id: string,
  aspectRatio: number,
  options?: { columnSpan?: number },
): AspectCell
export function aspectCell<M>(
  id: string,
  aspectRatio: number,
  options: { columnSpan?: number; meta: M },
): AspectCell<M>
export function aspectCell<M = undefined>(
  id: string,
  aspectRatio: number,
  options?: { columnSpan?: number; meta?: M },
): AspectCell<M> {
  const base: Record<string, unknown> = { id, type: 'aspect', aspectRatio }
  if (options?.columnSpan !== undefined) base.columnSpan = options.columnSpan
  if (options?.meta !== undefined) base.meta = options.meta
  return base as AspectCell<M>
}

export function measuredCell(
  id: string,
  options?: { columnSpan?: number; estimatedHeight?: number },
): MeasuredCell
export function measuredCell<M>(
  id: string,
  options: { columnSpan?: number; estimatedHeight?: number; meta: M },
): MeasuredCell<M>
export function measuredCell<M = undefined>(
  id: string,
  options?: { columnSpan?: number; estimatedHeight?: number; meta?: M },
): MeasuredCell<M> {
  const base: Record<string, unknown> = { id, type: 'measured' }
  if (options?.columnSpan !== undefined) base.columnSpan = options.columnSpan
  if (options?.estimatedHeight !== undefined) base.estimatedHeight = options.estimatedHeight
  if (options?.meta !== undefined) base.meta = options.meta
  return base as MeasuredCell<M>
}

/* -------------------------------------------------------------------------- */
/* Breakpoints                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A responsive override applied when the grid's width reaches `minWidth`.
 * The matching entry with the largest `minWidth` wins; unset fields fall
 * through to the caller's defaults.
 */
export type Breakpoint = {
  minWidth: number
  columnWidth?: number
  gap?: number
}

/**
 * Given a grid width and an ordered list of breakpoints, return the entry
 * with the largest `minWidth <= gridWidth`, or `undefined` if none match.
 * Pure function — callers merge `columnWidth` / `gap` with their defaults.
 */
export function resolveBreakpoint(
  breakpoints: readonly Breakpoint[],
  gridWidth: number,
): Breakpoint | undefined {
  let match: Breakpoint | undefined
  for (const bp of breakpoints) {
    if (gridWidth >= bp.minWidth && (!match || bp.minWidth > match.minWidth)) {
      match = bp
    }
  }
  return match
}

/* -------------------------------------------------------------------------- */
/* Virtualization                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Vertical viewport bounds expressed in the same coordinate space as the
 * grid's top offset (usually viewport-relative pixels).
 */
export type Viewport = {
  top: number
  bottom: number
}

/**
 * Filter laid-out cells down to the subset that intersects the viewport
 * (± `overscan` pixels). Pure geometry — browsers read the actual viewport
 * via `getBoundingClientRect` / `window.innerHeight` and pass numbers here.
 *
 * @param cells      Cells to filter (typically `layout.cells` in stable order).
 * @param gridTop    The grid's top edge in the same coord space as `viewport`.
 * @param viewport   Viewport top/bottom bounds.
 * @param overscan   Pixels above/below the viewport to keep rendered. Default 0.
 */
export function filterVisibleCells<M = undefined>(
  cells: readonly LayoutCell<M>[],
  gridTop: number,
  viewport: Viewport,
  overscan = 0,
): readonly LayoutCell<M>[] {
  const top = viewport.top - overscan
  const bottom = viewport.bottom + overscan
  return cells.filter((cell) => {
    const cellTop = gridTop + cell.y
    const cellBottom = cellTop + cell.height
    return cellBottom >= top && cellTop <= bottom
  })
}
