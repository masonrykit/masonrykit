/**
 * setupTests.ts
 *
 * Minimal test setup for @masonrykit/react in Vitest Browser Mode.
 * Ensure requestAnimationFrame exists (Playwright provides the rest).
 */

;(() => {
  if (typeof window === 'undefined') return

  if (typeof window.requestAnimationFrame !== 'function') {
    window.requestAnimationFrame = (cb: (time: number) => void): number =>
      window.setTimeout(() => cb(performance.now()), 16)
  }
})()

export {}
