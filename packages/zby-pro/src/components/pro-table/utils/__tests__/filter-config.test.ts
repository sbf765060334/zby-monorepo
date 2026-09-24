import { describe, expect, it } from 'vitest'

import {
  buildDefaultFilterPreferences,
  getFilterReorderRejection,
  groupFilterPreferencesByPlacement,
  moveGroupedFilterToTop,
  replacePlacementFilterOrder,
  replaceRowFilterOrder,
  resolveFilterPreferences,
  setFilterPlacement,
  splitFiltersByPreference,
  updateFilterPreference,
} from '../filter-config'

describe('filter preferences', () => {
  const filters = [
    { key: 'status', hidden: false },
    { key: 'owner', hidden: true },
    { key: 'region' },
  ]

  it('seeds row/more placement from hidden and groups row first', () => {
    expect(buildDefaultFilterPreferences(filters)).toEqual([
      { key: 'status', placement: 'row', order: 0 },
      { key: 'region', placement: 'row', order: 1 },
      { key: 'owner', placement: 'more', order: 2 },
    ])
  })

  it('drops unknown keys and inserts new filters in default order', () => {
    expect(
      resolveFilterPreferences(filters, [
        { key: 'gone', placement: 'row', order: 0 },
        { key: 'owner', placement: 'row', order: 1 },
      ]),
    ).toEqual([
      { key: 'status', placement: 'row', order: 0 },
      { key: 'owner', placement: 'row', order: 1 },
      { key: 'region', placement: 'row', order: 2 },
    ])
  })

  it('splits filters by preference order', () => {
    const { row, more } = splitFiltersByPreference(
      [
        { key: 'status', label: '状态', render: () => null },
        { key: 'owner', label: '负责人', hidden: true, render: () => null },
      ] as any,
      [
        { key: 'owner', placement: 'row', order: 0 },
        { key: 'status', placement: 'more', order: 1 },
      ],
    )

    expect(row.map((item) => item.key)).toEqual(['owner'])
    expect(more.map((item) => item.key)).toEqual(['status'])
  })

  it('reorders only row filters and keeps more at the bottom', () => {
    const next = replaceRowFilterOrder(
      [
        { key: 'status', placement: 'row', order: 0 },
        { key: 'region', placement: 'row', order: 1 },
        { key: 'owner', placement: 'more', order: 2 },
      ],
      ['region', 'status'],
    )

    expect(next.map((item) => item.key)).toEqual(['region', 'status', 'owner'])
    expect(next.find((item) => item.key === 'owner')?.placement).toBe('more')
  })

  it('reorders more filters within the more group', () => {
    const next = replacePlacementFilterOrder(
      [
        { key: 'status', placement: 'row', order: 0 },
        { key: 'owner', placement: 'more', order: 1 },
        { key: 'region', placement: 'more', order: 2 },
      ],
      'more',
      ['region', 'owner'],
    )

    expect(next.map((item) => item.key)).toEqual(['status', 'region', 'owner'])
    expect(next.find((item) => item.key === 'status')?.placement).toBe('row')
  })

  it('moves a filter onto the row group without mixing more items', () => {
    const next = updateFilterPreference(
      buildDefaultFilterPreferences(filters),
      'owner',
      { placement: 'row' },
    )
    expect(next.map((item) => item.key)).toEqual(['status', 'region', 'owner'])
    expect(next.find((item) => item.key === 'owner')?.placement).toBe('row')
  })

  it('appends an unchecked filter to the more group', () => {
    const next = setFilterPlacement(
      [
        { key: 'status', placement: 'row', order: 0 },
        { key: 'region', placement: 'row', order: 1 },
        { key: 'owner', placement: 'more', order: 2 },
      ],
      'status',
      'more',
    )

    expect(next.map((item) => ({ key: item.key, placement: item.placement }))).toEqual([
      { key: 'region', placement: 'row' },
      { key: 'owner', placement: 'more' },
      { key: 'status', placement: 'more' },
    ])
  })

  it('pins a more filter to the top of the more group', () => {
    const next = moveGroupedFilterToTop(
      [
        { key: 'status', placement: 'row', order: 0 },
        { key: 'owner', placement: 'more', order: 1 },
        { key: 'region', placement: 'more', order: 2 },
      ],
      'region',
    )

    expect(next.map((item) => item.key)).toEqual(['status', 'region', 'owner'])
    expect(next.find((item) => item.key === 'region')?.placement).toBe('more')
  })

  it('rejects dragging across row and more groups', () => {
    const items = groupFilterPreferencesByPlacement([
      { key: 'status', placement: 'row', order: 0 },
      { key: 'owner', placement: 'more', order: 1 },
    ])

    expect(getFilterReorderRejection('status', 'owner', items)).toBe('crossPlacement')
    expect(getFilterReorderRejection('owner', 'status', items)).toBe('crossPlacement')
    expect(getFilterReorderRejection('status', 'status', items)).toBeNull()
  })
})
