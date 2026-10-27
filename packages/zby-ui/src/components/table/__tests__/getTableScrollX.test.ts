import { afterEach, describe, expect, it, vi } from 'vitest'

import { EXPAND_COLUMN } from '../RcTableInner/constant'
import { getTableScrollX } from '../getTableScrollX'
import { SELECTION_COLUMN } from '../hooks/useSelection'

describe('getTableScrollX', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sums leaf widths and fills missing widths with defaultWidth', () => {
    expect(
      getTableScrollX(
        [
          { dataIndex: 'name', width: 120 },
          { dataIndex: 'note' },
          { dataIndex: 'px', width: ' 80px ' },
          { dataIndex: 'zero', width: 0 },
          { dataIndex: 'zeroPx', width: '0px' },
        ],
        160,
      ),
    ).toBe(120 + 160 + 80 + 0 + 0)
  })

  it('uses defaultWidth for widths that cannot be resolved to pixels', () => {
    expect(
      getTableScrollX(
        [
          { width: '20%' },
          { width: '10rem' },
          { width: 'auto' },
          { width: '160' },
          { width: -1 },
          { width: Number.NaN },
          { width: Number.POSITIVE_INFINITY },
        ],
        50,
      ),
    ).toBe(50 * 7)
  })

  it('sums group children and ignores the group width', () => {
    expect(
      getTableScrollX(
        [
          {
            title: 'Group',
            width: 999,
            children: [{ width: 40 }, { title: 'Missing' }],
          },
          { title: 'Empty group', width: 30, children: [] },
        ],
        10,
      ),
    ).toBe(40 + 10 + 30)
  })

  it('skips hidden columns, zero colspan, and selection or expand placeholders', () => {
    expect(
      getTableScrollX(
        [
          SELECTION_COLUMN,
          EXPAND_COLUMN,
          { dataIndex: 'hidden', width: 200, hidden: true },
          {
            title: 'Hidden group',
            hidden: true,
            children: [{ width: 80 }],
          },
          { dataIndex: 'span', width: 70, colSpan: 0 },
          { dataIndex: 'kept', width: 90 },
          {
            title: 'Visible group',
            children: [{ width: 15, hidden: true }, { width: 25 }],
          },
        ],
        160,
      ),
    ).toBe(90 + 25)
  })

  it('rounds the total and returns 0 for empty columns', () => {
    expect(getTableScrollX([{ width: 10.4 }, { width: '10.4px' }], 0)).toBe(21)
    expect(getTableScrollX(undefined, 160)).toBe(0)
    expect(getTableScrollX([], 160)).toBe(0)
  })

  it('keeps explicit widths when defaultWidth is invalid', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(getTableScrollX([{ width: 40 }, { title: 'Missing' }], Number.NaN)).toBe(40)
    expect(error).toHaveBeenCalledWith(
      'Warning: `getTableScrollX` defaultWidth must be a finite number greater than or equal to 0.',
    )
  })
})
