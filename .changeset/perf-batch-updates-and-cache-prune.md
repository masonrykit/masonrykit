---
'@masonrykit/react': patch
---

perf(react): batch measurement updates via rAF; rAF-throttle scroll tick; prune ref cache on cells change

Three internal optimizations to `useMasonry`, behaviour-neutral.

**1. rAF-batched `setMeasuredHeights` updates.** Previously each `ResizeObserver` callback did `setMeasuredHeights(prev => new Map(prev).set(id, h))`. On initial mount of a grid with N measured cells, that's N updater calls, each allocating a new Map copy of size up to N — O(N²) Map allocations. Now incoming measurements buffer in a pending map and flush once per frame via `requestAnimationFrame`, collapsing to a single state commit and one Map allocation per frame. Scales O(N²) → O(N) for large initial mounts. Tracker creation is extracted into an `ensureTracker` helper so the render-body eager init, the mount effect, and the per-cell ref callback all share the same batched `onChange` closure.

**2. rAF-throttled virtualization scroll/resize handler.** The listener that ticked `viewportTick` on every scroll event now coalesces ticks through `requestAnimationFrame`. On 120 Hz input devices this cuts re-renders from ~120/s to frame-rate-bound, matching the pattern used in `@masonrykit/browser`'s `observeElementWidth`.

**3. Ref cache pruning on cells change.** The internal `refCacheRef` per-id ref map previously accumulated entries for every id ever passed to the hook. In long-running apps with high cell churn (infinite scroll, filter changes) that grew unboundedly. An effect keyed on `cells` now drops cache entries for ids that are no longer in the input.

No API changes. All 127 browser-mode tests pass; one new test (`perf — ref cache prune on cells removal`) covers the re-measurement path after remove + re-add.
