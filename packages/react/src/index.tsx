/**
 * @masonrykit/react
 *
 * Beautiful, performant masonry layouts for React.
 */
import { useMemo, useRef, useState, useEffect, useLayoutEffect, Fragment } from 'react'
import {
  computeColumns,
  computeMasonryLayout,
  convertColumnStampsToPixel,
  type LayoutResult,
  type Stamp,
  type Cell,
  type ColumnStamp,
  type HeightCell,
  type AspectRatioCell,
} from '@masonrykit/core'
import { observeElementWidth } from '@masonrykit/browser'

export type {
  LayoutResult,
  Stamp,
  ColumnStamp,
  Cell,
  HeightCell,
  AspectRatioCell,
  Meta,
} from '@masonrykit/core'

export type Config<M = undefined> = {
  gap?: number
  columnWidth?: number
  gridWidth?: number
  horizontalOrder?: boolean
  stamps?: Stamp[]
  stampsCols?: ColumnStamp[]
  getGridStyle?: (layout: LayoutResult<M>) => React.CSSProperties | undefined
  getCellStyle?: (
    cell: LayoutResult<M>['cells'][0],
    index: number,
  ) => React.CSSProperties | undefined
}

export type HookResult<M = undefined> = {
  gridRef: React.RefObject<HTMLDivElement | null>
  layout: LayoutResult<M>
  width: number
  stableCells: readonly Cell<M>[]
}

export type Props<M = undefined> = Config<M> & {
  cells: readonly Cell<M>[]
  children: ((cell: Cell<M>, index: number) => React.ReactNode) | React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function useMasonry<M = undefined>(
  cells: readonly Cell<M>[],
  config: Config<M> = {},
): HookResult<M> {
  const {
    gap = 12,
    columnWidth,
    gridWidth,
    horizontalOrder = false,
    stamps = [],
    stampsCols = [],
    getGridStyle,
    getCellStyle,
  } = config

  const gridRef = useRef<HTMLDivElement | null>(null)
  const [measuredWidth, setMeasuredWidth] = useState(0)
  const stableCellsRef = useRef<readonly Cell<M>[]>([])

  // Use useMemo to compute stable cells based on the cells array
  // This ensures that stableCells always reflects the current cells array
  const stableCells = useMemo(() => {
    const currentIds = stableCellsRef.current.map((cell) => cell.id)
    const newIds = cells.map((cell) => cell.id)

    // Initialize on first render
    if (stableCellsRef.current.length === 0) {
      stableCellsRef.current = [...cells]
      return stableCellsRef.current
    }

    // If length is different (items added/removed), update stable cells
    if (cells.length !== stableCellsRef.current.length) {
      stableCellsRef.current = [...cells]
      return stableCellsRef.current
    }

    // Check if ID sets are different (items added/removed/changed)
    const currentIdSet = new Set(currentIds)
    const newIdSet = new Set(newIds)
    if (
      currentIdSet.size !== newIdSet.size ||
      !Array.from(currentIdSet).every((id) => newIdSet.has(id))
    ) {
      stableCellsRef.current = [...cells]
      return stableCellsRef.current
    }

    // If same ID set but different order (shuffle), update data in-place
    if (!currentIds.every((id, index) => id === newIds[index])) {
      // Create a map for quick lookup of new cell data by ID
      const newCellsById = new Map(cells.map((cell) => [cell.id, cell]))

      // Update existing stable cells array elements in-place to preserve DOM nodes
      stableCellsRef.current = stableCellsRef.current.map((stableCell) => {
        const newCell = newCellsById.get(stableCell.id)
        return newCell || stableCell
      })
    }

    return stableCellsRef.current
  }, [cells])

  useEffect(() => {
    if (gridWidth != null) return
    const grid = gridRef.current
    if (!grid) return

    return observeElementWidth(grid, (w) => setMeasuredWidth(Math.max(0, Math.floor(w))))
  }, [gridWidth])

  const cellInputs = useMemo((): readonly Cell<M>[] => {
    return cells.map((cell): Cell<M> => {
      const baseCell = {
        id: cell.id,
        columnSpan: cell.columnSpan ?? 1,
      }

      if ('height' in cell && cell.height != null) {
        const result: any = {
          ...baseCell,
          type: 'height' as const,
          height: cell.height,
        }
        if (cell.meta !== undefined) {
          result.meta = cell.meta
        }
        return result as HeightCell<M>
      } else if ('aspectRatio' in cell && cell.aspectRatio != null) {
        const result: any = {
          ...baseCell,
          type: 'aspect' as const,
          aspectRatio: cell.aspectRatio,
        }
        if (cell.meta !== undefined) {
          result.meta = cell.meta
        }
        return result as AspectRatioCell<M>
      } else {
        // Default fallback to height cell
        const result: any = {
          ...baseCell,
          type: 'height' as const,
          height: 100,
        }
        if (cell.meta !== undefined) {
          result.meta = cell.meta
        }
        return result as HeightCell<M>
      }
    })
  }, [cells])

  const layout = useMemo(() => {
    const resolvedGridWidth = gridWidth ?? measuredWidth
    if (resolvedGridWidth <= 0 || cellInputs.length === 0) {
      return {
        cells: [],
        grid: { width: resolvedGridWidth, height: 0, columnCount: 0, columnWidth: 0, gap },
      } as LayoutResult<M>
    }

    const resolved = computeColumns({
      gridWidth: resolvedGridWidth,
      gap,
      ...(columnWidth ? { columnWidth } : {}),
    })

    const pixelStamps = stampsCols.length ? convertColumnStampsToPixel(stampsCols, resolved) : []
    const allStamps = [...stamps, ...pixelStamps]

    return computeMasonryLayout(cellInputs, {
      gridWidth: resolvedGridWidth,
      gap: resolved.gap,
      columnWidth: resolved.columnWidth,
      columns: resolved,
      horizontalOrder,
      ...(allStamps.length ? { stamps: allStamps } : {}),
    })
  }, [cellInputs, gridWidth, measuredWidth, gap, columnWidth, horizontalOrder, stamps, stampsCols])

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    if (getGridStyle) {
      const styles = getGridStyle(layout)
      if (styles) {
        Object.entries(styles).forEach(([key, value]) => {
          grid.style.setProperty(key, String(value))
        })
      }
    }

    if (getCellStyle) {
      layout.cells.forEach((cell, layoutIndex) => {
        const stableIndex = stableCellsRef.current.findIndex(
          (stableCell) => stableCell.id === cell.id,
        )
        if (stableIndex === -1) return

        const cellElement = grid.children[stableIndex] as HTMLElement
        if (!cellElement) return

        const styles = getCellStyle(cell, layoutIndex)
        if (styles) {
          Object.entries(styles).forEach(([key, value]) => {
            cellElement.style.setProperty(key, String(value))
          })
        }
      })
    }
  }, [layout, getGridStyle, getCellStyle])

  return {
    gridRef,
    layout,
    width: gridWidth ?? measuredWidth,
    stableCells,
  }
}

