import { describe, it, expect } from 'vitest'
import { aspectCell, heightCell } from '../src/index'

describe('heightCell', () => {
  it('creates a minimal cell', () => {
    expect(heightCell('h1', 250)).toEqual({ id: 'h1', type: 'height', height: 250 })
  })

  it('attaches meta when provided', () => {
    expect(heightCell('h2', 180, { meta: { category: 'tall' } })).toEqual({
      id: 'h2',
      type: 'height',
      height: 180,
      meta: { category: 'tall' },
    })
  })

  it('attaches columnSpan when provided', () => {
    expect(heightCell('h3', 100, { columnSpan: 2 })).toEqual({
      id: 'h3',
      type: 'height',
      height: 100,
      columnSpan: 2,
    })
  })

  it('omits meta when not provided', () => {
    expect(heightCell('h4', 100)).not.toHaveProperty('meta')
  })
})

describe('aspectCell', () => {
  it('creates a minimal cell', () => {
    expect(aspectCell('a1', 1.5)).toEqual({ id: 'a1', type: 'aspect', aspectRatio: 1.5 })
  })

  it('attaches meta and columnSpan', () => {
    expect(aspectCell('a2', 16 / 9, { columnSpan: 2, meta: { kind: 'image' } })).toEqual({
      id: 'a2',
      type: 'aspect',
      aspectRatio: 16 / 9,
      columnSpan: 2,
      meta: { kind: 'image' },
    })
  })
})
