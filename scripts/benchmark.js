#!/usr/bin/env node

/**
 * Performance benchmark for MasonryKit core algorithms
 *
 * This script measures the performance of layout computations
 * with various configurations and data sizes.
 */

import { performance } from 'perf_hooks'
import { computeMasonryLayout } from '../packages/core/dist/index.js'

// Test configurations
const CONFIGS = [
  { name: 'Small Grid', gridWidth: 400, columnWidth: 120, gap: 8 },
  { name: 'Medium Grid', gridWidth: 800, columnWidth: 180, gap: 12 },
  { name: 'Large Grid', gridWidth: 1200, columnWidth: 200, gap: 16 },
  { name: 'Dense Grid', gridWidth: 1600, columnWidth: 160, gap: 4 },
]

const ITEM_COUNTS = [50, 100, 500, 1000, 2000]

// Generate deterministic test data
function generateItems(count) {
  const items = []
  let seed = 1337

  // Simple pseudo-random generator
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  for (let i = 0; i < count; i++) {
    const r = rnd()

    if (r < 0.3) {
      // Aspect ratio items (30%)
      const aspectRatios = [0.75, 1, 1.25, 1.5, 1.77, 2, 0.5]
      const aspectRatio = aspectRatios[Math.floor(rnd() * aspectRatios.length)]
      items.push({
        id: `item-${i}`,
        type: 'aspect',
        aspectRatio,
        columnSpan: rnd() < 0.1 ? 2 : 1, // 10% span 2 columns
      })
    } else {
      // Height items (70%)
      const height = 100 + Math.floor(rnd() * 300) // 100-400px
      items.push({
        id: `item-${i}`,
        type: 'height',
        height,
        columnSpan: rnd() < 0.1 ? 2 : 1, // 10% span 2 columns
      })
    }
  }

  return items
}

// Benchmark function
function benchmark(name, fn, iterations = 100) {
  // Warmup
  for (let i = 0; i < 10; i++) {
    fn()
  }

  const times = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    const end = performance.now()
    times.push(end - start)
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  const sortedTimes = [...times].sort((a, b) => a - b)
  const p95 = sortedTimes[Math.floor((times.length - 1) * 0.95)]

  return { name, avg, min, max, p95, iterations }
}

// Memory usage tracking
function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage()
    return {
      rss: Math.round((usage.rss / 1024 / 1024) * 100) / 100,
      heapUsed: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100,
    }
  }
  return null
}

// Format results table
function formatResults(results) {
  console.log('\n📊 Benchmark Results')
  console.log('='.repeat(80))

  console.log(
    `${'Test'.padEnd(36)} ${'Avg (ms)'.padStart(10)} ${'Min (ms)'.padStart(10)} ${'Max (ms)'.padStart(10)} ${'P95 (ms)'.padStart(10)}`,
  )
  console.log('-'.repeat(80))

  results.forEach((result) => {
    console.log(
      `${result.name.padEnd(36)} ${result.avg.toFixed(2).padStart(10)} ${result.min.toFixed(2).padStart(10)} ${result.max.toFixed(2).padStart(10)} ${result.p95.toFixed(2).padStart(10)}`,
    )
  })
}

// Main benchmark runner
async function runBenchmarks() {
  console.log('🚀 Starting MasonryKit Performance Benchmarks')
  console.log(`Node.js ${process.version}`)

  const initialMemory = getMemoryUsage()
  if (initialMemory) {
    console.log(`Initial Memory: ${initialMemory.heapUsed}MB / ${initialMemory.heapTotal}MB`)
  }

  const results = []

  for (const config of CONFIGS) {
    console.log(`\n🔧 Testing configuration: ${config.name}`)

    for (const itemCount of ITEM_COUNTS) {
      const items = generateItems(itemCount)

      const testName = `${config.name} - ${itemCount} items`

      const result = benchmark(
        testName,
        () => {
          computeMasonryLayout(items, {
            gridWidth: config.gridWidth,
            columnWidth: config.columnWidth,
            gap: config.gap,
          })
        },
        itemCount > 1000 ? 50 : 100, // Fewer iterations for large datasets
      )

      results.push(result)

      // Show progress
      process.stdout.write(`  ${itemCount} items: ${result.avg.toFixed(2)}ms avg\n`)

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
    }
  }

  // Test with stamps
  console.log('\n🎯 Testing with stamps...')
  const items = generateItems(500)
  const stamps = [
    { x: 0, y: 0, width: 240, height: 40 },
    { x: 260, y: 60, width: 180, height: 80 },
  ]

  const stampResult = benchmark('Medium Grid - 500 items + stamps', () => {
    computeMasonryLayout(items, {
      gridWidth: 800,
      columnWidth: 180,
      gap: 12,
      stamps,
    })
  })

  results.push(stampResult)

  // Test horizontal order
  const horizontalResult = benchmark('Medium Grid - 500 items (horizontal)', () => {
    computeMasonryLayout(items, {
      gridWidth: 800,
      columnWidth: 180,
      gap: 12,
      horizontalOrder: true,
    })
  })

  results.push(horizontalResult)

  formatResults(results)

  const finalMemory = getMemoryUsage()
  if (finalMemory) {
    console.log(`\n💾 Final Memory: ${finalMemory.heapUsed}MB / ${finalMemory.heapTotal}MB`)
  }

  // Performance thresholds
  console.log('\n🎯 Performance Analysis:')

  const criticalTests = results.filter(
    (r) => r.name.includes('1000 items') || r.name.includes('2000 items'),
  )
  const slowTests = criticalTests.filter((r) => r.avg > 50) // > 50ms average

  if (slowTests.length > 0) {
    console.log('⚠️  Performance concerns:')
    slowTests.forEach((test) => {
      console.log(`  • ${test.name}: ${test.avg.toFixed(2)}ms (target: <50ms)`)
    })
  } else {
    console.log('✅ All large dataset tests under 50ms average')
  }

  const veryFast = results.filter((r) => r.avg < 5)
  console.log(`⚡ ${veryFast.length} tests completed under 5ms`)

  console.log('\n🏁 Benchmark complete!')
}

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('❌ Benchmark failed:', err)
  process.exit(1)
})

// Run benchmarks
runBenchmarks().catch(console.error)
