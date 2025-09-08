import { describe, it, expect } from 'vitest'
import {
  createHeightCell,
  createAspectCell,
  createGridCssVarsStyle,
  createCellCssVarsStyle,
  type LayoutResult,
} from '../src/index'

describe('Helper functions', () => {
  describe('createHeightCell', () => {
    it('creates height-based cell without meta', () => {
      const cell = createHeightCell('height-1', 250)

      expect(cell).toEqual({
        id: 'height-1',
        type: 'height',
        height: 250,
      })
    })

    it('creates height-based cell with meta', () => {
      const cell = createHeightCell('height-2', 180, { category: 'tall' })

      expect(cell).toEqual({
        id: 'height-2',
        type: 'height',
        height: 180,
        meta: { category: 'tall' },
      })
    })

    it('creates height-based cell with columnSpan', () => {
      const cell = createHeightCell('height-3', 100, { data: 'test' }, { columnSpan: 2 })

      expect(cell).toEqual({
        id: 'height-3',
        type: 'height',
        height: 100,
        meta: { data: 'test' },
        columnSpan: 2,
      })
    })

    it('excludes meta when not provided', () => {
      const cell = createHeightCell('height-4', 100)

      expect(cell).toEqual({
        id: 'height-4',
        type: 'height',
        height: 100,
      })
      expect(cell).not.toHaveProperty('meta')
    })
  })

  describe('createAspectCell', () => {
    it('creates aspect-ratio-based cell without meta', () => {
      const cell = createAspectCell('aspect-1', 1.5)

      expect(cell).toEqual({
        id: 'aspect-1',
        type: 'aspect',
        aspectRatio: 1.5,
      })
    })

    it('creates aspect-ratio-based cell with meta', () => {
      const cell = createAspectCell('aspect-2', 0.75, { orientation: 'portrait' })

      expect(cell).toEqual({
        id: 'aspect-2',
        type: 'aspect',
        aspectRatio: 0.75,
        meta: { orientation: 'portrait' },
      })
    })

    it('creates aspect-ratio-based cell with columnSpan', () => {
      const cell = createAspectCell('aspect-3', 16 / 9, { type: 'image' }, { columnSpan: 2 })

      expect(cell).toEqual({
        id: 'aspect-3',
        type: 'aspect',
        aspectRatio: 16 / 9,
        meta: { type: 'image' },
        columnSpan: 2,
      })
    })
  })

  describe('createGridCssVarsStyle', () => {
    it('creates grid CSS variables style object', () => {
      const styleFunction = createGridCssVarsStyle()

      const mockLayout: LayoutResult = {
        grid: {
          width: 800,
          height: 600,
          columnCount: 3,
          columnWidth: 250,
          gap: 12,
        },
        cells: [],
      }

      const styles = styleFunction(mockLayout)

      expect(styles).toEqual({
        '--mk-grid-width': '800px',
        '--mk-grid-height': '600px',
        '--mk-grid-columns': '3',
      })
    })

    it('handles zero values correctly', () => {
      const styleFunction = createGridCssVarsStyle()

      const mockLayout: LayoutResult = {
        grid: {
          width: 0,
          height: 0,
          columnCount: 0,
          columnWidth: 0,
          gap: 0,
        },
        cells: [],
      }

      const styles = styleFunction(mockLayout)

      expect(styles).toEqual({
        '--mk-grid-width': '0px',
        '--mk-grid-height': '0px',
        '--mk-grid-columns': '0',
      })
    })
  })

  describe('createCellCssVarsStyle', () => {
    it('creates cell CSS variables style object', () => {
      const styleFunction = createCellCssVarsStyle()

      const mockCell = {
        id: 'test3',
        index: 2,
        column: 1,
        span: 1,
        x: 206,
        y: 150,
        width: 200,
        height: 100,
        meta: undefined,
      }

      const styles = styleFunction(mockCell, 0)

      expect(styles).toEqual({
        '--mk-cell-x': '206px',
        '--mk-cell-y': '150px',
        '--mk-cell-width': '200px',
        '--mk-cell-height': '100px',
        '--mk-cell-column': '1', // Uses cell.column directly
      })
    })

    it('calculates column index correctly', () => {
      const styleFunction = createCellCssVarsStyle()

      const mockCell = {
        id: 'test',
        index: 0,
        column: 2,
        span: 1,
        x: 424, // Position for column 2 with width 200 + gap 12
        y: 0,
        width: 200,
        height: 100,
        meta: undefined,
      }

      const styles = styleFunction(mockCell, 0)

      expect(styles).toEqual({
        '--mk-cell-x': '424px',
        '--mk-cell-y': '0px',
        '--mk-cell-width': '200px',
        '--mk-cell-height': '100px',
        '--mk-cell-column': '2', // Uses cell.column directly
      })
    })

    it('handles zero dimensions', () => {
      const styleFunction = createCellCssVarsStyle()

      const mockCell = {
        id: 'test2',
        index: 1,
        column: 0,
        span: 2,
        x: 0,
        y: 100,
        width: 412,
        height: 200,
        meta: undefined,
      }

      const styles = styleFunction(mockCell, 0)

      expect(styles).toEqual({
        '--mk-cell-x': '0px',
        '--mk-cell-y': '100px',
        '--mk-cell-width': '412px',
        '--mk-cell-height': '200px',
        '--mk-cell-column': '0', // Math.floor(0 / (412 + 12))
      })
    })
  })
})
