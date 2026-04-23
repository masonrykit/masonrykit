/**
 * Tests for the cell factory helpers. They must:
 *   - Produce the expected discriminator + fields.
 *   - Omit optional fields when not supplied (so users can spread them into
 *     shape-sensitive APIs without `undefined` pollution).
 *   - Thread the generic `M` so `meta` is required when supplied with a type.
 */
import { describe, it, expect } from 'vitest'
import { aspectCell, heightCell, measuredCell } from '../src/index'

describe('@masonrykit/core - heightCell', () => {
  it('builds a HeightCell with id/height/type', () => {
    const c = heightCell('a', 100)
    expect(c).toEqual({ id: 'a', type: 'height', height: 100 })
  })

  it('omits optional fields when not supplied', () => {
    const c = heightCell('a', 100)
    expect('columnSpan' in c).toBe(false)
    expect('meta' in c).toBe(false)
  })

  it('attaches columnSpan when supplied', () => {
    expect(heightCell('a', 100, { columnSpan: 2 })).toEqual({
      id: 'a',
      type: 'height',
      height: 100,
      columnSpan: 2,
    })
  })

  it('attaches typed meta', () => {
    interface Photo {
      src: string
    }
    const c = heightCell<Photo>('a', 100, { meta: { src: '/a.jpg' } })
    // `meta` is required when the generic is supplied — type-check would fail
    // without the non-optional conditional.
    expect(c.meta.src).toBe('/a.jpg')
  })
})

describe('@masonrykit/core - aspectCell', () => {
  it('builds an AspectCell with id/aspectRatio/type', () => {
    const c = aspectCell('a', 16 / 9)
    expect(c).toEqual({ id: 'a', type: 'aspect', aspectRatio: 16 / 9 })
  })

  it('attaches columnSpan and meta when supplied', () => {
    interface Meta {
      alt: string
    }
    const c = aspectCell<Meta>('a', 1, { columnSpan: 2, meta: { alt: 'A' } })
    expect(c).toEqual({
      id: 'a',
      type: 'aspect',
      aspectRatio: 1,
      columnSpan: 2,
      meta: { alt: 'A' },
    })
  })
})

describe('@masonrykit/core - measuredCell', () => {
  it('builds a MeasuredCell with just type + id by default', () => {
    const c = measuredCell('a')
    expect(c).toEqual({ id: 'a', type: 'measured' })
  })

  it('attaches estimatedHeight, columnSpan, meta when supplied', () => {
    interface Meta {
      title: string
    }
    const c = measuredCell<Meta>('a', {
      estimatedHeight: 200,
      columnSpan: 2,
      meta: { title: 'A' },
    })
    expect(c).toEqual({
      id: 'a',
      type: 'measured',
      estimatedHeight: 200,
      columnSpan: 2,
      meta: { title: 'A' },
    })
  })

  it('omits estimatedHeight when not supplied', () => {
    expect('estimatedHeight' in measuredCell('a')).toBe(false)
  })
})