export function createGridCssVarsStyle<M = unknown>() {
  return (layout: LayoutResult<M>): React.CSSProperties =>
    ({
      '--mk-grid-width': `${layout.grid.width}px`,
      '--mk-grid-height': `${layout.grid.height}px`,
      '--mk-grid-columns': `${layout.grid.columnCount}`,
    }) as React.CSSProperties
}

export function createCellCssVarsStyle<M = undefined>() {
  return (cell: LayoutResult<M>['cells'][0], _index: number): React.CSSProperties =>
    ({
      '--mk-cell-x': `${cell.x}px`,
      '--mk-cell-y': `${cell.y}px`,
      '--mk-cell-width': `${cell.width}px`,
      '--mk-cell-height': `${cell.height}px`,
      '--mk-cell-column': `${cell.column}`,
    }) as React.CSSProperties
}

export function Masonry<M = undefined>({ cells, children, className, style, ...config }: Props<M>) {
  const { gridRef, stableCells } = useMasonry<M>(cells, config)

  return (
    <div ref={gridRef} className={className} style={style}>
      {typeof children === 'function'
        ? stableCells.map((cell, index) => (
            <Fragment key={cell.id ?? index}>{children(cell, index)}</Fragment>
          ))
        : children}
    </div>
  )
}

export function createHeightCell<T = undefined>(
  id: string,
  height: number,
  meta?: T,
  options?: { columnSpan?: number },
): HeightCell<T> {
  const result: any = {
    id,
    type: 'height' as const,
    height,
    ...(options?.columnSpan ? { columnSpan: options.columnSpan } : {}),
  }

  if (meta !== undefined) {
    result.meta = meta
  }

  return result
}

export function createAspectCell<T = undefined>(
  id: string,
  aspectRatio: number,
  meta?: T,
  options?: { columnSpan?: number },
): AspectRatioCell<T> {
  const result: any = {
    id,
    type: 'aspect' as const,
    aspectRatio,
    ...(options?.columnSpan ? { columnSpan: options.columnSpan } : {}),
  }

  if (meta !== undefined) {
    result.meta = meta
  }

  return result
}
