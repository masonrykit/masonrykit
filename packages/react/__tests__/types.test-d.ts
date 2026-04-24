/**
 * Compile-time type tests. Failures here show up as TypeScript errors, not
 * runtime assertion failures. These catch generic-flow regressions that
 * runtime tests can't (e.g. `meta` widening to `unknown` or becoming
 * optional when it should be required).
 *
 * Vitest runs these via `vitest --typecheck` and via our regular `tsc`
 * typecheck pass. The `test()` blocks never execute at runtime — the
 * file is treated as type-only.
 */
import { expectTypeOf, test } from 'vitest'
import {
  aspectCell,
  heightCell,
  measuredCell,
  useMasonry,
  type AspectCell,
  type Cell,
  type HeightCell,
  type Layout,
  type LayoutCell,
  type MasonryResult,
  type MeasuredCell,
} from '../src/index'

type Photo = { src: string; alt: string }

test('heightCell without meta returns HeightCell with optional meta', () => {
  const c = heightCell('a', 100)
  expectTypeOf(c).toEqualTypeOf<HeightCell>()
  expectTypeOf(c).toHaveProperty('id').toEqualTypeOf<string>()
  expectTypeOf(c).toHaveProperty('type').toEqualTypeOf<'height'>()
  expectTypeOf(c).toHaveProperty('height').toEqualTypeOf<number>()
  // meta is optional (may or may not be present)
  expectTypeOf(c.meta).toEqualTypeOf<undefined>()
})

test('heightCell with meta carries the meta type through to the return', () => {
  const c = heightCell('a', 100, { meta: { src: '/x.jpg', alt: 'x' } })
  expectTypeOf(c).toEqualTypeOf<HeightCell<Photo>>()
  // meta is required on HeightCell<Photo>
  expectTypeOf(c.meta).toEqualTypeOf<Photo>()
  expectTypeOf(c.meta.src).toEqualTypeOf<string>()
})

test('aspectCell preserves generic meta', () => {
  const c = aspectCell('a', 16 / 9, { meta: { src: '/x.jpg', alt: 'x' } })
  expectTypeOf(c).toEqualTypeOf<AspectCell<Photo>>()
  expectTypeOf(c.meta).toEqualTypeOf<Photo>()
})

test('measuredCell overloads: without meta returns MeasuredCell', () => {
  const c = measuredCell('a')
  expectTypeOf(c).toEqualTypeOf<MeasuredCell>()
  expectTypeOf(c.estimatedHeight).toEqualTypeOf<number | undefined>()
  expectTypeOf(c.meta).toEqualTypeOf<undefined>()
})

test('measuredCell overloads: with meta preserves generic', () => {
  const c = measuredCell('a', {
    estimatedHeight: 200,
    meta: { src: '/x.jpg', alt: 'x' },
  })
  expectTypeOf(c).toEqualTypeOf<MeasuredCell<Photo>>()
  expectTypeOf(c.meta).toEqualTypeOf<Photo>()
})

test('useMasonry<M> threads meta through to layout cells', () => {
  const cells: Cell<Photo>[] = [
    heightCell('p1', 100, { meta: { src: '/a.jpg', alt: 'A' } }),
    aspectCell('p2', 1, { meta: { src: '/b.jpg', alt: 'B' } }),
  ]
  const result = useMasonry(cells, { gridWidth: 200, columnWidth: 100 })

  expectTypeOf(result).toEqualTypeOf<MasonryResult<Photo>>()
  expectTypeOf(result.layout).toEqualTypeOf<Layout<Photo>>()
  expectTypeOf(result.layout.cells[0]!).toEqualTypeOf<LayoutCell<Photo>>()
  // meta is non-optional when M is a concrete type
  expectTypeOf(result.layout.cells[0]!.meta).toEqualTypeOf<Photo>()
  expectTypeOf(result.layout.cells[0]!.meta.src).toEqualTypeOf<string>()
  expectTypeOf(result.stableCells[0]!.meta).toEqualTypeOf<Photo>()
})

test('useMasonry without generic defaults to optional meta', () => {
  const result = useMasonry([heightCell('a', 100)], { gridWidth: 200 })
  expectTypeOf(result).toEqualTypeOf<MasonryResult>()
  // meta is the optional variant
  expectTypeOf(result.layout.cells[0]!.meta).toEqualTypeOf<undefined>()
})

test('useMasonry accepts all three cell types in one array', () => {
  const cells: Cell<Photo>[] = [
    heightCell('a', 100, { meta: { src: '/a.jpg', alt: 'A' } }),
    aspectCell('b', 1, { meta: { src: '/b.jpg', alt: 'B' } }),
    measuredCell('c', { estimatedHeight: 200, meta: { src: '/c.jpg', alt: 'C' } }),
  ]
  const result = useMasonry(cells, { gridWidth: 300, columnWidth: 100 })
  expectTypeOf(result.stableCells[0]!.meta).toEqualTypeOf<Photo>()
  expectTypeOf(result.visibleCells).toEqualTypeOf<readonly LayoutCell<Photo>[]>()
})

test('gridRef and cellRef are typed as ref callbacks', () => {
  const { gridRef, cellRef } = useMasonry([heightCell('a', 100)], { gridWidth: 200 })
  expectTypeOf(gridRef).toEqualTypeOf<React.RefCallback<HTMLElement>>()
  expectTypeOf(cellRef).toBeFunction()
  expectTypeOf(cellRef('a')).toEqualTypeOf<React.RefCallback<HTMLElement>>()
})

test('Cell<M> is a discriminated union keyed by `type`', () => {
  function check(c: Cell<Photo>) {
    if (c.type === 'height') {
      expectTypeOf(c.height).toEqualTypeOf<number>()
      // @ts-expect-error — `aspectRatio` does not exist on HeightCell
      c.aspectRatio
    } else if (c.type === 'aspect') {
      expectTypeOf(c.aspectRatio).toEqualTypeOf<number>()
      // @ts-expect-error — `height` does not exist on AspectCell
      c.height
    } else {
      expectTypeOf(c.type).toEqualTypeOf<'measured'>()
      expectTypeOf(c.estimatedHeight).toEqualTypeOf<number | undefined>()
      // @ts-expect-error — `height` does not exist on MeasuredCell
      c.height
    }
  }
  check(heightCell('a', 100, { meta: { src: '/a', alt: 'A' } }))
})
