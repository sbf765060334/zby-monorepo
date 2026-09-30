import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'

import { isSearchValueEqual, mergeSearchQuery, mergeViewQueryWithOverlay, pickSearchQuery } from '../search'

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

  it('omits empty fields even without defaultQuery', () => {
    expect(
      pickSearchQuery({ status: '', owner: 'Ada', labels: [] as never }, [
        { key: 'status' as const },
        { key: 'owner' as const },
        { key: 'labels' as const },
      ]),
    ).toEqual({ owner: 'Ada' })
  })
})

describe('mergeSearchQuery', () => {
  it('keeps defaultQuery for missing, undefined, and empty snapshot fields', () => {
    expect(
      mergeSearchQuery(
        { status: 'all', owner: 'Ada', warehouse: '上海仓' },
        { status: 'pending', owner: undefined, warehouse: '' },
      ),
    ).toEqual({
      status: 'pending',
      owner: 'Ada',
      warehouse: '上海仓',
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
