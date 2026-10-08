// @vitest-environment jsdom

import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider } from 'antd'

import { zbyProIntlResources } from '../../../../locale/intl-resources'
import type { ProTableColumnPreference } from '../../interface'
import { ColumnSettings } from '../ColumnSettings'

vi.mock('../../pro-modal', () => ({
  ProModal: ({
    open,
    footer,
    children,
  }: {
    open: boolean
    footer?: React.ReactNode
    children?: React.ReactNode
  }) => (open ? (
    <div>
      {children}
      {footer}
    </div>
  ) : null),
}))

vi.mock('../ColumnSettingsPanel', () => ({
  ColumnSettingsPanel: ({
    value,
    onChange,
  }: {
    value: ProTableColumnPreference[]
    onChange: (next: ProTableColumnPreference[]) => void
  }) => (
    <div>
      <span data-testid="draft-visible">
        {value.filter((item) => item.visible).map((item) => item.key).join(',')}
      </span>
      <button
        type="button"
        data-testid="hide-name"
        onClick={() =>
          onChange(value.map((item) => (item.key === 'name' ? { ...item, visible: false } : item)))
        }
      />
    </div>
  ),
}))

afterEach(() => {
  cleanup()
})

const definitions = [
  {
    key: 'name',
    label: '名称',
    defaultPreference: { visible: true, order: 0, pin: null as const, width: 120 },
  },
]

function renderSettings(
  prefs: ProTableColumnPreference[],
  onApply = vi.fn(),
  open = true,
) {
  return render(
    <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
      <ConfigProvider>
        <ColumnSettings
          open={open}
          definitions={definitions}
          currentPreferences={prefs}
          onApply={onApply}
          onCancel={() => undefined}
        />
      </ConfigProvider>
    </ZbyIntlProvider>,
  )
}

describe('ColumnSettings', () => {
  it('keeps draft visibility when applied preferences only change width', () => {
    const onApply = vi.fn()
    const { rerender } = renderSettings(
      [{ key: 'name', visible: true, order: 0, pin: null, width: 120 }],
      onApply,
    )

    fireEvent.click(screen.getByTestId('hide-name'))
    expect(screen.getByTestId('draft-visible').textContent).toBe('')

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ColumnSettings
            open
            definitions={definitions}
            currentPreferences={[{ key: 'name', visible: true, order: 0, pin: null, width: 180 }]}
            onApply={onApply}
            onCancel={() => undefined}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    expect(screen.getByTestId('draft-visible').textContent).toBe('')
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(onApply).toHaveBeenCalledWith([
      { key: 'name', visible: false, order: 0, pin: null, width: 180 },
    ])
  })
})
