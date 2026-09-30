// @vitest-environment jsdom

import * as React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { formatColumnValue } from '../column-value'

afterEach(() => {
  cleanup()
})

function textOf(node: React.ReactNode) {
  const { container } = render(<>{node}</>)
  return container.textContent
}

describe('formatColumnValue', () => {
  it('formats money, percent, dates and boolean like sz read mode', () => {
    expect(
      formatColumnValue(128600, {
        valueType: { type: 'money', currency: 'CNY' },
        fieldProps: { locale: 'zh-CN', precision: 2 },
      }),
    ).toMatch(/128,600\.00/)

    expect(
      textOf(
        formatColumnValue(63.8, {
          valueType: 'percent',
          fieldProps: { precision: 2 },
        }),
      ),
    ).toBe('63.80%')

    expect(formatColumnValue('2026-07-01', { valueType: 'date' })).toBe('2026-07-01')
    expect(formatColumnValue('2026-07-01 09:30:00', { valueType: 'dateTime' })).toBe(
      '2026-07-01 09:30:00',
    )
    expect(formatColumnValue('2026-07', { dataRenderType: 'month' })).toBe('2026-07')
    expect(formatColumnValue(true, { valueType: 'boolean' })).toBe('是')
    expect(formatColumnValue(false, { valueType: 'boolean' })).toBe('否')
  })

  it('keeps money formatting even when valueEnum is present', () => {
    const node = formatColumnValue(1286, {
      valueType: 'money',
      valueEnum: { 1286: '一千二百八十六' },
      fieldProps: { customSymbol: '$', locale: 'en-US', precision: 2 },
    })

    expect(node).toBe('$1,286.00')
  })

  it('renders tag color from valueEnum.color', () => {
    const { container } = render(
      <>
        {formatColumnValue('pending', {
          valueType: 'tag',
          valueEnum: { pending: { text: '待处理', color: 'gold' } },
        })}
      </>,
    )

    expect(container.textContent).toBe('待处理')
    expect(container.querySelector('.ant-tag-gold')).not.toBeNull()
  })

  it('still renders a default Tag when valueEnum is a string', () => {
    const { container } = render(
      <>
        {formatColumnValue('pending', {
          valueType: 'tag',
          valueEnum: { pending: '待处理' },
        })}
      </>,
    )

    expect(container.textContent).toBe('待处理')
    expect(container.querySelector('.ant-tag')).not.toBeNull()
    expect(container.querySelector('.ant-tag-default')).not.toBeNull()
  })

  it('renders valueEnum as Badge when status or color is set', () => {
    const statusNode = render(
      <>
        {formatColumnValue('pending', {
          valueEnum: { pending: { text: '待处理', status: 'warning' } },
        })}
      </>,
    )
    expect(statusNode.container.textContent).toBe('待处理')
    expect(statusNode.container.querySelector('.ant-badge-status-warning')).not.toBeNull()
    statusNode.unmount()

    const colorNode = render(
      <>
        {formatColumnValue('pending', {
          valueEnum: { pending: { text: '待处理', color: 'gold' } },
        })}
      </>,
    )
    expect(colorNode.container.textContent).toBe('待处理')
    expect(colorNode.container.querySelector('.ant-badge-color-gold')).not.toBeNull()
  })

  it('keeps code, jsonCode and textarea as local DOM wrappers', () => {
    const code = formatColumnValue('const a = 1', { valueType: 'code' })
    expect(React.isValidElement(code) && code.type === 'code').toBe(true)

    const json = formatColumnValue({ a: 1 }, { valueType: 'jsonCode' })
    expect(React.isValidElement(json) && json.type === 'pre').toBe(true)
    expect(textOf(json)).toContain('"a": 1')

    const textarea = formatColumnValue('line1\nline2', { valueType: 'textarea' })
    expect(React.isValidElement(textarea) && textarea.type === 'span').toBe(true)
  })

  it('uses the row index for index columns when the cell value is empty', () => {
    expect(textOf(formatColumnValue(undefined, { valueType: 'index' }, 3))).toBe('#4')
  })

  it('continues index numbers across pages', () => {
    expect(
      textOf(
        formatColumnValue(undefined, { valueType: 'index' }, 0, {
          getIndexPage: () => ({ currentPage: 2, pageSize: 10, paginated: true }),
        }),
      ),
    ).toBe('#11')
    expect(
      textOf(
        formatColumnValue(undefined, { valueType: 'index' }, 3, {
          getIndexPage: () => ({ currentPage: 2, pageSize: 10, paginated: true }),
        }),
      ),
    ).toBe('#14')
  })

  it('does not add a page offset when pagination is disabled', () => {
    expect(
      textOf(
        formatColumnValue(undefined, { valueType: 'index' }, 0, {
          getIndexPage: () => ({ currentPage: 2, pageSize: 10, paginated: false }),
        }),
      ),
    ).toBe('#1')
  })

  it('ignores index formatting when the cell already has a value', () => {
    expect(
      formatColumnValue(3, { valueType: 'index', dataIndex: 'orderIndex' }, 0, {
        getIndexPage: () => ({ currentPage: 2, pageSize: 10, paginated: true }),
      }),
    ).toBe(3)
    expect(formatColumnValue('A-01', { valueType: 'index' }, 0)).toBe('A-01')
  })
})
