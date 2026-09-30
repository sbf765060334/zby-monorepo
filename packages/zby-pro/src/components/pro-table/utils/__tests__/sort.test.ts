import { describe, expect, it } from 'vitest'

import { collectLocalSortFields, resolveSorterField, toDisplaySorter, toProTableSorters, toRequestSort, sortCurrentPageRows } from '../sort'

describe('toProTableSorters', () => {
  it('joins array dataIndex with dots instead of String(field)', () => {
    expect(
      toProTableSorters({
        column: { dataIndex: ['address', 'city'] },
        field: ['address', 'city'],
        order: 'ascend',
      }),
    ).toEqual([{ field: 'address.city', order: 'ascend' }])
  })

  it('uses column key when dataIndex is missing', () => {
    expect(
      toProTableSorters({
        column: { key: 'amount' },
        order: 'descend',
      }),
    ).toEqual([{ field: 'amount', order: 'descend' }])
  })

  it('falls back to columnKey when the column is omitted', () => {
    expect(toProTableSorters({ columnKey: 'owner', order: 'ascend' })).toEqual([
      { field: 'owner', order: 'ascend' },
    ])
  })

  it('keeps multiple active sorts and orders them by sorter.multiple', () => {
    expect(
      toProTableSorters([
        {
          column: { dataIndex: 'createdAt', sorter: { multiple: 1 } },
          field: 'createdAt',
          order: 'descend',
        },
        {
          column: { dataIndex: 'amount', sorter: { multiple: 2 } },
          field: 'amount',
          order: 'ascend',
        },
      ]),
    ).toEqual([
      { field: 'amount', order: 'ascend' },
      { field: 'createdAt', order: 'descend' },
    ])
  })

  it('drops entries without a field or a valid order', () => {
    expect(
      toProTableSorters({
        field: undefined,
        order: 'ascend',
      }),
    ).toEqual([])
    expect(toProTableSorters({ field: 'amount', order: null })).toEqual([])
  })
})

describe('resolveSorterField', () => {
  it('prefers extractColumnKey over String(array field)', () => {
    expect(
      resolveSorterField({
        column: { dataIndex: ['address', 'city'] },
        field: ['address', 'city'],
      }),
    ).toBe('address.city')
  })
})

describe('local vs remote sort helpers', () => {
  const columns = [
    { dataIndex: 'amount', sorter: true },
    {
      dataIndex: 'name',
      sorter: (left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name),
    },
  ]

  it('collects only columns that have a compare function', () => {
    expect(collectLocalSortFields(columns)).toEqual(['name'])
    expect(collectLocalSortFields([{ dataIndex: 'amount', sorter: { multiple: 2 } }])).toEqual([])
    expect(
      collectLocalSortFields([
        { dataIndex: 'name', sorter: { multiple: 1, compare: (left: { n: number }, right: { n: number }) => left.n - right.n } },
      ]),
    ).toEqual(['name'])
  })

  it('strips local fields from the request sort list', () => {
    expect(
      toRequestSort(
        [
          { field: 'amount', order: 'ascend' },
          { field: 'name', order: 'descend' },
        ],
        ['name'],
      ),
    ).toEqual([{ field: 'amount', order: 'ascend' }])
    expect(toRequestSort([{ field: 'name', order: 'ascend' }], ['name'])).toEqual([])
  })

  it('turns compare sorters into display-only table sorters', () => {
    expect(toDisplaySorter((left: { n: number }, right: { n: number }) => left.n - right.n)).toBe(true)
    expect(toDisplaySorter({ multiple: 1, compare: () => 0 })).toEqual({ multiple: 1 })
    expect(toDisplaySorter(true)).toBe(true)
    expect(toDisplaySorter({ multiple: 2 })).toEqual({ multiple: 2 })
  })

  it('does not reorder rows when only remote sort is active', () => {
    const rows = [
      { amount: 2, name: 'b' },
      { amount: 1, name: 'a' },
    ]
    expect(sortCurrentPageRows(rows, [{ field: 'amount', order: 'ascend' }], columns)).toBe(rows)
  })

  it('reorders the current page by local compare and uses remote fields as earlier keys', () => {
    const rows = [
      { amount: 2, name: 'c' },
      { amount: 2, name: 'a' },
      { amount: 1, name: 'b' },
    ]
    expect(
      sortCurrentPageRows(
        rows,
        [
          { field: 'amount', order: 'ascend' },
          { field: 'name', order: 'ascend' },
        ],
        columns,
      ),
    ).toEqual([
      { amount: 1, name: 'b' },
      { amount: 2, name: 'a' },
      { amount: 2, name: 'c' },
    ])
  })

  it('does not mutate the original rows', () => {
    const rows = [
      { amount: 1, name: 'b' },
      { amount: 1, name: 'a' },
    ]
    sortCurrentPageRows(rows, [{ field: 'name', order: 'ascend' }], columns)
    expect(rows).toEqual([
      { amount: 1, name: 'b' },
      { amount: 1, name: 'a' },
    ])
  })
})
