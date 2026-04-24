---
'@masonrykit/react': patch
---

fix(react): revert lazy tracker initialization (closes #9 follow-up)

The 0.2.1 fix for issue #9 moved the measured-height tracker's creation from the render body into the per-cell `cellRef` callback. In real-world usage (as reported on the issue) this caused `measuredHeights` to stay permanently empty — the `ResizeObserver` callbacks were set up but their state updates never propagated. Measured cells stayed at `estimatedHeight` forever.

Restore the 0.2.0 behaviour: create the tracker eagerly in the render body via `trackerRef.current ??= createMeasuredHeightTracker(...)`. This is the pattern that worked in 0.2.0 and that existing consumers depend on. The `cellRef` callback goes back to the simpler "read tracker from ref, return if null, else observe/unobserve" guard pattern.

The 0.2.1 fix for issue #10 (track the grid element in `useState` so the auto-width observer attaches when the grid mounts late) is retained — that was a genuine bug fix and didn't regress anything.
