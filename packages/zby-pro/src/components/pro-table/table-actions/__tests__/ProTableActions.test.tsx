// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider, theme } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { zbyProIntlResources } from '../../../../locale/intl-resources'
import { ProTableActions } from '..'

const originalResizeObserver = globalThis.ResizeObserver

class TestResizeObserver implements ResizeObserver {
  static instances = new Set<TestResizeObserver>()
  constructor(private callback: ResizeObserverCallback) {}
  observe() { TestResizeObserver.instances.add(this) }
  unobserve() {}
  disconnect() { TestResizeObserver.instances.delete(this) }
  static resize() {
    act(() => TestResizeObserver.instances.forEach((observer) => observer.callback([], observer)))
  }
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
})

afterAll(() => {
  vi.stubGlobal('ResizeObserver', originalResizeObserver)
})

beforeEach(() => {
  // jsdom 不执行布局；没有单独模拟尺寸的交互测试使用稳定的可用宽度。
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    const width = Number.parseFloat(this.style.width)
    return Number.isFinite(width) ? width : 320
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const actions = [
  { key: 'view', label: '查看' },
  { key: 'edit', label: '编辑' },
]

function renderActions(ui: React.ReactElement) {
  return render(
    <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
      <ConfigProvider theme={{ token: { motion: false } }}>{ui}</ConfigProvider>
    </ZbyIntlProvider>,
  )
}

describe('ProTableActions', () => {
  it('prioritizes layout over maxVisibleCount and filters hidden actions before counting', () => {
    const { container } = renderActions(
      <ProTableActions
        layout={{ maxRows: 2, maxColumns: 1 }}
        maxVisibleCount={0}
        actions={[{ key: 'hidden', label: '隐藏', show: false }, ...actions, { key: 'third', label: '第三项' }]}
      />,
    )
    expect(screen.getByRole('button', { name: '查看' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '编辑' })).toBeNull()
    expect(screen.getByRole('button', { name: '更多操作' })).toBeTruthy()
    expect(container.querySelector('.ant-pro-table-actions')?.firstElementChild?.getAttribute('style')).toContain('repeat(1, max-content)')
  })

  it.each([undefined, { maxRows: 2, maxColumns: 3 }])('shrinks, collapses and recovers the ordered prefix for %j', (layout) => {
    let available = 400
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => available)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.textContent === '更多入口' ? 36 : 100
    })
    const { container } = renderActions(
      <ProTableActions
        width="100%"
        maxVisibleCount={5}
        layout={layout}
        actions={Array.from({ length: 7 }, (_, key) => ({ key, label: `操作${key}`, style: { fontSize: 20, borderWidth: 0 } }))}
        moreText="更多入口"
        moreButtonProps={{ icon: null, style: { borderWidth: 0 } }}
      />,
    )
    const exposed = () => screen.getAllByRole('button').filter((button) => button.textContent !== '更多入口')
    expect(exposed()).toHaveLength(5)
    available = 120
    TestResizeObserver.resize()
    expect(exposed()).toHaveLength(layout ? 3 : 1)
    expect(exposed()[0].textContent).toBe('操作0')
    available = 80
    TestResizeObserver.resize()
    expect(exposed()).toHaveLength(1)
    available = 30
    TestResizeObserver.resize()
    expect(exposed()).toHaveLength(0)
    const more = screen.getByRole('button', { name: '更多入口' })
    expect((more.parentElement as HTMLElement).style.width).toBe('30px')
    expect(more.style.maxWidth).toBe('100%')
    expect(more.style.overflow).toBe('hidden')
    available = 400
    TestResizeObserver.resize()
    expect(exposed()).toHaveLength(5)
    if (layout) expect((container.querySelector('.ant-pro-table-actions')!.firstElementChild as HTMLElement).style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
  })

  it('bounds an oversized custom more node and retains its title and accessibility label', () => {
    const { container } = renderActions(
      <ProTableActions
        width={10}
        actions={actions}
        moreText={<span style={{ width: 500, display: 'inline-block' }}>很长的自定义入口</span>}
        moreButtonProps={{ icon: null, title: '完整说明', 'aria-label': '展开全部操作', style: { minWidth: 500, maxWidth: 500 } }}
      />,
    )
    const more = screen.getByRole('button', { name: '展开全部操作' })
    expect(more.title).toBe('完整说明')
    expect(more.style.minWidth).toBe('0px')
    expect(more.style.maxWidth).toBe('100%')
    expect((container.querySelector('[data-more-slot]') as HTMLElement).style.maxWidth).toBe('100%')
  })

  it.each([
    { maxRows: 2, maxColumns: 2 },
    { maxRows: 3, maxColumns: 1 },
  ] as const)('keeps actions and popconfirm on the content-sized button inside %j slots', async (layout) => {
    const onClick = vi.fn()
    const onConfirm = vi.fn()
    const longLabel = '这是一段必须在列宽内省略的长操作文案'
    const { container } = renderActions(
      <ProTableActions
        width={320}
        layout={layout}
        actions={[
          { key: 'view', label: '查看', onClick, tooltip: '查看说明' },
          { key: 'long', label: longLabel },
          { key: 'delete', label: '删除', popconfirm: { title: '确定删除吗？', onConfirm } },
        ]}
      />,
    )
    const slots = container.querySelectorAll<HTMLElement>('[data-action-slot]')
    const view = screen.getByRole('button', { name: '查看' })
    expect(view.style.width).toBe('fit-content')
    expect(view.style.maxWidth).toBe('100%')
    fireEvent.click(slots[0])
    expect(onClick).not.toHaveBeenCalled()
    fireEvent.click(view)
    expect(onClick).toHaveBeenCalledTimes(1)
    fireEvent.click(slots[2])
    expect(screen.queryByText('确定删除吗？')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(await screen.findByRole('button', { name: /OK|确\s*定/ }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    const longButton = screen.getByRole('button', { name: longLabel })
    expect(longButton.title).toBe(longLabel)
    expect((longButton.firstElementChild as HTMLElement).style.textOverflow).toBe('ellipsis')
  })

  it('preserves an explicitly expanded button in grid mode', () => {
    renderActions(
      <ProTableActions
        width={320}
        layout={{ maxRows: 1, maxColumns: 2 }}
        actions={[
          { key: 'width', label: '指定宽度', style: { width: 80 } },
          { key: 'block', label: '整列按钮', block: true },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: '指定宽度' }).style.width).toBe('80px')
    expect(screen.getByRole('button', { name: '整列按钮' }).style.width).toBe('100%')
  })

  it.each([undefined, 0])('uses text and an arrow with maxVisibleCount %s', (maxVisibleCount) => {
    const { container } = renderActions(<ProTableActions actions={actions} maxVisibleCount={maxVisibleCount} />)
    expect(container.querySelector('.anticon-ellipsis')).toBeNull()
    expect(container.querySelector('.anticon-down')).toBeTruthy()
    expect(screen.getByText('更多')).toBeTruthy()
  })

  it.each([undefined, { maxRows: 1, maxColumns: 1 }])('uses text and a trailing arrow for %j even after collapsing', (layout) => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 0)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => 20)
    const { container } = renderActions(<ProTableActions actions={actions} layout={layout} maxVisibleCount={1} width={0} />)
    const more = screen.getByRole('button', { name: '更多操作' })
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(more.textContent).toBe('更多')
    expect(more.querySelector('.anticon-down')).toBeTruthy()
    expect(more.classList.contains('ant-btn-icon-end')).toBe(true)
    expect(container.querySelector('.anticon-ellipsis')).toBeNull()
  })

  it('allows replacing the text, icon and icon placement in an exposed layout', () => {
    const { container, rerender } = renderActions(
      <ProTableActions
        actions={actions}
        maxVisibleCount={1}
        moreText={<span>其他操作</span>}
        moreButtonProps={{ icon: <span data-testid="custom-more-icon">+</span>, iconPlacement: 'start' }}
      />,
    )
    expect(screen.getByText('其他操作')).toBeTruthy()
    expect(screen.getByTestId('custom-more-icon')).toBeTruthy()
    expect(container.querySelector('.anticon-down')).toBeNull()
    expect(container.querySelector('.ant-pro-table-actions-more')?.classList.contains('ant-btn-icon-end')).toBe(false)
    rerender(<ProTableActions actions={actions} maxVisibleCount={1} moreText="其他操作" moreButtonProps={{ icon: null }} />)
    expect(screen.getByRole('button', { name: '其他操作' })).toBeTruthy()
    expect(container.querySelector('.ant-btn-icon')).toBeNull()
  })

  it.each([
    ['border-box', 144],
    ['content-box', 120],
  ] as const)('subtracts actual root padding with %s sizing', (boxSizing, width) => {
    // clientWidth 不含边框，但包含 padding；两种盒模型下内容区均为 120px。
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 140)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('ant-btn-icon') ? 16 : 100
    })
    const { container } = renderActions(
      <ProTableActions
        width={width}
        style={{ boxSizing, paddingLeft: 8, paddingRight: 12, border: '2px solid transparent' }}
        maxVisibleCount={2}
        moreText={null}
        moreButtonProps={{ style: { borderWidth: 0 } }}
        actions={['A', 'B', 'C'].map((label) => ({ key: label, label, style: { borderWidth: 0 } }))}
      />,
    )
    const widths = Array.from(container.querySelectorAll<HTMLElement>('[data-action-slot]')).map((slot) => slot.style.width)
    expect(widths).toEqual(['48px', '48px']) // 120 - 16 更多入口 - 8 间距 = 96。
  })

  it('uses the content box for grid collapse and recovers after padding is removed', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 140)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.textContent === '自定义更多' ? 60 : 20
    })
    const items = ['A', 'B', 'C'].map((label) => ({ key: label, label }))
    const { rerender } = renderActions(
      <ProTableActions
        width={140}
        style={{ padding: 10, boxSizing: 'border-box' }}
        layout={{ maxRows: 1, maxColumns: 2 }}
        moreText="自定义更多"
        moreButtonProps={{ icon: null, style: { borderWidth: 0 } }}
        actions={items}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(1) // (120 - 8) / 2 = 56，小于入口宽 60。
    rerender(
      <ProTableActions
        width={140}
        layout={{ maxRows: 1, maxColumns: 2 }}
        moreText="自定义更多"
        moreButtonProps={{ icon: null, style: { borderWidth: 0 } }}
        actions={items}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it.each([
    [0, 'confirm'],
    [0, 'click'],
    [1, 'confirm'],
    [1, 'click'],
  ] as const)('waits for async %s-visible %s confirmation before closing', async (visibleCount, callback) => {
    let resolve!: () => void
    const pending = new Promise<void>((done) => {
      resolve = done
    })
    const onConfirm = vi.fn(() => pending)
    const onClick = vi.fn(() => pending)
    const onOpenChange = vi.fn()
    renderActions(
      <ProTableActions
        maxVisibleCount={visibleCount}
        record={{ id: 'order-1' }}
        index={2}
        dropdownProps={{ trigger: ['click'] }}
        actions={[{
          key: 'delete',
          label: '删除',
          onClick,
          popconfirm: { title: '确定删除吗？', onOpenChange, ...(callback === 'confirm' ? { onConfirm } : {}) },
        }]}
      />,
    )
    if (!visibleCount) fireEvent.click(screen.getByRole('button', { name: '更多操作' }))
    fireEvent.click(await screen.findByText('删除'))
    const confirm = await screen.findByRole('button', { name: /OK|确\s*定/ })
    fireEvent.click(confirm)
    await waitFor(() => expect(confirm.classList.contains('ant-btn-loading')).toBe(true))
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    const handler = callback === 'confirm' ? onConfirm : onClick
    expect(handler).toHaveBeenCalledWith({ record: { id: 'order-1' }, index: 2, key: 'delete' })
    if (callback === 'confirm') expect(onClick).not.toHaveBeenCalled()
    fireEvent.click(confirm)
    expect(handler).toHaveBeenCalledTimes(1)
    await act(async () => resolve())
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false))
    expect(confirm.classList.contains('ant-btn-loading')).toBe(false)
  })

  it('ends loading but keeps an overflow confirmation open after rejection and allows retry', async () => {
    let reject!: (reason: Error) => void
    const pending = new Promise<void>((_resolve, rejectRequest) => {
      reject = rejectRequest
    })
    const originalThen = pending.then.bind(pending)
    // Ant Design 会把业务错误继续抛到 then 返回的链；测试消费该链以验证失败后的 UI。
    vi.spyOn(pending, 'then').mockImplementation((fulfilled, rejected) => {
      const chain = originalThen(fulfilled, rejected)
      void chain.catch(() => {})
      return chain
    })
    const onConfirm = vi.fn().mockImplementationOnce(() => pending).mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    renderActions(
      <ProTableActions
        dropdownProps={{ trigger: ['click'] }}
        actions={[{
          key: 'delete',
          label: '删除',
          popconfirm: { title: '确定删除吗？', onConfirm, onOpenChange },
        }]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '更多操作' }))
    fireEvent.click(await screen.findByText('删除'))
    const confirm = await screen.findByRole('button', { name: /OK|确\s*定/ })
    fireEvent.click(confirm)
    await waitFor(() => expect(confirm.classList.contains('ant-btn-loading')).toBe(true))
    await act(async () => reject(new Error('删除失败')))
    await waitFor(() => expect(confirm.classList.contains('ant-btn-loading')).toBe(false))
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    expect(screen.getByRole('button', { name: /OK|确\s*定/ })).toBe(confirm)
    fireEvent.click(confirm)
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false))
    expect(onConfirm).toHaveBeenCalledTimes(2)
  })

  it('fills a six-slot grid in row order and reserves more only on overflow', () => {
    const gridActions = Array.from({ length: 7 }, (_, i) => ({ key: i, label: `操作${i + 1}` }))
    const { container, rerender } = renderActions(<ProTableActions actions={gridActions} layout={{ maxRows: 3, maxColumns: 2 }} />)
    expect(screen.getAllByRole('button')).toHaveLength(6)
    const slots = container.querySelectorAll<HTMLElement>('[data-action-slot]')
    expect(slots[1].style.gridColumn).toBe('2')
    expect(slots[1].style.gridRow).toBe('1')
    const more = container.querySelector<HTMLElement>('[data-more-slot]')
    expect(more?.style.gridColumn).toBe('2')
    expect(more?.style.gridRow).toBe('3')
    rerender(<ProTableActions actions={gridActions.slice(0, 6)} layout={{ maxRows: 3, maxColumns: 2 }} />)
    expect(screen.getAllByRole('button')).toHaveLength(6)
    expect(container.querySelector('[data-more-slot]')).toBeNull()
  })

  it('redistributes released width, responds to resizing and collapses only at extreme widths', () => {
    let available = 148 // 120 content + 16 more + 3 gaps of 4
    const natural: Record<string, number> = { A: 100, B: 30, C: 30 }
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('ant-pro-table-actions') ? available : 0
    })
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return natural[this.textContent ?? ''] ?? (this.classList.contains('ant-btn-icon') ? 16 : 0)
    })
    const items = ['A', 'B', 'C', 'D'].map((label) => ({ key: label, label, style: { borderWidth: 0 } }))
    const { container } = renderActions(<ProTableActions width="100%" actions={items} maxVisibleCount={3} moreText={null} moreButtonProps={{ style: { borderWidth: 0 } }} />)
    const slots = () => Array.from(container.querySelectorAll<HTMLElement>('[data-action-slot]'))
    expect(slots().map((slot) => slot.style.width)).toEqual(['60px', '30px', '30px'])
    expect(screen.getByRole('button', { name: 'A' }).title).toBe('A')
    available = 300
    TestResizeObserver.resize()
    expect(slots().map((slot) => slot.style.width)).toEqual(['100px', '30px', '30px'])
    available = 20
    TestResizeObserver.resize()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    available = 148
    TestResizeObserver.resize()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('uses equal grid tracks and collapses when a custom more entry cannot fit its track', () => {
    let available = 160
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => available)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.textContent === '自定义更多' ? 60 : 20
    })
    const { container } = renderActions(<ProTableActions width={160} style={{ width: 999 }} actions={[...actions, { key: 'third', label: '第三项' }]} moreText="自定义更多" moreButtonProps={{ icon: null }} layout={{ maxRows: 1, maxColumns: 2 }} />)
    const root = container.querySelector<HTMLElement>('.ant-pro-table-actions')!
    expect(root.style.width).toBe('160px')
    expect((root.firstElementChild as HTMLElement).style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
    available = 100
    TestResizeObserver.resize()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    available = 160
    TestResizeObserver.resize()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it.each(['text', 'element'])('remeasures a custom label after its own %s update without a container resize', async (kind) => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 124)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('ant-btn-icon')) return 16
      return this.textContent === 'A' ? 30 : 100
    })
    function Label() {
      const [long, setLong] = React.useState(false)
      const text = long ? 'AAAAAA' : 'A'
      return <span onClick={() => setLong((value) => !value)}>{kind === 'element' && long ? <strong>{text}</strong> : text}</span>
    }
    const { container } = renderActions(
      <ProTableActions
        width={124}
        maxVisibleCount={2}
        moreText={null}
        moreButtonProps={{ style: { borderWidth: 0 } }}
        actions={[
          { key: 'a', label: <Label />, style: { borderWidth: 0 } },
          { key: 'b', label: 'B', style: { borderWidth: 0 } },
          { key: 'c', label: 'C' },
        ]}
      />,
    )
    const widths = () => Array.from(container.querySelectorAll<HTMLElement>('[data-action-slot]')).map((slot) => slot.style.width)
    expect(widths()).toEqual(['30px', '70px'])
    fireEvent.click(screen.getByText('A'))
    await waitFor(() => expect(widths()).toEqual(['50px', '50px']))
    fireEvent.click(screen.getByText('AAAAAA'))
    await waitFor(() => expect(widths()).toEqual(['30px', '70px']))
  })

  it('does not reserve hidden more width when all actions fit a narrow container', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 15)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('ant-btn-icon') ? 24 : 5
    })
    renderActions(
      <ProTableActions
        width={15}
        maxVisibleCount={2}
        actions={[
          { key: 'a', label: 'A', style: { borderWidth: 0 } },
          { key: 'b', label: 'B', style: { borderWidth: 0 } },
        ]}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: '更多操作' })).toBeNull()
  })

  it('takes layout spacing from theme tokens', () => {
    const { container } = render(
      <ConfigProvider theme={{ token: { marginXXS: 6, marginXS: 12 }, algorithm: theme.darkAlgorithm }}>
        <ProTableActions actions={actions} layout={{ maxRows: 2, maxColumns: 2 }} />
      </ConfigProvider>,
    )
    const grid = container.querySelector('.ant-pro-table-actions')!.firstElementChild as HTMLElement
    expect(grid.style.columnGap).toBe('12px')
    expect(grid.style.rowGap).toBe('6px')
  })

  it.each([
    ['zh-CN', '更多操作', '更多'],
    ['en-US', 'More actions', 'More'],
    ['vi-VN', 'Thao tác khác', 'Thêm'],
    ['my-MM', 'နောက်ထပ်လုပ်ဆောင်ချက်', 'နောက်ထပ်'],
  ])('keeps the localized more label in %s under both themes', (locale, label, text) => {
    for (const algorithm of [theme.defaultAlgorithm, theme.darkAlgorithm]) {
      const { unmount } = render(
        <ZbyIntlProvider locale={locale} resources={zbyProIntlResources}>
          <ConfigProvider theme={{ algorithm }}>
            <ProTableActions actions={actions} />
            <ProTableActions actions={actions} maxVisibleCount={1} />
          </ConfigProvider>
        </ZbyIntlProvider>,
      )
      expect(screen.getAllByRole('button', { name: label })).toHaveLength(2)
      expect(screen.getAllByText(text)).toHaveLength(2)
      unmount()
    }
  })

  it('renders more text and a trailing arrow by default', () => {
    renderActions(<ProTableActions actions={actions} />)

    expect(screen.getByText('更多')).toBeTruthy()
    const moreButton = screen.getByRole('button', { name: '更多操作' })
    expect(moreButton).toBeTruthy()
    expect(moreButton.getAttribute('title')).toBeNull()
  })

  it('renders moreButtonProps.title only when it is passed', () => {
    renderActions(<ProTableActions actions={actions} moreButtonProps={{ title: '自定义提示' }} />)

    expect(screen.getByRole('button', { name: '更多操作' }).getAttribute('title')).toBe('自定义提示')
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
        maxVisibleCount={1}
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
        maxVisibleCount={1}
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

  it('shows every action horizontally up to maxVisibleCount', () => {
    const { container } = renderActions(
      <ProTableActions
        maxVisibleCount={2}
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
    expect(space?.firstElementChild?.getAttribute('style')).toContain('flex-direction: row')
    expect(space?.classList.contains('ant-space-wrap')).toBe(false)
    expect(space?.getAttribute('style') ?? '').not.toContain('overflow')
  })

  it('stacks actions vertically with a single grid column', () => {
    const { container } = renderActions(
      <ProTableActions
        layout={{ maxRows: 2, maxColumns: 1 }}
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
    expect(space?.firstElementChild?.getAttribute('style')).toContain('grid-template-columns: repeat(1, max-content)')
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
