/**
 * @masonrykit/core
 *
 * Pure, framework-agnostic utilities to compute Masonry-style grid layouts.
 */

export type Meta<M> = [M] extends [undefined] ? { meta?: M } : { meta: M }

// Common dimensional types
export type Dimension = {
  width: number
  height: number
}

export type Position = {
  x: number
  y: number
}

export type CellBase<M = undefined> = {
  id?: string
  columnSpan?: number
} & Meta<M>

export type HeightCell<M = undefined> = CellBase<M> & {
  type: 'height'
  height: number
}

export type AspectRatioCell<M = undefined> = CellBase<M> & {
  type: 'aspect'
  aspectRatio: number
}

export type Cell<M = undefined> = HeightCell<M> | AspectRatioCell<M>

export type Stamp = Position & Dimension

export type ColumnConfig = {
  columnCount: number
  columnWidth: number
  gap: number
}

export type LayoutOptions = {
  gridWidth?: number
  gap?: number
  columnWidth?: number
  columns?: ColumnConfig
  horizontalOrder?: boolean
  stamps?: Stamp[]
}

export type LayoutCell<M = undefined> = {
  index: number
  id?: string
  column: number
  span: number
} & Position &
  Dimension &
  Meta<M>

export type GridInfo = Dimension & {
  columnCount: number
  columnWidth: number
  gap: number
}

export type LayoutResult<M = undefined> = {
  cells: LayoutCell<M>[]
  grid: GridInfo
}

// Helper to ensure non-negative values
const nonNegative = (value: number): number => Math.max(0, value)

// Helper to ensure at least 1
const atLeastOne = (value: number): number => Math.max(1, value)

export function computeColumns(options: {
  gridWidth?: number
  gap?: number
  columnWidth?: number
}): ColumnConfig {
  const gridWidth = nonNegative(options.gridWidth ?? 0)
  const gap = nonNegative(options.gap ?? 0)
  const baseColumnWidth = options.columnWidth ?? (gridWidth > 0 ? gridWidth : 1)
  const columnWidth = atLeastOne(baseColumnWidth)

  const cols = Math.floor((gridWidth + gap) / (columnWidth + gap))
  const columnCount = atLeastOne(cols)
  const totalGaps = gap * nonNegative(columnCount - 1)
  const available = nonNegative(gridWidth - totalGaps)
  const resolvedColumnWidth = columnCount > 0 ? available / columnCount : available

  return {
    columnCount,
    columnWidth: resolvedColumnWidth,
    gap,
  }
}

export function computeMasonryLayout<M = undefined>(
  cells: readonly Cell<M>[],
  options: LayoutOptions,
): LayoutResult<M> {
  const { columnCount, columnWidth, gap } = options.columns
    ? options.columns
    : computeColumns(options)

  const columnsHeights = Array.from({ length: columnCount }, () => 0)
  const out: LayoutCell<M>[] = []

  const r = (v: number) => Math.round(v)
  const cw = r(columnWidth)
  const g = r(gap)

  if (options.stamps && options.stamps.length > 0) {
    const step = cw + g
    for (const s of options.stamps) {
      const sx = nonNegative(s.x)
      const sy = nonNegative(s.y)
      const sw = nonNegative(s.width)
      const sh = nonNegative(s.height)
      const sRight = sx + sw

      for (let c = 0; c < columnCount; c++) {
        const colLeft = c * step
        const colRight = colLeft + cw
        const overlaps = Math.max(colLeft, sx) < Math.min(colRight, sRight)
        if (overlaps) {
          const base = r(sy + sh + g)
          columnsHeights[c] = Math.max(columnsHeights[c] ?? 0, base)
        }
      }
    }
  }

  const horizontal = !!options.horizontalOrder
  let horizontalColIndex = 0

  for (let i = 0; i < cells.length; i++) {
    const it = cells[i]
    if (!it) continue

    const span = atLeastOne(Math.min(columnCount, it.columnSpan ?? 1))
    const itemPixelWidth = span * cw + (span - 1) * g

    const rawHeight =
      it.type === 'height'
        ? nonNegative(it.height)
        : it.type === 'aspect' && it.aspectRatio > 0
          ? nonNegative(itemPixelWidth / it.aspectRatio)
          : 0
    const h = r(rawHeight)

    let col = 0
    let y = 0

    const rangeHeight = (start: number, spanLen: number) => {
      let maxY = 0
      for (let k = 0; k < spanLen; k++) {
        const yk = columnsHeights[start + k] ?? 0
        if (yk > maxY) maxY = yk
      }
      return maxY
    }

    if (horizontal) {
      let start = horizontalColIndex % atLeastOne(columnCount)
      if (start + span > columnCount) start = 0
      col = start
      y = rangeHeight(col, span)
      if (itemPixelWidth > 0 && h > 0) {
        horizontalColIndex += span
      }
    } else {
      let bestCol = 0
      let bestY = rangeHeight(0, span)
      for (let c = 1; c <= columnCount - span; c++) {
        const yCandidate = rangeHeight(c, span)
        if (yCandidate < bestY) {
          bestY = yCandidate
          bestCol = c
        }
      }
      col = bestCol
      y = bestY
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
    } as LayoutCell<M>)

    const newBottom = y + h + g
    for (let k = 0; k < span; k++) {
      const cIndex = col + k
      columnsHeights[cIndex] = Math.max(columnsHeights[cIndex] ?? 0, newBottom)
    }
  }

  const tallest = columnsHeights.length ? Math.max(...columnsHeights.map((h) => h ?? 0)) : 0
  const gridHeight = nonNegative(tallest - (cells.length > 0 ? g : 0))

  return {
    cells: out,
    grid: {
      width: nonNegative(options.gridWidth ?? 0),
      height: r(gridHeight),
      columnCount,
      columnWidth: cw,
      gap: g,
    },
  }
}

export type ColumnStamp = {
  startCol: number
  span: number
  y: number
  height: number
}

export function convertColumnStampsToPixel(
  stampsCols: ColumnStamp[],
  columns: { columnWidth: number; gap: number },
): Stamp[] {
  const stamps: Stamp[] = []
  const step = columns.columnWidth + columns.gap

  for (const sc of stampsCols) {
    const span = atLeastOne(Math.floor(sc.span))
    const x = sc.startCol * step
    const width = span * columns.columnWidth + (span - 1) * columns.gap

    stamps.push({
      x: Math.round(x),
      y: Math.round(sc.y),
      width: Math.round(width),
      height: Math.round(sc.height),
    })
  }

  return stamps
}
