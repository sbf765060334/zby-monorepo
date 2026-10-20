// @vitest-environment jsdom

import * as React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ConfigProvider, theme } from 'antd'

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
    expect(
      formatColumnValue(true, { valueType: 'boolean' }, 0, {
        messages: { booleanTrue: 'Yes', booleanFalse: 'No' },
      }),
    ).toBe('Yes')
  })

  it('formats week cells with the current locale instead of always zh-cn', () => {
    expect(formatColumnValue('2026-07-01', { valueType: 'week' })).toBe('2026-27周')
    expect(formatColumnValue('2026-07-01', { valueType: 'week' }, 0, { locale: 'en-US' })).toBe(
      '2026-27th',
    )
  })

  it('keeps money formatting even when valueEnum is present', () => {
    const node = formatColumnValue(1286, {
      valueType: 'money',
      valueEnum: { 1286: '一千二百八十六' },
      fieldProps: { customSymbol: '$', locale: 'en-US', precision: 2 },
    })

    expect(node).toBe('$1,286.00')
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

  it('keeps textarea as a local DOM wrapper', () => {
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

  it('generates index numbers when the column has no dataIndex', () => {
    expect(
      textOf(formatColumnValue({ id: 'row-1' }, { key: 'serial', valueType: 'index' }, 0)),
    ).toBe('#1')
    expect(formatColumnValue('A-01', { valueType: 'index' }, 0)).toBe('#1')
  })

  it('renders generated index numbers even when the column has dataIndex', () => {
    expect(
      textOf(
        formatColumnValue(3, { valueType: 'index', dataIndex: 'orderIndex' }, 0, {
          getIndexPage: () => ({ currentPage: 2, pageSize: 10, paginated: true }),
        }),
      ),
    ).toBe('#11')
    expect(
      textOf(formatColumnValue(undefined, { valueType: 'index', dataIndex: 'orderIndex' }, 0)),
    ).toBe('#1')
  })

  it('colors percent cells with theme tokens when showColor is on', () => {
    function PercentColorSample({ value }: { value: number }) {
      const { cssVar, token } = theme.useToken()
      const palette = cssVar ?? token
      return (
        <>
          {formatColumnValue(value, { valueType: { type: 'percent', showColor: true } })}
          <span data-testid="error">{palette.colorError}</span>
          <span data-testid="success">{palette.colorSuccess}</span>
          <span data-testid="secondary">{palette.colorTextSecondary}</span>
        </>
      )
    }

    const positive = render(
      <ConfigProvider>
        <PercentColorSample value={12.5} />
      </ConfigProvider>,
    )
    expect(positive.container.querySelector('span:not([data-testid])')?.style.color).toBe(
      positive.getByTestId('error').textContent,
    )
    positive.unmount()

    const negative = render(
      <ConfigProvider>
        <PercentColorSample value={-3} />
      </ConfigProvider>,
    )
    expect(negative.container.querySelector('span:not([data-testid])')?.style.color).toBe(
      negative.getByTestId('success').textContent,
    )
    negative.unmount()

    const zero = render(
      <ConfigProvider>
        <PercentColorSample value={0} />
      </ConfigProvider>,
    )
    expect(zero.container.querySelector('span:not([data-testid])')?.style.color).toBe(
      zero.getByTestId('secondary').textContent,
    )
  })
})
