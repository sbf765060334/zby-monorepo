import { describe, expect, it } from 'vitest'

import { mergeColumnSettingsDraft } from '../field-config'

describe('mergeColumnSettingsDraft', () => {
  it('keeps draft visibility and takes the latest applied width', () => {
    expect(
      mergeColumnSettingsDraft(
        [
          { key: 'name', visible: false, order: 0, pin: null, width: 120 },
          { key: 'status', visible: true, order: 1, pin: 'left', width: 88 },
        ],
        [
          { key: 'name', visible: true, order: 0, pin: null, width: 180 },
          { key: 'status', visible: true, order: 1, pin: null, width: 88 },
        ],
      ),
    ).toEqual([
      { key: 'name', visible: false, order: 0, pin: null, width: 180 },
      { key: 'status', visible: true, order: 1, pin: 'left', width: 88 },
    ])
  })

  it('keeps draft width when current preferences have no width for that column', () => {
    expect(
      mergeColumnSettingsDraft(
        [{ key: 'name', visible: true, order: 0, pin: null, width: 120 }],
        [{ key: 'name', visible: true, order: 0, pin: null }],
      ),
    ).toEqual([{ key: 'name', visible: true, order: 0, pin: null, width: 120 }])
  })
})
