/**
 * Breakpoint resolution is pure: given (breakpoints, gridWidth), return the
 * entry with the largest `minWidth <= gridWidth`, or `undefined` if none
 * match. Callers merge with their defaults.
 */
import { describe, it, expect } from 'vitest'
import { resolveBreakpoint, type Breakpoint } from '../src/index'

const TIERS: Breakpoint[] = [
  { minWidth: 0, columnWidth: 160, gap: 8 },
  { minWidth: 768, columnWidth: 220, gap: 12 },
  { minWidth: 1280, columnWidth: 280, gap: 16 },
]

describe('@masonrykit/core - resolveBreakpoint', () => {
  it('picks the largest matching minWidth', () => {
    expect(resolveBreakpoint(TIERS, 0)).toEqual(TIERS[0])
    expect(resolveBreakpoint(TIERS, 767)).toEqual(TIERS[0])
    expect(resolveBreakpoint(TIERS, 768)).toEqual(TIERS[1])
    expect(resolveBreakpoint(TIERS, 1279)).toEqual(TIERS[1])
    expect(resolveBreakpoint(TIERS, 1280)).toEqual(TIERS[2])
    expect(resolveBreakpoint(TIERS, 2000)).toEqual(TIERS[2])
  })

  it('returns undefined when no entry matches', () => {
    const onlyLarge: Breakpoint[] = [{ minWidth: 1024, columnWidth: 220 }]
    expect(resolveBreakpoint(onlyLarge, 500)).toBeUndefined()
  })

  it('returns undefined for an empty list', () => {
    expect(resolveBreakpoint([], 1000)).toBeUndefined()
  })

  it('ignores entry ordering (largest-minWidth-wins is order-independent)', () => {
    expect(resolveBreakpoint(TIERS.toReversed(), 900)).toEqual(TIERS[1])
  })
})
