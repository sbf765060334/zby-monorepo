import { describe, expect, it } from 'vitest'

import {
  getAutoWidthKind,
  getSelectMeasurePlan,
  resolveInlineSearchControlStyle,
} from '../search-control-layout'
import type { SearchSizeToken } from '../search-control-layout'

const REGION_OPTIONS = [
  {
    label: '华东',
    value: 'east',
    children: [
      { label: '上海', value: 'sh' },
      { label: '杭州', value: 'hz' },
      { label: '苏州', value: 'sz' },
    ],
  },
  {
    label: '华北',
    value: 'north',
    children: [{ label: '北京', value: 'bj' }],
  },
]

const LABEL_OPTIONS = [
  { label: '华东', value: 'east' },
  { label: '加急', value: 'urgent' },
  { label: '保税', value: 'bonded' },
  { label: '易碎', value: 'fragile' },
  { label: '冷链', value: 'cold' },
]

const WAREHOUSE_TREE = [
  {
    title: '华东',
    value: 'east-wh',
    children: [
      { title: '上海仓', value: 'sh-wh' },
      { title: '杭州仓', value: 'hz-wh' },
    ],
  },
]

const TOKEN: SearchSizeToken = {
  controlHeight: 32,
  fontFamily: 'sans-serif',
  fontSize: 14,
  fontSizeIcon: 12,
  lineWidth: 1,
  marginXXS: 4,
  marginXS: 8,
  paddingSM: 12,
  paddingXS: 8,
}

describe('getAutoWidthKind', () => {
  it('whitelists input, picker and select families', () => {
    expect(getAutoWidthKind('Input')).toBe('input')
    expect(getAutoWidthKind('Input.Password')).toBe('input')
    expect(getAutoWidthKind('Search')).toBe('input')
    expect(getAutoWidthKind('DatePicker')).toBe('picker')
    expect(getAutoWidthKind('RangePicker')).toBe('picker')
    expect(getAutoWidthKind('TimePicker')).toBe('picker')
    expect(getAutoWidthKind('Select')).toBe('select')
    expect(getAutoWidthKind('Cascader')).toBe('select')
    expect(getAutoWidthKind('TreeSelect')).toBe('select')
  })

  it('skips controls outside the whitelist', () => {
    expect(getAutoWidthKind('Switch')).toBeNull()
    expect(getAutoWidthKind('Radio')).toBeNull()
    expect(getAutoWidthKind('Radio.Group')).toBeNull()
    expect(getAutoWidthKind('input')).toBeNull()
  })
})

describe('getSelectMeasurePlan', () => {
  it('joins cascader single value as a full path', () => {
    expect(
      getSelectMeasurePlan({ options: REGION_OPTIONS }, ['east', 'sh'], 'Cascader'),
    ).toEqual({
      labels: ['华东 / 上海'],
      mode: 'single',
      restCount: 0,
    })
  })

  it('uses a parent label when cascader single stops at the parent', () => {
    expect(getSelectMeasurePlan({ options: REGION_OPTIONS }, ['east'], 'Cascader')).toEqual({
      labels: ['华东'],
      mode: 'single',
      restCount: 0,
    })
  })

  it('falls back to the missing path segment', () => {
    expect(
      getSelectMeasurePlan({ options: REGION_OPTIONS }, ['east', 'xx'], 'Cascader'),
    ).toEqual({
      labels: ['华东 / xx'],
      mode: 'single',
      restCount: 0,
    })
  })

  it('uses the last path segment for cascader multiple tags', () => {
    expect(
      getSelectMeasurePlan(
        { multiple: true, options: REGION_OPTIONS },
        [
          ['east', 'sh'],
          ['east', 'hz'],
        ],
        'Cascader',
      ),
    ).toEqual({
      labels: ['上海', '杭州'],
      mode: 'tags',
      restCount: 0,
    })
  })

  it('measures a collapsed parent path as the parent label', () => {
    expect(
      getSelectMeasurePlan({ multiple: true, options: REGION_OPTIONS }, [['east']], 'Cascader'),
    ).toEqual({
      labels: ['华东'],
      mode: 'tags',
      restCount: 0,
    })
  })

  it('keeps all cascader tags when maxTagCount is omitted or responsive', () => {
    const value = [
      ['east', 'sh'],
      ['east', 'hz'],
      ['north', 'bj'],
    ]
    const expected = {
      labels: ['上海', '杭州', '北京'],
      mode: 'tags' as const,
      restCount: 0,
    }

    expect(
      getSelectMeasurePlan({ multiple: true, options: REGION_OPTIONS }, value, 'Cascader'),
    ).toEqual(expected)
    expect(
      getSelectMeasurePlan(
        { maxTagCount: 'responsive', multiple: true, options: REGION_OPTIONS },
        value,
        'Cascader',
      ),
    ).toEqual(expected)
  })

  it('adds a +n rest tag when maxTagCount is a number', () => {
    expect(
      getSelectMeasurePlan(
        { maxTagCount: 1, multiple: true, options: REGION_OPTIONS },
        [
          ['east', 'sh'],
          ['east', 'hz'],
        ],
        'Cascader',
      ),
    ).toEqual({
      labels: ['上海'],
      mode: 'tags',
      restCount: 1,
    })
    expect(
      getSelectMeasurePlan(
        { maxTagCount: 1, mode: 'multiple', options: LABEL_OPTIONS },
        ['east', 'urgent', 'bonded'],
        'Select',
      ),
    ).toEqual({
      labels: ['华东'],
      mode: 'tags',
      restCount: 2,
    })
  })

  it('resolves tree select labels from treeData title', () => {
    expect(
      getSelectMeasurePlan({ treeData: WAREHOUSE_TREE }, 'sh-wh', 'TreeSelect'),
    ).toEqual({
      labels: ['上海仓'],
      mode: 'single',
      restCount: 0,
    })
  })
})

describe('resolveInlineSearchControlStyle', () => {
  it('writes width only for select-kind controls', () => {
    const selectStyle = resolveInlineSearchControlStyle(
      'select',
      { mode: 'multiple', options: LABEL_OPTIONS, placeholder: '标签' },
      ['east', 'urgent'],
      TOKEN,
      'Select',
    )
    const inputStyle = resolveInlineSearchControlStyle(
      'input',
      { placeholder: '客户名称' },
      '星河贸易',
      TOKEN,
      'Input',
    )
    const pickerStyle = resolveInlineSearchControlStyle(
      'picker',
      { placeholder: ['开始日期', '结束日期'] },
      ['2026-08-01', '2026-08-31'],
      TOKEN,
      'RangePicker',
    )

    expect(selectStyle?.width).toBeTypeOf('number')
    expect(selectStyle?.minWidth).toBe(selectStyle?.width)
    expect(inputStyle?.minWidth).toBeTypeOf('number')
    expect(inputStyle?.width).toBeUndefined()
    expect(pickerStyle?.minWidth).toBeTypeOf('number')
    expect(pickerStyle?.width).toBeUndefined()
  })

  it('keeps an explicit width', () => {
    const style = resolveInlineSearchControlStyle(
      'select',
      { options: LABEL_OPTIONS, style: { width: 280 } },
      ['east'],
      TOKEN,
      'Select',
    )

    expect(style).toEqual({ width: 280 })
  })
})
