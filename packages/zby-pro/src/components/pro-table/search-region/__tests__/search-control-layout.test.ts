import { describe, expect, it } from 'vitest'

import {
  getAutoWidthKind,
  getSelectMeasurePlan,
  resolveAutoWidthMaxTagCount,
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
  paddingXXS: 4,
}

const COMPACT_TOKEN: SearchSizeToken = {
  ...TOKEN,
  controlHeight: 28,
  fontSize: 12,
  fontSizeIcon: 10,
  marginXS: 4,
  paddingSM: 8,
  paddingXS: 4,
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
  it('sizes every auto-width control and caps it at the container', () => {
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
    expect(selectStyle?.maxWidth).toBe('100%')
    expect(selectStyle?.minWidth).toBe(0)
    expect(inputStyle?.width).toBeTypeOf('number')
    expect(inputStyle?.maxWidth).toBe('100%')
    expect(inputStyle?.minWidth).toBe(0)
    expect(pickerStyle?.width).toBeTypeOf('number')
    expect(pickerStyle?.maxWidth).toBe('100%')
    expect(pickerStyle?.minWidth).toBe(0)
  })

  it('keeps a long value as a preferred width instead of a pixel minimum', () => {
    const style = resolveInlineSearchControlStyle(
      'input',
      { allowClear: true },
      '1'.repeat(400),
      TOKEN,
      'Input',
    )

    expect(style?.width).toBeTypeOf('number')
    expect(style?.width as number).toBeGreaterThan(400)
    expect(style?.maxWidth).toBe('100%')
    expect(style?.minWidth).toBe(0)
  })

  it('keeps an explicit maxWidth while still measuring the preferred width', () => {
    const style = resolveInlineSearchControlStyle(
      'select',
      { options: LABEL_OPTIONS, style: { maxWidth: 240 } },
      ['east'],
      TOKEN,
      'Select',
    )

    expect(style?.maxWidth).toBe(240)
    expect(style?.width).toBeTypeOf('number')
    expect(style?.minWidth).toBe(0)
  })

  it('keeps input width aligned with affix chrome instead of select padding', () => {
    const withClear = resolveInlineSearchControlStyle(
      'input',
      { allowClear: true, placeholder: '客户名称' },
      '1111111111111111',
      TOKEN,
      'Input',
    )
    const withoutClear = resolveInlineSearchControlStyle(
      'input',
      { placeholder: '客户名称' },
      '1111111111111111',
      TOKEN,
      'Input',
    )

    expect(withClear?.width as number).toBeGreaterThan(withoutClear?.width as number)
    expect((withClear?.width as number) - (withoutClear?.width as number)).toBe(
      TOKEN.fontSizeIcon + TOKEN.marginXXS,
    )
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

  it('keeps multiple-tag width aligned with density', () => {
    const props = {
      maxTagCount: 'responsive' as const,
      mode: 'multiple',
      options: LABEL_OPTIONS,
    }
    const value = ['east', 'urgent', 'bonded', 'fragile']
    const compactStyle = resolveInlineSearchControlStyle('select', props, value, COMPACT_TOKEN, 'Select')
    const defaultStyle = resolveInlineSearchControlStyle('select', props, value, TOKEN, 'Select')

    expect(compactStyle?.width as number).toBeLessThan(defaultStyle?.width as number)
    expect(compactStyle?.width as number).toBeLessThan(260)
    expect(defaultStyle?.width as number).toBeLessThan(320)
  })

  it('sizes numeric rest using the + n ... placeholder', () => {
    const oneTag = resolveInlineSearchControlStyle(
      'select',
      { mode: 'multiple', options: LABEL_OPTIONS },
      ['east'],
      TOKEN,
      'Select',
    )
    const onePlusRest = resolveInlineSearchControlStyle(
      'select',
      { maxTagCount: 1, mode: 'multiple', options: LABEL_OPTIONS },
      ['east', 'urgent'],
      TOKEN,
      'Select',
    )
    const compactRest = resolveInlineSearchControlStyle(
      'select',
      { maxTagCount: 1, mode: 'multiple', options: LABEL_OPTIONS },
      ['east', 'urgent'],
      COMPACT_TOKEN,
      'Select',
    )

    expect(onePlusRest?.width as number).toBeGreaterThan(oneTag?.width as number)
    expect(compactRest?.width as number).toBeLessThan(onePlusRest?.width as number)
  })

  it('sizes empty select placeholders so the text is not ellipsized', () => {
    const single = resolveInlineSearchControlStyle(
      'select',
      { options: LABEL_OPTIONS, placeholder: '状态' },
      undefined,
      TOKEN,
      'Select',
    )
    const multiple = resolveInlineSearchControlStyle(
      'select',
      { maxTagCount: 'responsive', mode: 'multiple', options: LABEL_OPTIONS, placeholder: '标签' },
      undefined,
      TOKEN,
      'Select',
    )
    const compactSingle = resolveInlineSearchControlStyle(
      'select',
      { options: LABEL_OPTIONS, placeholder: '状态' },
      undefined,
      COMPACT_TOKEN,
      'Select',
    )

    expect(single?.width as number).toBeGreaterThan(62)
    expect(multiple?.width as number).toBeGreaterThan(62)
    expect(compactSingle?.width as number).toBeLessThan(single?.width as number)
    expect(compactSingle?.width as number).toBeGreaterThan(50)
  })

  it('fits both range placeholders plus separator, suffix and border', () => {
    const text = 8 * TOKEN.fontSize
    const padding = (TOKEN.paddingSM - TOKEN.lineWidth) * 2
    const separator = TOKEN.fontSize + 2 + TOKEN.paddingXS * 2
    const suffix = TOKEN.fontSize + Math.floor(TOKEN.paddingXS / 2)
    const borders = TOKEN.lineWidth * 2
    const style = resolveInlineSearchControlStyle(
      'picker',
      { placeholder: ['开始日期', '结束日期'] },
      undefined,
      TOKEN,
      'RangePicker',
    )

    expect(style?.width).toBe(Math.ceil(text + padding + separator + suffix + borders))
    expect(style?.width as number).toBeGreaterThan(154)
  })

  it('reserves antd start and end padding in auto-width extra', () => {
    const inlinePad = TOKEN.paddingSM - TOKEN.lineWidth
    const arrow = Math.max(Math.ceil(TOKEN.fontSize * 1.25), TOKEN.fontSizeIcon)
    const extra = inlinePad * 2 + arrow + TOKEN.lineWidth * 2
    const single = resolveInlineSearchControlStyle(
      'select',
      { options: LABEL_OPTIONS, placeholder: '状态' },
      undefined,
      TOKEN,
      'Select',
    )
    const input = resolveInlineSearchControlStyle(
      'input',
      { placeholder: '客户名称' },
      undefined,
      TOKEN,
      'Input',
    )

    expect(single?.width).toBe(Math.ceil(2 * TOKEN.fontSize + extra + 1))
    expect(input?.width).toBe(Math.ceil(4 * TOKEN.fontSize + inlinePad * 2))
  })
})

describe('resolveAutoWidthMaxTagCount', () => {
  it('turns responsive into the selected count so overflow does not reserve a rest tag', () => {
    expect(
      resolveAutoWidthMaxTagCount(
        { maxTagCount: 'responsive', mode: 'multiple', options: LABEL_OPTIONS },
        ['east', 'urgent', 'bonded', 'fragile'],
      ),
    ).toBe(4)
  })

  it('keeps numeric maxTagCount and explicit widths', () => {
    expect(
      resolveAutoWidthMaxTagCount({ maxTagCount: 1, mode: 'multiple', options: LABEL_OPTIONS }, [
        'east',
        'urgent',
      ]),
    ).toBe(1)
    expect(
      resolveAutoWidthMaxTagCount(
        {
          maxTagCount: 'responsive',
          mode: 'multiple',
          options: LABEL_OPTIONS,
          style: { width: 280 },
        },
        ['east', 'urgent'],
      ),
    ).toBe('responsive')
  })
})
