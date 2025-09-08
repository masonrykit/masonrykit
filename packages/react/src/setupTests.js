/**
 * setupTests.js
 *
 * Minimal test setup for @masonrykit/react in Vitest Browser Mode.
 * Ensures requestAnimationFrame exists (Playwright provides the rest).
 */

(() => {
  if (typeof window === 'undefined') return;

  if (typeof window.requestAnimationFrame !== 'function') {
    window.requestAnimationFrame = (cb) =>
      window.setTimeout(() => cb(performance.now()), 16);
  }
})();

// Ensure this file is treated as an ES module in Node environments.
export {};
