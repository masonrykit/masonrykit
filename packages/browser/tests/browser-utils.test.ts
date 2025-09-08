import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { observeElementWidth, raf, parseCssNumber, getCssNumber } from '../src/index'

describe('Browser utilities', () => {
  describe('observeElementWidth', () => {
    let testElement: HTMLElement

    beforeEach(() => {
      testElement = document.createElement('div')
      testElement.style.width = '100px'
      testElement.style.height = '50px'
      document.body.appendChild(testElement)
    })

    afterEach(() => {
      document.body.removeChild(testElement)
    })

    it('calls callback immediately with current width', () => {
      const callback = vi.fn()

      observeElementWidth(testElement, callback)

      expect(callback).toHaveBeenCalledWith(100)
    })

    it('returns no-op function when element is null', () => {
      const dispose = observeElementWidth(null, vi.fn())
      expect(typeof dispose).toBe('function')
      dispose() // Should not throw
    })

    it('returns dispose function that stops observing', () => {
      const callback = vi.fn()

      const dispose = observeElementWidth(testElement, callback)
      expect(typeof dispose).toBe('function')

      dispose()
    })

    it('does not call callback after disposed with ResizeObserver', () => {
      // Stub ResizeObserver to track calls
      const mockDisconnect = vi.fn()
      const mockObserve = vi.fn()

      vi.stubGlobal(
        'ResizeObserver',
        vi.fn(() => ({
          observe: mockObserve,
          disconnect: mockDisconnect,
        })),
      )

      const callback = vi.fn()
      const dispose = observeElementWidth(testElement, callback)

      // Clear the initial call count (from the immediate measure() call)
      callback.mockClear()

      // Dispose the observer
      dispose()

      // Verify disconnect was called
      expect(mockDisconnect).toHaveBeenCalled()

      // Callback should not be called after disposal
      expect(callback).not.toHaveBeenCalled()

      // Restore global
      vi.unstubAllGlobals()
    })
  })

  describe('raf', () => {
    it('calls function via requestAnimationFrame', async () => {
      const fn = vi.fn()

      raf(fn)

      // Wait for next frame
      await new Promise((resolve) => requestAnimationFrame(resolve))

      expect(fn).toHaveBeenCalled()
    })
  })

  describe('parseCssNumber', () => {
    it('returns undefined for null/undefined values', () => {
      expect(parseCssNumber(null)).toBeUndefined()
      expect(parseCssNumber(undefined)).toBeUndefined()
      expect(parseCssNumber('')).toBeUndefined()
    })

    it('parses valid numbers', () => {
      expect(parseCssNumber('42')).toBe(42)
      expect(parseCssNumber('3.14')).toBe(3.14)
      expect(parseCssNumber('-10')).toBe(-10)
      expect(parseCssNumber('0')).toBe(0)
    })

    it('parses numbers with units', () => {
      expect(parseCssNumber('100px')).toBe(100)
      expect(parseCssNumber('1.5em')).toBe(1.5)
      expect(parseCssNumber('50%')).toBe(50)
    })

    it('handles whitespace', () => {
      expect(parseCssNumber('  42  ')).toBe(42)
      expect(parseCssNumber('\t100px\n')).toBe(100)
    })

    it('returns undefined for invalid numbers', () => {
      expect(parseCssNumber('abc')).toBeUndefined()
      expect(parseCssNumber('px100')).toBeUndefined()
      expect(parseCssNumber('not-a-number')).toBeUndefined()
    })

    it('returns undefined for infinity', () => {
      expect(parseCssNumber('Infinity')).toBeUndefined()
      expect(parseCssNumber('-Infinity')).toBeUndefined()
    })

    it('returns undefined for NaN', () => {
      expect(parseCssNumber('NaN')).toBeUndefined()
    })
  })

  describe('getCssNumber', () => {
    let testElement: HTMLElement

    beforeEach(() => {
      testElement = document.createElement('div')
      document.body.appendChild(testElement)
    })

    afterEach(() => {
      document.body.removeChild(testElement)
    })

    it('returns first valid number from multiple property names', () => {
      testElement.style.setProperty('--prop1', 'invalid')
      testElement.style.setProperty('--prop2', '42px')
      testElement.style.setProperty('--prop3', '100px')

      const result = getCssNumber(testElement, '--prop1', '--prop2', '--prop3')

      expect(result).toBe(42)
    })

    it('returns undefined when no valid numbers found', () => {
      testElement.style.setProperty('--prop1', 'invalid')
      testElement.style.setProperty('--prop2', 'also-invalid')

      const result = getCssNumber(testElement, '--prop1', '--prop2')

      expect(result).toBeUndefined()
    })

    it('handles empty property list', () => {
      const result = getCssNumber(testElement)

      expect(result).toBeUndefined()
    })

    it('works with regular CSS properties', () => {
      testElement.style.width = '150px'
      testElement.style.height = '75px'

      const width = getCssNumber(testElement, 'width')
      const height = getCssNumber(testElement, 'height')

      expect(width).toBe(150)
      expect(height).toBe(75)
    })
  })
})
