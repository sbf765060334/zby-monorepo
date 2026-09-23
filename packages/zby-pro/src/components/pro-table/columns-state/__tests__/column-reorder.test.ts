import { describe, expect, it } from 'vitest'

import { getColumnReorderRejection } from '../column-reorder'

const items = [
  { key: 'left-a', pin: 'left' as const },
  { key: 'left-b', pin: 'left' as const },
  { key: 'normal-a', pin: null },
  { key: 'normal-b', pin: null },
  { key: 'right-a', pin: 'right' as const },
  { key: 'right-b', pin: 'right' as const },
]

describe('getColumnReorderRejection', () => {
  it('rejects moving an unfixed column onto a left-fixed column', () => {
    expect(getColumnReorderRejection('normal-a', 'left-a', items)).toBe('unfixedBeforeLeftFixed')
    expect(getColumnReorderRejection('normal-b', 'left-b', items)).toBe('unfixedBeforeLeftFixed')
  })

  it('rejects moving an unfixed column onto a right-fixed column', () => {
    expect(getColumnReorderRejection('normal-a', 'right-a', items)).toBe('unfixedAfterRightFixed')
    expect(getColumnReorderRejection('normal-b', 'right-b', items)).toBe('unfixedAfterRightFixed')
  })

  it('allows reordering within unfixed columns', () => {
    expect(getColumnReorderRejection('normal-a', 'normal-b', items)).toBeNull()
    expect(getColumnReorderRejection('normal-a', 'normal-a', items)).toBeNull()
  })

  it('ignores drags that do not start from an unfixed column', () => {
    expect(getColumnReorderRejection('left-a', 'normal-a', items)).toBeNull()
    expect(getColumnReorderRejection('missing', 'normal-a', items)).toBeNull()
  })
})
