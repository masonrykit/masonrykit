#!/usr/bin/env node
/**
 * Bundle-size budget check.
 *
 * Reads each published package's `dist/index.js`, compares its byte count
 * (raw and gzip) against the budget below, and fails if any exceed the
 * threshold. Run after `pnpm build` — intended for CI but also useful
 * locally before shipping.
 *
 * Update the budget deliberately. Regressions should be justified in a
 * changeset; intentional savings should lower the budget.
 */
import { gzipSync } from 'node:zlib'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

// Budgets expressed in bytes. Leave a modest (~15%) headroom over current
// sizes so routine refactors don't trip the gate. Trim when you intentionally
// slim something down.
const BUDGET = {
  '@masonrykit/core': { raw: 8 * 1024, gzip: 3 * 1024 },
  '@masonrykit/browser': { raw: 3 * 1024, gzip: 1.5 * 1024 },
  '@masonrykit/react': { raw: 12 * 1024, gzip: 4 * 1024 },
}

const PACKAGES = [
  { name: '@masonrykit/core', dist: 'packages/core/dist/index.js' },
  { name: '@masonrykit/browser', dist: 'packages/browser/dist/index.js' },
  { name: '@masonrykit/react', dist: 'packages/react/dist/index.js' },
]

const fmt = (bytes) => `${(bytes / 1024).toFixed(2)} kB`
const pct = (actual, limit) => `${((actual / limit) * 100).toFixed(0)}%`

let failed = false
const rows = []

for (const { name, dist } of PACKAGES) {
  const path = resolve(process.cwd(), dist)
  try {
    statSync(path)
  } catch {
    console.error(`✗ ${name}: ${dist} not found — run \`pnpm build\` first`)
    failed = true
    continue
  }
  const raw = readFileSync(path)
  const gzip = gzipSync(raw)
  const budget = BUDGET[name]
  const rawOk = raw.length <= budget.raw
  const gzipOk = gzip.length <= budget.gzip
  rows.push({ name, raw: raw.length, gzip: gzip.length, budget, rawOk, gzipOk })
  if (!rawOk || !gzipOk) failed = true
}

// If every dist file was missing, `failed` is already true and `rows` is
// empty — exit before `Math.max(...[])` returns -Infinity.
if (rows.length === 0) {
  console.error('No packages found. Run `pnpm build` first.')
  process.exit(1)
}

const maxName = Math.max(...rows.map((r) => r.name.length))
const pad = (s, w) => s.padEnd(w)

console.log('')
console.log(`${pad('Package', maxName)}   Raw                       Gzip`)
console.log(`${pad('-'.repeat(maxName), maxName)}   ${'-'.repeat(25)} ${'-'.repeat(25)}`)
for (const r of rows) {
  const rawIcon = r.rawOk ? '✓' : '✗'
  const gzipIcon = r.gzipOk ? '✓' : '✗'
  const rawStr = `${rawIcon} ${fmt(r.raw)} / ${fmt(r.budget.raw)} (${pct(r.raw, r.budget.raw)})`
  const gzipStr = `${gzipIcon} ${fmt(r.gzip)} / ${fmt(r.budget.gzip)} (${pct(r.gzip, r.budget.gzip)})`
  console.log(`${pad(r.name, maxName)}   ${pad(rawStr, 25)} ${gzipStr}`)
}
console.log('')

if (failed) {
  console.error(
    'Bundle budget exceeded. Either optimize, or raise the budget in scripts/check-bundle-size.js with a changeset explaining why.',
  )
  process.exit(1)
} else {
  console.log('All packages within budget.')
}
