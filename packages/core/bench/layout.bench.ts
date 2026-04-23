/**
 * Vitest benchmarks for `computeLayout`.
 *
 * Run with `pnpm bench` at the repo root (or `pnpm --filter @masonrykit/core bench`).
 *
 * Each `bench()` runs enough iterations for tinybench to converge on a
 * stable mean and report mean/min/max/p99/hz/samples. Groups compare
 * throughput of configurations that share a baseline.
 */
import { bench, describe } from 'vitest'
import { aspectCell, computeLayout, heightCell, type Cell, type Stamp } from '../src/index'

const CONFIGS = [
  { name: 'Small Grid (400w)', gridWidth: 400, columnWidth: 120, gap: 8 },
  { name: 'Medium Grid (800w)', gridWidth: 800, columnWidth: 180, gap: 12 },
  { name: 'Large Grid (1200w)', gridWidth: 1200, columnWidth: 200, gap: 16 },
  { name: 'Dense Grid (1600w)', gridWidth: 1600, columnWidth: 160, gap: 4 },
] as const

const ITEM_COUNTS = [50, 100, 500, 1000, 2000] as const

// Deterministic test data so perf numbers are comparable across runs.
function generateItems(count: number): Cell[] {
  const items: Cell[] = []
  let seed = 1337
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  for (let i = 0; i < count; i++) {
    const r = rnd()
    const columnSpan = rnd() < 0.1 ? 2 : 1
    if (r < 0.3) {
      const ratios = [0.75, 1, 1.25, 1.5, 1.77, 2, 0.5]
      const ratio = ratios[Math.floor(rnd() * ratios.length)]
      if (ratio !== undefined) {
        items.push(aspectCell(`item-${i}`, ratio, { columnSpan }))
      }
    } else {
      items.push(heightCell(`item-${i}`, 100 + Math.floor(rnd() * 300), { columnSpan }))
    }
  }
  return items
}

// Precompute datasets once — generation time shouldn't skew the numbers.
const DATASETS: ReadonlyMap<number, Cell[]> = new Map(ITEM_COUNTS.map((n) => [n, generateItems(n)]))

for (const config of CONFIGS) {
  describe(config.name, () => {
    for (const count of ITEM_COUNTS) {
      const items = DATASETS.get(count)!
      bench(`${count} items`, () => {
        computeLayout(items, {
          gridWidth: config.gridWidth,
          columnWidth: config.columnWidth,
          gap: config.gap,
        })
      })
    }
  })
}

describe('500 items / medium grid — feature overhead', () => {
  const items = DATASETS.get(500)!
  const base = { gridWidth: 800, columnWidth: 180, gap: 12 } as const

  bench('baseline', () => {
    computeLayout(items, base)
  })

  const stamps: Stamp[] = [
    { x: 0, y: 0, width: 240, height: 40 },
    { x: 260, y: 60, width: 180, height: 80 },
  ]
  bench('with stamps', () => {
    computeLayout(items, { ...base, stamps })
  })

  bench('horizontal order', () => {
    computeLayout(items, { ...base, horizontalOrder: true })
  })
})
