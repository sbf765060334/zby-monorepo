import { describe, expect, it } from 'vitest'

import { mergeSearchQuery, pickSearchQuery } from '../search'

const filters = [{ key: 'status' as const }, { key: 'owner' as const }, { key: 'urgent' as const }]

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
