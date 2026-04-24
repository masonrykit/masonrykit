---
'@masonrykit/react': patch
---

fix(react): restore measured-height tracking under React 18 StrictMode (closes #9 follow-up, #15)

The 0.2.1 fix for issue #9 moved the measured-height tracker's creation from the render body into the per-cell `cellRef` callback. In real-world React 18 StrictMode usage this caused `measuredHeights` to stay permanently empty — the `ResizeObserver` callbacks were wired up but never propagated updates.

Two changes restore correct behaviour:

1. **Eager tracker init in the render body** (revert of 0.2.1). `trackerRef.current ??= createMeasuredHeightTracker(...)` is back at the top level of `useMasonry` so the tracker is guaranteed to exist by the time any cell ref fires.

2. **Replay observations on every mount effect**. A new `observedElementsRef` map tracks which elements are currently attached. The cleanup-only `useEffect` is replaced with one that, on setup, re-observes every tracked element:

   ```ts
   useEffect(() => {
     const tracker = trackerRef.current
     if (!tracker) return () => {}
     for (const [id, element] of observedElementsRef.current) {
       tracker.observe(id, element)
     }
     return () => {
       trackerRef.current?.disconnect()
       trackerRef.current = null
     }
   }, [])
   ```

   React 18 StrictMode runs cleanup then setup between its two mount passes. The first pass observes everything; the cleanup disconnects; the second setup pass re-observes every still-attached element from `observedElementsRef`. Measurements resume correctly.

The 0.2.1 fix for issue #10 (track the grid element in `useState` so the auto-width observer attaches when the grid mounts late) is retained.

Thanks to @lifeiscontent for the detailed root-cause analysis in #15.
