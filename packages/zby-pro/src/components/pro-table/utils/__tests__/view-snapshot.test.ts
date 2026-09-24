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
})
