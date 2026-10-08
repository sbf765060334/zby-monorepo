// @vitest-environment jsdom

import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider } from 'antd'

import { zbyProIntlResources } from '../../../../locale/intl-resources'
import type { ProTableColumnPreference, ProTableFilterPreference } from '../../interface'
import { TableSettings } from '../TableSettings'

class TestResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = TestResizeObserver

vi.mock('../../../pro-modal', () => ({
  ProModal: ({
    open,
    footer,
    title,
    children,
  }: {
    open: boolean
    footer?: React.ReactNode
    title?: React.ReactNode
    children?: React.ReactNode
  }) => (open ? (
    <div>
      {title}
      {children}
      {footer}
    </div>
  ) : null),
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

const filters = [
  {
    key: 'status' as const,
    label: '状态',
    render: () => <input aria-label="状态" />,
  },
]

function renderTableSettings({
  open = true,
  columnPreferences = [{ key: 'name', visible: true, order: 0, pin: null, width: 120 }],
  filterPreferences = [{ key: 'status', placement: 'row' as const, order: 0 }],
  onApply = vi.fn(),
}: {
  open?: boolean
  columnPreferences?: ProTableColumnPreference[]
  filterPreferences?: ProTableFilterPreference[]
  onApply?: ReturnType<typeof vi.fn>
} = {}) {
  return render(
    <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
      <ConfigProvider>
        <TableSettings
          open={open}
          definitions={definitions}
          currentColumnPreferences={columnPreferences}
          filters={filters}
          currentFilterPreferences={filterPreferences}
          onApply={onApply}
          onCancel={() => undefined}
        />
      </ConfigProvider>
    </ZbyIntlProvider>,
  )
}

describe('TableSettings', () => {
  it('keeps both setting panels mounted across tab switches', () => {
    renderTableSettings()

    expect(document.querySelectorAll('.ant-pro-table-settings-tab-panel')).toHaveLength(2)
    expect(screen.getByRole('checkbox', { name: '名称' })).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: '状态' })).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: '筛选设置' }))

    expect(document.querySelectorAll('.ant-pro-table-settings-tab-panel')).toHaveLength(2)
    expect(screen.getByRole('checkbox', { name: '状态' })).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: '名称' })).toBeNull()
  })

  it('keeps both drafts across tab switches and applies them together', () => {
    const onApply = vi.fn()
    renderTableSettings({ onApply })

    fireEvent.click(screen.getByRole('checkbox', { name: '名称' }))
    fireEvent.click(screen.getByRole('tab', { name: '筛选设置' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '状态' }))
    fireEvent.click(screen.getByRole('button', { name: '移到更多筛选' }))
    fireEvent.click(screen.getByRole('tab', { name: '列设置' }))
    expect((screen.getByRole('checkbox', { name: '名称' }) as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    expect(onApply).toHaveBeenCalledWith(
      [{ key: 'name', visible: false, order: 0, pin: null, width: 120 }],
      [{ key: 'status', placement: 'more', order: 0 }],
    )
  })

  it('asks before reset and can restore only the current tab', () => {
    renderTableSettings()

    fireEvent.click(screen.getByRole('checkbox', { name: '名称' }))
    fireEvent.click(screen.getByRole('tab', { name: '筛选设置' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '状态' }))
    fireEvent.click(screen.getByRole('button', { name: '移到更多筛选' }))
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }))
    expect(
      screen.getByText('此操作会将草稿恢复为系统默认，未保存的调整将丢失。你可以仅恢复当前页签，或同时恢复列设置和筛选设置。'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '列设置' }))
    fireEvent.click(screen.getByRole('button', { name: '仅恢复筛选设置' }))

    fireEvent.click(screen.getByRole('tab', { name: '筛选设置' }))
    expect(screen.getByText('暂无更多筛选')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '列设置' }))
    expect((screen.getByRole('checkbox', { name: '名称' }) as HTMLInputElement).checked).toBe(false)
  })

  it('restores both drafts when confirming reset all', () => {
    renderTableSettings()

    fireEvent.click(screen.getByRole('checkbox', { name: '名称' }))
    fireEvent.click(screen.getByRole('tab', { name: '筛选设置' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '状态' }))
    fireEvent.click(screen.getByRole('button', { name: '移到更多筛选' }))
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }))
    fireEvent.click(screen.getByRole('button', { name: '全部恢复默认' }))

    expect(screen.getByText('暂无更多筛选')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '列设置' }))
    expect((screen.getByRole('checkbox', { name: '名称' }) as HTMLInputElement).checked).toBe(true)
  })
})
