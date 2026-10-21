// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { zbyProIntlResources } from '../../../../locale/intl-resources'
import { ProTableActions } from '..'

const originalResizeObserver = globalThis.ResizeObserver

class TestResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
})

afterAll(() => {
  vi.stubGlobal('ResizeObserver', originalResizeObserver)
})

afterEach(() => {
  cleanup()
})

const actions = [
  { key: 'view', label: '查看' },
  { key: 'edit', label: '编辑' },
]

function renderActions(ui: React.ReactElement) {
  return render(
    <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
      <ConfigProvider>{ui}</ConfigProvider>
    </ZbyIntlProvider>,
  )
}

describe('ProTableActions', () => {
  it('renders a horizontal ellipsis more trigger without copy by default', () => {
    renderActions(<ProTableActions actions={actions} />)

    expect(screen.queryByText('更多')).toBeNull()
    const moreButton = screen.getByRole('button', { name: '更多操作' })
    expect(moreButton).toBeTruthy()
    expect(moreButton.getAttribute('title')).toBe('更多操作')
  })

  it('renders moreText as provided without the default aria-label', () => {
    renderActions(<ProTableActions actions={actions} moreText="更多" />)

    expect(screen.getByRole('button', { name: '更多' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '更多操作' })).toBeNull()
  })

  it('accepts a ReactNode moreText', () => {
    renderActions(
      <ProTableActions
        actions={actions}
        moreText={<span>更多操作组合</span>}
      />,
    )

    expect(screen.getByText('更多操作组合')).toBeTruthy()
  })

  it('runs overflow actions without a confirm through onClick', async () => {
    const onView = vi.fn()
    renderActions(
      <ProTableActions
        dropdownProps={{ open: true }}
        actions={[{ key: 'view', label: '查看', onClick: onView }]}
      />,
    )

    fireEvent.click(screen.getByText('查看'))
    expect(onView).toHaveBeenCalledTimes(1)
  })

  it('keeps overflow popconfirm and only confirms through onConfirm', async () => {
    const onConfirm = vi.fn()
    const onClick = vi.fn()
    renderActions(
      <ProTableActions
        dropdownProps={{ open: true }}
        actions={[
          {
            key: 'delete',
            label: '删除',
            danger: true,
            onClick,
            popconfirm: {
              title: '确定删除吗？',
              onConfirm,
            },
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByText('删除'))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onClick).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText('确定删除吗？')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /OK|确\s*定/ }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows an action unless show is explicitly false', () => {
    const show = vi.fn((info: { record?: { status: string }; index?: number; key: React.Key }) => (
      info.record?.status === 'open'
    ))
    renderActions(
      <ProTableActions
        visibleCount={1}
        record={{ status: 'open' }}
        index={2}
        dropdownProps={{ open: true }}
        actions={[
          { key: 'hidden', label: '隐藏项', show: false },
          { key: 'shown', label: '展示项', show: true },
          { key: 'default', label: '默认项' },
          { key: 'dynamic', label: '动态项', show },
        ]}
      />,
    )

    expect(screen.queryByText('隐藏项')).toBeNull()
    expect(screen.getByRole('button', { name: '展示项' })).toBeTruthy()
    expect(screen.getByText('默认项')).toBeTruthy()
    expect(screen.getByText('动态项')).toBeTruthy()
    expect(show).toHaveBeenCalledWith({ record: { status: 'open' }, index: 2, key: 'dynamic' })
  })

  it('removes horizontal padding and margin from exposed buttons', () => {
    renderActions(
      <ProTableActions
        visibleCount={1}
        actions={[
          { key: 'view', label: '查看' },
          { key: 'edit', label: '编辑' },
        ]}
      />,
    )

    for (const name of ['查看', '更多操作']) {
      const button = screen.getByRole('button', { name })
      expect(button.style.paddingInline).toBe('0px')
      expect(button.style.marginInline).toBe('0px')
    }
  })

  it('shows every action horizontally when showAll is true and ignores visibleCount', () => {
    const { container } = renderActions(
      <ProTableActions
        showAll
        visibleCount={1}
        actions={[
          { key: 'view', label: '查看' },
          { key: 'edit', label: '编辑' },
          { key: 'delete', label: '删除', show: false },
        ]}
      />,
    )

    const space = container.querySelector('.ant-pro-table-actions')
    expect(screen.getByRole('button', { name: '查看' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '编辑' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull()
    expect(screen.queryByRole('button', { name: '更多操作' })).toBeNull()
    expect(space?.classList.contains('ant-space-horizontal')).toBe(true)
    expect(space?.classList.contains('ant-space-wrap')).toBe(false)
    expect(space?.getAttribute('style') ?? '').not.toContain('overflow')
  })

  it('stacks every action vertically when showAll direction is vertical', () => {
    const { container } = renderActions(
      <ProTableActions
        showAll={{ direction: 'vertical' }}
        visibleCount={0}
        actions={[
          { key: 'view', label: '查看' },
          { key: 'edit', label: '编辑' },
        ]}
      />,
    )

    const space = container.querySelector('.ant-pro-table-actions')
    expect(screen.getByRole('button', { name: '查看' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '编辑' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '更多操作' })).toBeNull()
    expect(space?.classList.contains('ant-space-vertical')).toBe(true)
  })

  it('hides an action and the more trigger when show returns false', () => {
    renderActions(
      <ProTableActions
        dropdownProps={{ open: true }}
        actions={[{ key: 'view', label: '查看', show: () => false }]}
      />,
    )

    expect(screen.queryByText('查看')).toBeNull()
    expect(screen.queryByRole('button', { name: '更多操作' })).toBeNull()
  })

  it('falls back to onClick when overflow popconfirm has no onConfirm', async () => {
    const onClick = vi.fn()
    renderActions(
      <ProTableActions
        dropdownProps={{ open: true }}
        actions={[
          {
            key: 'delete',
            label: '删除',
            popconfirm: { title: '确定删除吗？' },
            onClick,
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByText('删除'))
    await waitFor(() => expect(screen.getByText('确定删除吗？')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /OK|确\s*定/ }))
    await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1))
  })
})
