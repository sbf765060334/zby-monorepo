import { describe, expect, it } from 'vitest'

import { isViewSnapshotEqual, normalizeViewSnapshot } from '../view-snapshot'

describe('view snapshot filter preferences', () => {
  const filters = [
    { key: 'status', label: '状态', render: () => null },
    { key: 'owner', label: '负责人', hidden: true, render: () => null },
  ] as any

  it('fills default filter preferences for old snapshots', () => {
    expect(
      normalizeViewSnapshot(
        {
          query: { status: 'open' },
          columnPreferences: [],
          sorter: null,
        } as any,
        filters,
        [],
      ).filterPreferences,
    ).toEqual([
      { key: 'status', placement: 'row', order: 0 },
      { key: 'owner', placement: 'more', order: 1 },
    ])
  })

  it('treats different filter placements as dirty', () => {
    const left = normalizeViewSnapshot(
      {
        query: {},
        columnPreferences: [],
        filterPreferences: [
          { key: 'status', placement: 'row', order: 0 },
          { key: 'owner', placement: 'more', order: 1 },
        ],
      },
      filters,
      [],
    )
    const right = normalizeViewSnapshot(
      {
        query: {},
        columnPreferences: [],
        filterPreferences: [
          { key: 'status', placement: 'row', order: 0 },
          { key: 'owner', placement: 'row', order: 1 },
        ],
      },
      filters,
      [],
    )

    expect(isViewSnapshotEqual(left, right)).toBe(false)
  })

  it('does not treat omitted query keys as a difference from undefined', () => {
    const left = normalizeViewSnapshot(
      {
        query: { status: 'open' },
        columnPreferences: [],
      } as any,
      filters,
      [],
    )
    const right = normalizeViewSnapshot(
      {
        query: { status: 'open', owner: undefined },
        columnPreferences: [],
      } as any,
      filters,
      [],
    )

    expect(left.query).toEqual({ status: 'open' })
    expect(isViewSnapshotEqual(left, right)).toBe(true)
  })

  it('normalizes a legacy single sorter object into a list', () => {
    expect(
      normalizeViewSnapshot(
        {
          query: {},
          columnPreferences: [],
          sorter: { field: 'amount', order: 'ascend' },
        } as any,
        filters,
        [{ key: 'amount', label: '金额' }] as any,
      ).sorter,
    ).toEqual([{ field: 'amount', order: 'ascend' }])
  })

  it('drops snapshot values that match defaultQuery', () => {
    expect(
      normalizeViewSnapshot(
        {
          query: { status: 'all', owner: 'Ada' },
          columnPreferences: [],
        } as any,
        filters,
        [],
        undefined,
        { status: 'all' },
      ).query,
    ).toEqual({ owner: 'Ada' })
  })
})
