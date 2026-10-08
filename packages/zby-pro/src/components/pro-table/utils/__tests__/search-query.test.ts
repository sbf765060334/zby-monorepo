import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'

import {
  hasSearchValue,
  isSearchValueEqual,
  mergeSearchQuery,
  mergeViewQueryWithOverlay,
  pickSearchQuery,
  toStoredQueryValue,
} from '../search'

const filters = [{ key: 'status' as const }, { key: 'owner' as const }, { key: 'urgent' as const }]

describe('isSearchValueEqual', () => {
  it('treats plain objects with the same keys as equal', () => {
    expect(
      isSearchValueEqual({ start: 'a', end: 'b' }, { start: 'a', end: 'b' }),
    ).toBe(true)
    expect(isSearchValueEqual({ start: 'a' }, { start: 'a', end: 'b' })).toBe(false)
  })

  it('treats dayjs and Date values with the same instant as equal', () => {
    const stamp = '2026-08-01T00:00:00.000Z'
    expect(isSearchValueEqual(dayjs(stamp), dayjs(stamp))).toBe(true)
    expect(isSearchValueEqual(new Date(stamp), new Date(stamp))).toBe(true)
    expect(isSearchValueEqual(dayjs(stamp), new Date(stamp))).toBe(true)
  })

  it('treats a date-like value as equal to the same date string', () => {
    expect(isSearchValueEqual(dayjs('2026-08-01'), '2026-08-01')).toBe(true)
    expect(isSearchValueEqual(dayjs('2026-08-01T00:00:00.000Z'), '2026-08-01T00:00:00.000Z')).toBe(
      true,
    )
  })

  it('still compares arrays and primitive strings by value', () => {
    expect(isSearchValueEqual(['x', 'y'], ['x', 'y'])).toBe(true)
    expect(isSearchValueEqual('pending', 'pending')).toBe(true)
    expect(isSearchValueEqual('pending', 'done')).toBe(false)
  })
})

describe('pickSearchQuery', () => {
  it('keeps only valued fields that differ from defaultQuery', () => {
    expect(
      pickSearchQuery(
        { status: 'pending', owner: 'Ada', urgent: false },
        filters,
        { status: 'all', owner: 'Ada' },
      ),
    ).toEqual({ status: 'pending', urgent: false })
  })

  it('omits only undefined fields, and keeps empty strings and arrays', () => {
    expect(
      pickSearchQuery({ status: '', owner: 'Ada', labels: [] as never, missing: undefined }, [
        { key: 'status' as const },
        { key: 'owner' as const },
        { key: 'labels' as const },
        { key: 'missing' as const },
      ]),
    ).toEqual({ status: '', owner: 'Ada', labels: [] })
  })
})

describe('toStoredQueryValue', () => {
  it('turns empty strings, empty arrays, and null into undefined when coerce is on', () => {
    expect(toStoredQueryValue('', true)).toBeUndefined()
    expect(toStoredQueryValue([], true)).toBeUndefined()
    expect(toStoredQueryValue([''], true)).toBeUndefined()
    expect(toStoredQueryValue(null, true)).toBeUndefined()
    expect(toStoredQueryValue(0, true)).toBe(0)
    expect(toStoredQueryValue(false, true)).toBe(false)
    expect(toStoredQueryValue(['east'], true)).toEqual(['east'])
  })

  it('keeps empty values when coerce is off', () => {
    expect(toStoredQueryValue('', false)).toBe('')
    expect(toStoredQueryValue([], false)).toEqual([])
    expect(toStoredQueryValue(null, false)).toBeNull()
  })

  it('does not change the layout emptiness check', () => {
    expect(hasSearchValue('')).toBe(false)
    expect(hasSearchValue([])).toBe(false)
    expect(hasSearchValue(['east'])).toBe(true)
    expect(hasSearchValue(false)).toBe(true)
  })
})

describe('mergeSearchQuery', () => {
  it('keeps defaultQuery for missing and undefined snapshot fields', () => {
    expect(
      mergeSearchQuery(
        { status: 'all', owner: 'Ada', warehouse: '上海仓' },
        { status: 'pending', owner: undefined },
      ),
    ).toEqual({
      status: 'pending',
      owner: 'Ada',
      warehouse: '上海仓',
    })
  })

  it('applies empty strings and arrays from the snapshot', () => {
    expect(
      mergeSearchQuery(
        { status: 'all', labels: ['east'] },
        { status: '', labels: [] },
      ),
    ).toEqual({
      status: '',
      labels: [],
    })
  })

  it('keeps false and 0 as written snapshot values', () => {
    expect(mergeSearchQuery({ urgent: true, count: 3 }, { urgent: false, count: 0 })).toEqual({
      urgent: false,
      count: 0,
    })
  })
})

describe('mergeViewQueryWithOverlay', () => {
  it('lets overlay fields win over the view snapshot and fills the rest from the view', () => {
    expect(
      mergeViewQueryWithOverlay(
        { status: 'all', owner: 'Ada', warehouse: '上海仓' },
        { status: 'pending', warehouse: '深圳仓' },
        { status: 'open' },
      ),
    ).toEqual({
      status: 'open',
      owner: 'Ada',
      warehouse: '深圳仓',
    })
  })

  it('pins defaultQuery keys that are present on the overlay even when they match defaults', () => {
    expect(
      mergeViewQueryWithOverlay(
        { status: 'all', owner: 'Ada' },
        { status: 'pending' },
        { status: 'all', owner: 'Bob' },
      ),
    ).toEqual({
      status: 'all',
      owner: 'Bob',
    })
  })

  it('applies the view snapshot when overlay is empty', () => {
    expect(
      mergeViewQueryWithOverlay({ status: 'all', owner: 'Ada' }, { status: 'pending' }, {}),
    ).toEqual({
      status: 'pending',
      owner: 'Ada',
    })
  })

  it('lets overlay empty values overwrite view fields', () => {
    expect(
      mergeViewQueryWithOverlay(
        { status: 'all', owner: 'Ada' },
        { status: 'pending', owner: 'Ada' },
        { owner: '' },
      ),
    ).toEqual({
      status: 'pending',
      owner: '',
    })
  })
})
