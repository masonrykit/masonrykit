---
'@masonrykit/react': patch
---

fix(react): two `ResizeObserver` regressions in `useMasonry`

**#10 — width observer never attached when `gridRef` element mounts after initial render.** The effect that wired the grid's auto-width `ResizeObserver` latched `gridElRef.current` at first mount. Components that render a loading state and only mount the grid after data arrives would see `gridElRef.current === null` on the initial effect run; the callback ref would populate it later, but the effect wouldn't re-run and cells rendered with `width: 0` forever. Fixed by tracking the grid element in `useState` so the effect re-fires when it arrives.

**#9 — measured-cell heights lost under React 18 StrictMode.** The tracker lifecycle created it in the render body and disconnected it via an empty-dep `useEffect` cleanup. StrictMode simulates an unmount/remount by running cleanups between mount passes, which disconnected the tracker and nulled its ref. Subsequent measurements then had no observer to fire them, so the hook's `measuredHeights` stayed empty. Fixed by moving the tracker's creation into a lazy `getTracker()` factory called from the per-cell ref callback — if the cleanup ran spuriously, the next ref re-attach (which StrictMode triggers during the remount pass) recreates the tracker and re-observes the cell.

Both regressions have browser tests under `packages/react/__tests__/regressions.test.tsx`; they fail against 0.2.0 and pass with the fixes.
