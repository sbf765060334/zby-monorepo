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
  it.each([
    [1, '1.00'],
    [1.2, '1.20'],
    [1.234, '1.234'],
    [1.23456, '1.2346'],
    [0, '0.00'],
    [-1.234, '-1.234'],
    ['1.2', '1.20'],
  ])('supports independent money fraction bounds for %s', (value, expected) => {
    expect(formatColumnValue(value, {
      valueType: { type: 'money', moneySymbol: false },
      fieldProps: { intlProps: { minimumFractionDigits: 2, maximumFractionDigits: 4 } },
    })).toBe(expected)
  })

  it.each([
    { showSymbol: true, expected: '$1,234.567' },
    { showSymbol: false, expected: '1,234.567' },
    { showSymbol: false, customSymbol: 'USD ', expected: 'USD 1,234.567' },
  ])('passes money intlProps through all symbol modes: %j', ({ showSymbol, customSymbol, expected }) => {
    expect(formatColumnValue(1234.567, {
      valueType: { type: 'money', currency: 'USD', locale: 'en-US', showSymbol },
      fieldProps: { customSymbol, intlProps: { minimumFractionDigits: 2, maximumFractionDigits: 4 } },
    })).toBe(expected)
  })

  it.each([
    { intlProps: { minimumFractionDigits: 4 }, expected: '1.2000' },
    { intlProps: { maximumFractionDigits: 0 }, expected: '1' },
    { intlProps: { minimumFractionDigits: 0 }, expected: '1.2' },
    { intlProps: { maximumFractionDigits: 4 }, expected: '1.20' },
    { intlProps: { minimumFractionDigits: undefined, maximumFractionDigits: undefined }, expected: '1.20' },
  ])('adjusts only implicit fraction bounds for %j', ({ intlProps, expected }) => {
    expect(formatColumnValue(1.2, {
      valueType: { type: 'money', moneySymbol: false },
      fieldProps: { intlProps },
    })).toBe(expected)
  })

  it('prioritizes explicit Intl digits over precision and retains the existing precision precedence', () => {
    const valueType = { type: 'money', precision: 4, moneySymbol: false } as const
    expect(formatColumnValue(1.23456, { valueType, fieldProps: { precision: 1 } })).toBe('1.2346')
    expect(formatColumnValue(1.23456, {
      valueType,
      fieldProps: { precision: 1, intlProps: { minimumFractionDigits: 1, maximumFractionDigits: 3 } },
    })).toBe('1.235')
  })

  it('passes grouping options through while keeping currency and symbol controls authoritative', () => {
    expect(formatColumnValue(1234.5, {
      valueType: { type: 'money', currency: 'USD', locale: 'en-US' },
      fieldProps: { intlProps: { useGrouping: false, currency: 'EUR', style: 'percent' } },
    })).toBe('$1234.50')
    expect(formatColumnValue(1234.5, {
      valueType: { type: 'money', currency: 'USD', moneySymbol: false },
      fieldProps: { intlProps: { useGrouping: false, style: 'currency', currency: 'EUR' } },
    })).toBe('1234.50')
  })

  it('reports explicitly conflicting or invalid fraction bounds', () => {
    for (const intlProps of [{ minimumFractionDigits: 4, maximumFractionDigits: 2 }, { minimumFractionDigits: -1 }]) {
      expect(() => formatColumnValue(1, { valueType: 'money', fieldProps: { intlProps } })).toThrow(RangeError)
    }
  })

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
