// @vitest-environment jsdom

import * as React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider } from 'antd'
import type * as ZbyUi from '@zby/ui'

import { zbyProIntlResources } from '../../../locale/intl-resources'
import { ProTable, createProTableController } from '..'
import type { ProTableRef } from '..'
import type { ProViewManagementAdapter } from '../../pro-view-management'

vi.mock('@zby/ui', async (importOriginal) => {
  const actual = await importOriginal() as typeof ZbyUi
  return {
    ...actual,
    Table: (props: any) => (
      <div>
        <span data-testid="rows">{props.dataSource.length}</span>
        <span data-testid="row-ids">{(props.dataSource ?? []).map((row: { id?: string }) => row.id).join(',')}</span>
        <span data-testid="loading">{String(Boolean(props.loading))}</span>
        <span data-testid="columns">{props.columns?.length ?? 0}</span>
        <span data-testid="height">{props.height === undefined ? 'none' : String(props.height)}</span>
        <span data-testid="selected-keys">{(props.rowSelection?.selectedRowKeys ?? []).join(',')}</span>
        <span data-testid="expanded-keys">{(props.expandable?.expandedRowKeys ?? []).join(',')}</span>
        <button
          data-testid="page"
          onClick={() =>
            props.onChange?.({ current: 2, pageSize: 10 }, {}, {}, { action: 'paginate' })
          }
        />
        <button
          data-testid="sort"
          onClick={() =>
            props.onChange?.({}, {}, { field: 'name', order: 'ascend' }, { action: 'sort' })
          }
        />
        <button
          data-testid="select"
          onClick={() => props.rowSelection?.onChange?.(['1'], [{ id: '1' }], { type: 'single' })}
        />
        <button
          data-testid="expand"
          onClick={() => props.expandable?.onExpandedRowsChange?.(['1'])}
        />
      </div>
    ),
  }
})

type Row = { id: string; name: string }
type Query = {
  status?: string
  owner?: string
}

function renderProTable(ui: React.ReactElement) {
  return render(
    <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
      <ConfigProvider>{ui}</ConfigProvider>
    </ZbyIntlProvider>,
  )
}

function searchInputField(key: keyof Query, label: string, extra?: { hidden?: boolean }) {
  return {
    key,
    label,
    ...extra,
    render: ({ value, setValue }: { value: Query[keyof Query]; setValue: (next: Query[keyof Query] | undefined) => void }) => (
      <input
        aria-label={label}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => setValue(event.target.value === '' ? undefined : event.target.value)}
      />
    ),
  }
}

function createTestAdapter<TSnapshot>(): ProViewManagementAdapter<TSnapshot> {
  return {
    load: vi.fn().mockResolvedValue({ views: [], activeViewId: undefined }),
    update: vi.fn().mockResolvedValue(undefined),
  }
}

function createPendingCustomViewAdapter() {
  const adapter = createTestAdapter<any>()
  adapter.load = vi.fn().mockResolvedValue({
    views: [
      {
        id: 'custom-pending',
        name: '待处理',
        scope: 'custom',
        order: 0,
        snapshot: {
          query: { status: 'pending' },
          columnPreferences: [],
          sorter: null,
        },
      },
    ],
    activeViewId: 'custom-pending',
  })
  return adapter
}

function viewActionRoot() {
  return document.querySelector('.ant-pro-view-management-actions') as HTMLElement | null
}

function viewOptionCount(viewName: string) {
  const option = Array.from(
    document.querySelectorAll('.ant-pro-view-management-selector-option'),
  ).find(
    (node) =>
      node.querySelector('.ant-pro-view-management-selector-option-name')?.textContent === viewName,
  )

  return option?.querySelector('.ant-pro-view-management-selector-option-count')?.textContent ?? null
}

async function saveActiveCustomView() {
  const saveButton = viewActionRoot()?.querySelector('button')
  expect(saveButton).toBeTruthy()
  fireEvent.click(saveButton as HTMLElement)
  fireEvent.click(await screen.findByRole('menuitem', { name: '保存' }))
}

const originalResizeObserver = globalThis.ResizeObserver
const originalMatchMedia = window.matchMedia

class TestResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  window.matchMedia = vi.fn().mockImplementation((media: string) => ({
    matches: false,
    media,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

afterAll(() => {
  vi.stubGlobal('ResizeObserver', originalResizeObserver)
  window.matchMedia = originalMatchMedia
})

describe('ProTable', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => cleanup())

  it('creates an internal controller and performs the automatic request', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))

    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id', queryRequest }}
        columns={[]}
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(queryRequest).toHaveBeenCalledWith(
      { page: 1, pageSize: 10 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(screen.getByTestId('rows').textContent).toBe('1')
  })

  it('uses controllerConfig request and page defaults for the first automatic request', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))

    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{
          rowKey: 'id',
          queryRequest,
          pagination: { defaultPageSize: 20 },
        }}
        columns={[]}
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(queryRequest).toHaveBeenCalledWith(
      { page: 1, pageSize: 20 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('swallows later UI request failures without unhandled rejections', async () => {
    const queryRequest = vi.fn()
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'A' }], total: 1 })
      .mockRejectedValue(new Error('query failed'))
    const rejections: unknown[] = []
    const onUnhandled = (event: PromiseRejectionEvent) => {
      event.preventDefault()
      rejections.push(event.reason)
    }
    window.addEventListener('unhandledrejection', onUnhandled)

    try {
      renderProTable(
        <ProTable<Row, Query>
          controllerConfig={{ rowKey: 'id', queryRequest }}
          columns={[]}
          toolbar
          filters={[searchInputField('status', '状态')]}
        />,
      )

      await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1'))

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }))
      })
      await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
      expect(screen.getByTestId('rows').textContent).toBe('1')

      await act(async () => {
        screen.getByTestId('page').click()
      })
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
      expect(screen.getByTestId('rows').textContent).toBe('1')

      await act(async () => {
        screen.getByTestId('sort').click()
      })
      await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(4))
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

      await act(async () => {
        screen.getByRole('button', { name: '刷新' }).click()
      })
      await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(5))
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
      expect(screen.getByTestId('rows').textContent).toBe('1')
      expect(rejections).toEqual([])
    } finally {
      window.removeEventListener('unhandledrejection', onUnhandled)
    }
  })

  it('uses external controller state and maps table events back to it', async () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: {},
      rowKey: 'id',
    })
    controller.setDataSource([{ id: '1', name: 'A' }])

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        rowSelection={{}}
        expandable={{ expandedRowRender: () => null }}
      />,
    )

    expect(screen.getByTestId('rows').textContent).toBe('1')
    act(() => screen.getByTestId('select').click())
    act(() => screen.getByTestId('expand').click())
    expect(controller.getState().selectedRowKeys).toEqual(['1'])
    expect(controller.getState().expandedRowKeys).toEqual(['1'])

    await act(async () => {
      screen.getByTestId('page').click()
    })
    expect(controller.getState().currentPage).toBe(2)
    await act(async () => {
      screen.getByTestId('sort').click()
    })
    expect(controller.getState().sort).toEqual([{ field: 'name', order: 'ascend' }])
  })

  it('notifies rowSelection.onChange after the controller stores the selection', () => {
    const onChange = vi.fn()
    const onExpandedRowsChange = vi.fn()
    const controller = createProTableController<Row, Query>({
      rowKey: 'id',
    })
    controller.setDataSource([{ id: '1', name: 'A' }])

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        rowSelection={{ onChange }}
        expandable={{
          expandedRowRender: () => null,
          onExpandedRowsChange,
        }}
      />,
    )

    act(() => screen.getByTestId('select').click())
    act(() => screen.getByTestId('expand').click())

    expect(controller.getState().selectedRowKeys).toEqual(['1'])
    expect(onChange).toHaveBeenCalledWith(['1'], [{ id: '1' }], { type: 'single' })
    expect(controller.getState().expandedRowKeys).toEqual(['1'])
    expect(onExpandedRowsChange).toHaveBeenCalledWith(['1'])
  })

  it('drives table keys from the controller and ignores leftover Table ownership props', () => {
    const controller = createProTableController<Row, Query>({
      rowKey: 'id',
      defaultSelectedRowKeys: ['1'],
      defaultExpandedRowKeys: ['1'],
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        rowSelection={{
          selectedRowKeys: ['ignored'],
          defaultSelectedRowKeys: ['ignored-default'],
        } as never}
        expandable={{
          expandedRowRender: () => null,
          expandedRowKeys: ['ignored'],
          defaultExpandedRowKeys: ['ignored-default'],
          defaultExpandAllRows: true,
        } as never}
      />,
    )

    expect(screen.getByTestId('selected-keys').textContent).toBe('1')
    expect(screen.getByTestId('expanded-keys').textContent).toBe('1')
  })

  it('keeps controllerConfig default selected keys after the first automatic request', async () => {
    const ref = React.createRef<ProTableRef<Row, Query, unknown>>()

    renderProTable(
      <ProTable<Row, Query>
        ref={ref}
        columns={[]}
        rowSelection={{}}
        controllerConfig={{
          rowKey: 'id',
          defaultSelectedRowKeys: ['1'],
          queryRequest: async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }),
        }}
      />,
    )

    await waitFor(() => {
      expect(ref.current?.controller.getState().inquired).toBe(true)
    })
    expect(ref.current?.controller.getState().selectedRowKeys).toEqual(['1'])
  })

  it('reorders the current page locally when the column has a compare function', async () => {
    const queryRequest = vi.fn(async () => ({
      data: [
        { id: '1', name: 'B' },
        { id: '2', name: 'A' },
      ],
      total: 2,
    }))
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[
          {
            key: 'name',
            dataIndex: 'name',
            title: '名称',
            sorter: (left, right) => left.name.localeCompare(right.name),
          },
        ]}
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('row-ids').textContent).toBe('1,2')

    await act(async () => {
      screen.getByTestId('sort').click()
    })

    expect(queryRequest).toHaveBeenCalledTimes(1)
    expect(controller.getState().sort).toEqual([{ field: 'name', order: 'ascend' }])
    expect(controller.getState().dataSource.map((row) => row.id)).toEqual(['1', '2'])
    await waitFor(() => expect(screen.getByTestId('row-ids').textContent).toBe('2,1'))
  })

  it('exposes the active controller through the ProTable ref', () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const ref = React.createRef<ProTableRef<Row, Query, unknown>>()

    renderProTable(
      <ProTable<Row, Query>
        ref={ref}
        controller={controller}
        columns={[]}
      />,
    )

    expect(ref.current?.controller).toBe(controller)
  })

  it('renders inline filters and hides the more button when no field is hidden', async () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '负责人')]}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('rows')).toBeTruthy())
    expect(screen.getByRole('textbox', { name: /状态/ })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: /负责人/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '负责人' })).toBeNull()
    expect(document.querySelector('.ant-pro-table-search-field')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '更多筛选' })).toBeNull()
    expect(screen.getByRole('button', { name: /查\s*询/ })).toBeTruthy()
    expect(document.querySelector('.ant-pro-table-search-row')).toBeTruthy()
  })

  it('submits the draft only from the search button and keeps hidden fields in more filters', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))

    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{
          rowKey: 'id',
          defaultQuery: { status: 'all' },
          queryRequest,
        }}
        columns={[]}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('textbox', { name: /负责人/ })).toBeNull()
    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), {
      target: { value: 'open' },
    })
    expect(queryRequest).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }))
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(2))
    expect(queryRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, status: 'open' }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )

    fireEvent.click(screen.getByRole('button', { name: '更多筛选' }))
    const owner = await screen.findByRole('textbox', { name: /负责人/ })
    expect(owner.closest('.ant-pro-table-search-overlay')).toBeTruthy()
    expect(owner.closest('.ant-pro-table-search-field')).toBeTruthy()
    expect(owner.closest('.ant-drawer-inline')).toBeTruthy()
    const overlaySection = owner.closest('.ant-drawer-section') as HTMLElement | null
    expect(overlaySection?.style.height).toBe('auto')
    expect(overlaySection?.style.maxHeight).toBe('90%')
    fireEvent.change(owner, { target: { value: 'Ada' } })
    expect(queryRequest).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }))
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(3))
    expect(queryRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ owner: 'Ada', status: 'open' }),
      expect.anything(),
    )
    await waitFor(() =>
      expect(document.querySelector('.ant-pro-table-search-overlay.ant-drawer-open')).toBeNull(),
    )

    fireEvent.click(screen.getByRole('button', { name: '更多筛选' }))
    expect(document.querySelector('.ant-pro-table-search-overlay.ant-drawer-open')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /重\s*置/ }))
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(4))
    expect(queryRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, status: 'all' }),
      expect.anything(),
    )
    const submittedQuery = (
      queryRequest.mock.calls as unknown as Array<[Record<string, unknown>] | undefined>
    )[3]?.[0]
    expect(submittedQuery).not.toHaveProperty('owner')
    await waitFor(() =>
      expect(document.querySelector('.ant-pro-table-search-overlay.ant-drawer-open')).toBeNull(),
    )
  })

  it('shows filter settings and moves a hidden field onto the search row', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))

    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id', queryRequest }}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('textbox', { name: /负责人/ })).toBeNull()
    expect(screen.getByRole('button', { name: '筛选设置' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '筛选设置' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '负责人' })).toBeTruthy())
    fireEvent.click(screen.getByRole('checkbox', { name: '负责人' }))
    fireEvent.click(screen.getByRole('button', { name: '移到默认展示' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: /负责人/ })).toBeTruthy())
    expect(screen.queryByRole('button', { name: '更多筛选' })).toBeNull()
    expect(queryRequest).toHaveBeenCalledTimes(1)
  })

  it('hides filter settings when filterSetting is false', async () => {
    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id' }}
        columns={[{ key: 'id', title: 'ID' }]}
        filterSetting={false}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(screen.getByRole('textbox', { name: /状态/ })).toBeTruthy())
    expect(screen.queryByRole('button', { name: '筛选设置' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: /负责人/ })).toBeNull()
    expect(screen.getByRole('button', { name: '更多筛选' })).toBeTruthy()
  })

  it('dirties the view when filter placement changes', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        views
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(screen.getByText('默认视图')).toBeTruthy())
    expect(viewActionRoot()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '筛选设置' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '负责人' })).toBeTruthy())
    fireEvent.click(screen.getByRole('checkbox', { name: '负责人' }))
    fireEvent.click(screen.getByRole('button', { name: '移到默认展示' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    await waitFor(() => expect(viewActionRoot()).toBeTruthy())
    expect(screen.getByRole('button', { name: /保存/ })).toBeTruthy()
  })

  it('moves a row field into more filters from filter settings', async () => {
    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id' }}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(screen.getByRole('textbox', { name: /状态/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '筛选设置' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '状态' })).toBeTruthy())
    fireEvent.click(screen.getByRole('checkbox', { name: '状态' }))
    fireEvent.click(screen.getByRole('button', { name: '移到更多筛选' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    await waitFor(() => expect(screen.queryByRole('textbox', { name: /状态/ })).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: '更多筛选' }))
    const status = await screen.findByRole('textbox', { name: /状态/ })
    expect(status.closest('.ant-pro-table-search-overlay')).toBeTruthy()
  })

  it('applies stored filter preferences from a view snapshot', async () => {
    const adapter = createTestAdapter<any>()
    adapter.load = vi.fn().mockResolvedValue({
      views: [
        {
          id: 'custom-layout',
          name: '自定义布局',
          scope: 'custom',
          order: 0,
          snapshot: {
            query: {},
            columnPreferences: [],
            filterPreferences: [
              { key: 'owner', placement: 'row', order: 0 },
              { key: 'status', placement: 'more', order: 1 },
            ],
            sorter: null,
          },
        },
      ],
      activeViewId: 'custom-layout',
    })

    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id' }}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(screen.getByText('自定义布局')).toBeTruthy())
    await waitFor(() => expect(screen.getByRole('textbox', { name: /负责人/ })).toBeTruthy())
    expect(screen.queryByRole('textbox', { name: /状态/ })).toBeNull()
    expect(screen.getByRole('button', { name: '更多筛选' })).toBeTruthy()
  })

  it('persists filter preferences when saving a custom view', async () => {
    const adapter = createPendingCustomViewAdapter()
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('pending'))
    fireEvent.click(screen.getByRole('button', { name: '筛选设置' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '负责人' })).toBeTruthy())
    fireEvent.click(screen.getByRole('checkbox', { name: '负责人' }))
    fireEvent.click(screen.getByRole('button', { name: '移到默认展示' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    await waitFor(() => expect(viewActionRoot()).toBeTruthy())

    await saveActiveCustomView()
    await waitFor(() => expect(adapter.update).toHaveBeenCalled())

    const dummyState = {
      views: [
        {
          id: 'custom-pending',
          name: '待处理',
          scope: 'custom' as const,
          order: 0,
          snapshot: { query: { status: 'pending' }, columnPreferences: [] },
        },
      ],
      activeViewId: 'custom-pending',
    }
    const persisted = (adapter.update as ReturnType<typeof vi.fn>).mock.calls.some(([, recipe]) => {
      const next = (
        recipe as (current: typeof dummyState) => {
          views: Array<{
            id: string
            snapshot: { filterPreferences?: Array<{ key: string; placement: string }> }
          }>
        }
      )(dummyState)
      return (
        next.views
          .find((view) => view.id === 'custom-pending')
          ?.snapshot
          .filterPreferences
          ?.find((item) => item.key === 'owner')
          ?.placement === 'row'
      )
    })
    expect(persisted).toBe(true)
  })

  it('shows draft search tags immediately and clears a field without requesting', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: {},
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(document.querySelector('.ant-pro-table-search-tags')).toBeNull()

    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), {
      target: { value: 'open' },
    })
    expect(document.querySelector('.ant-pro-table-search-tags')?.textContent).toContain('状态：open')
    expect(queryRequest).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '更多筛选' }))
    fireEvent.change(await screen.findByRole('textbox', { name: /负责人/ }), {
      target: { value: 'Ada' },
    })
    expect(document.querySelector('.ant-pro-table-search-tags')?.textContent).toContain('负责人：Ada')
    expect(queryRequest).toHaveBeenCalledTimes(1)

    fireEvent.click(
      document.querySelector('.ant-pro-table-search-tags .ant-tag-close-icon') as HTMLElement,
    )
    expect(controller.getState().query.status).toBeUndefined()
    expect(document.querySelector('.ant-pro-table-search-tags')?.textContent).not.toContain('状态：open')
    expect(document.querySelector('.ant-pro-table-search-tags')?.textContent).toContain('负责人：Ada')
    expect(queryRequest).toHaveBeenCalledTimes(1)
  })

  it('uses the current locale for search tag punctuation', async () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: {},
      rowKey: 'id',
    })
    controller.setQuery({ status: 'open' })

    render(
      <ZbyIntlProvider locale="en-US" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            columns={[]}
            filters={[searchInputField('status', '状态')]}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    await waitFor(() =>
      expect(document.querySelector('.ant-pro-table-search-tags')?.textContent).toContain(
        '状态: open',
      ),
    )
  })

  it('orders search tags by the current filter placement', async () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: {},
      rowKey: 'id',
    })
    controller.setQuery({ status: 'open', owner: 'Ada' })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(document.querySelector('.ant-pro-table-search-tags')).toBeTruthy())
    expect(document.querySelector('.ant-pro-table-search-tags')?.textContent).toMatch(
      /状态：open.*负责人：Ada/,
    )

    fireEvent.click(screen.getByRole('button', { name: '筛选设置' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '状态' })).toBeTruthy())
    fireEvent.click(screen.getByRole('checkbox', { name: '状态' }))
    fireEvent.click(screen.getByRole('button', { name: '移到更多筛选' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    await waitFor(() =>
      expect(document.querySelector('.ant-pro-table-search-tags')?.textContent).toMatch(
        /负责人：Ada.*状态：open/,
      ),
    )
  })

  it('resets a tag to defaultQuery without requesting and hides the icon at the default', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        filters={[searchInputField('status', '状态')]}
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(document.querySelector('.ant-pro-table-search-tags')?.textContent).toContain('状态：all')
    expect(document.querySelector('.ant-pro-table-search-tags .ant-tag-close-icon')).toBeNull()

    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), {
      target: { value: 'open' },
    })
    expect(document.querySelector('.ant-pro-table-search-tags')?.textContent).toContain('状态：open')
    expect(document.querySelector('.ant-pro-table-search-tags .ant-tag-close-icon')).toBeTruthy()

    fireEvent.click(
      document.querySelector('.ant-pro-table-search-tags .ant-tag-close-icon') as HTMLElement,
    )
    expect(controller.getState().query.status).toBe('all')
    expect(document.querySelector('.ant-pro-table-search-tags')?.textContent).toContain('状态：all')
    expect(document.querySelector('.ant-pro-table-search-tags .ant-tag-close-icon')).toBeNull()
    expect(queryRequest).toHaveBeenCalledTimes(1)
  })

  it('omits the search row when views and search are both off', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('rows')).toBeTruthy())
    expect(document.querySelector('.ant-pro-table-search-row')).toBeNull()
  })

  it('inherits ConfigProvider prefixCls for the table shell', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })

    render(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider prefixCls="zby">
          <ProTable<Row, Query> controller={controller} columns={[]} />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('rows')).toBeTruthy())
    expect(document.querySelector('.zby-pro-table')).toBeTruthy()
    expect(document.querySelector('.ant-pro-table')).toBeNull()
  })

  it('hides columns through field default preferences when column setting is enabled', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称', fieldConfig: { defaultPreference: { visible: false } } },
        ]}
        toolbar
      />,
    )

    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('1'))
    expect(screen.getByLabelText('列设置')).toBeTruthy()

    act(() => {
      screen.getByLabelText('列设置').click()
    })
    await waitFor(() => expect(screen.getByText('字段信息')).toBeTruthy())
    expect(screen.getByText('恢复默认')).toBeTruthy()
    expect(screen.queryByPlaceholderText('请输入查询')).toBeNull()
    expect(screen.queryByLabelText('移除')).toBeNull()
    expect(screen.queryByText('↑')).toBeNull()

    act(() => {
      screen.getByRole('checkbox', { name: '名称' }).click()
    })
    expect(screen.getByTestId('columns').textContent).toBe('1')

    act(() => {
      screen.getByRole('button', { name: '确定' }).click()
    })
    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('2'))
  })

  it('enables views when true and shows toolbar icons when toolbar is true', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        toolbar
        views
      />,
    )

    await waitFor(() => expect(screen.getByText('默认视图')).toBeTruthy())
    expect(screen.getByLabelText('刷新')).toBeTruthy()
    expect(screen.getByLabelText('列设置')).toBeTruthy()
    expect(screen.getByLabelText('全屏')).toBeTruthy()
  })

  it('applies view column preferences without showing the column setting button', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称', fieldConfig: { defaultPreference: { visible: false } } },
        ]}
        views
      />,
    )

    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('1'))
    expect(screen.getByText('默认视图')).toBeTruthy()
    expect(screen.queryByLabelText('列设置')).toBeNull()
  })

  it('keeps column preferences in memory only when views are off', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const { unmount } = renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称', fieldConfig: { defaultPreference: { visible: false } } },
        ]}
        toolbar
      />,
    )

    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('1'))
    act(() => {
      screen.getByLabelText('列设置').click()
    })
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '名称' })).toBeTruthy())
    act(() => {
      screen.getByRole('checkbox', { name: '名称' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: '确定' }).click()
    })
    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('2'))
    unmount()

    renderProTable(
      <ProTable<Row, Query>
        controller={createProTableController<Row, Query>({ rowKey: 'id' })}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称', fieldConfig: { defaultPreference: { visible: false } } },
        ]}
        toolbar
      />,
    )
    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('1'))
  })

  it('does not apply column preferences when columnSetting is false', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称', fieldConfig: { defaultPreference: { visible: false } } },
        ]}
        toolbar={{ columnSetting: false }}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('2'))
    expect(screen.queryByLabelText('列设置')).toBeNull()
    expect(screen.getByLabelText('刷新')).toBeTruthy()
  })

  it('hides refresh, column settings and fullscreen through toolbar flags', () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })

    const { rerender } = renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        toolbar={{ refresh: false }}
      />,
    )
    expect(screen.queryByLabelText('刷新')).toBeNull()
    expect(screen.getByLabelText('列设置')).toBeTruthy()

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            columns={[{ key: 'id', title: 'ID' }]}
            toolbar={{ columnSetting: false }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )
    expect(screen.getByLabelText('刷新')).toBeTruthy()
    expect(screen.queryByLabelText('列设置')).toBeNull()

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            columns={[{ key: 'id', title: 'ID' }]}
            toolbar={{ fullscreen: false }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )
    expect(screen.getByLabelText('刷新')).toBeTruthy()
    expect(screen.queryByLabelText('全屏')).toBeNull()

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            columns={[{ key: 'id', title: 'ID' }]}
            toolbar
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )
    expect(screen.getByLabelText('全屏')).toBeTruthy()
  })

  it('portals the same table root into body, locks scroll, and exits on Escape', () => {
    const { container } = renderProTable(
      <ProTable<Row, Query> columns={[{ key: 'id', title: 'ID' }]} toolbar />,
    )

    fireEvent.click(screen.getByLabelText('全屏'))

    const fullscreenRoot = document.querySelector('.ant-pro-table.ant-pro-table-fullscreen') as HTMLElement
    expect(fullscreenRoot).toBeTruthy()
    expect(container.contains(fullscreenRoot)).toBe(false)
    expect(document.body.contains(fullscreenRoot)).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(screen.getByLabelText('退出全屏')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(document.querySelector('.ant-pro-table-fullscreen')).toBeNull()
    expect(container.querySelector('.ant-pro-table')).toBeTruthy()
    expect(screen.getByLabelText('全屏')).toBeTruthy()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('clears fullscreen when the toolbar flag turns the feature off', () => {
    const { rerender } = renderProTable(
      <ProTable<Row, Query> columns={[{ key: 'id', title: 'ID' }]} toolbar />,
    )

    fireEvent.click(screen.getByLabelText('全屏'))
    expect(document.querySelector('.ant-pro-table-fullscreen')).toBeTruthy()

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            columns={[{ key: 'id', title: 'ID' }]}
            toolbar={{ fullscreen: false }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    expect(document.querySelector('.ant-pro-table-fullscreen')).toBeNull()
    expect(screen.queryByLabelText('全屏')).toBeNull()
    expect(document.body.style.overflow).not.toBe('hidden')

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query> columns={[{ key: 'id', title: 'ID' }]} toolbar />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    expect(screen.getByLabelText('全屏')).toBeTruthy()
    expect(document.querySelector('.ant-pro-table-fullscreen')).toBeNull()
  })

  it('keeps column settings inside the fullscreen root and does not exit on overlay Escape', async () => {
    renderProTable(
      <ProTable<Row, Query>
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称' },
        ]}
        toolbar
      />,
    )

    fireEvent.click(screen.getByLabelText('全屏'))
    fireEvent.click(screen.getByLabelText('列设置'))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '名称' })).toBeTruthy())

    const fullscreenRoot = document.querySelector('.ant-pro-table-fullscreen') as HTMLElement
    expect(
      fullscreenRoot.querySelector('.ant-modal-root, .ant-modal-wrap, .ant-pro-modal'),
    ).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.getByLabelText('退出全屏')).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('does not exit fullscreen when Escape closes more filters', () => {
    renderProTable(
      <ProTable<Row, Query>
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
        toolbar
      />,
    )

    fireEvent.click(screen.getByLabelText('全屏'))
    fireEvent.click(screen.getByRole('button', { name: '更多筛选' }))
    expect(document.querySelector('.ant-pro-table-search-overlay.ant-drawer-open')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.getByLabelText('退出全屏')).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('renders toolbar actions on the left', () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        toolbar={{
          actions: <button type="button">新建</button>,
        }}
      />,
    )
    expect(screen.getByRole('button', { name: '新建' })).toBeTruthy()
  })

  it('keeps reset on the default view after column settings change', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称' },
        ]}
        toolbar
        views
      />,
    )

    await waitFor(() => expect(screen.getByText('默认视图')).toBeTruthy())
    act(() => {
      screen.getByLabelText('列设置').click()
    })
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '名称' })).toBeTruthy())
    act(() => {
      screen.getByRole('checkbox', { name: '名称' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: '确定' }).click()
    })
    await waitFor(() => expect(screen.getByRole('button', { name: /重\s*置/ })).toBeTruthy())
    expect(screen.getByRole('button', { name: /保存/ })).toBeTruthy()
  })

  it('renders view management and applies a custom view snapshot', async () => {
    const adapter = createTestAdapter<any>()
    adapter.load = vi.fn().mockResolvedValue({
      views: [
        {
          id: 'custom-pending',
          name: '待处理',
          scope: 'custom',
          order: 0,
          snapshot: {
            query: { status: 'pending' },
            columnPreferences: [],
            sorter: null,
          },
        },
      ],
      activeViewId: 'custom-pending',
    })
    const queryRequest = vi.fn(async (params: Query & { page: number }) => ({
      data: [{ id: '1', name: params.status ?? 'all' }],
      total: 1,
    }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }, { key: 'name', title: '名称' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(adapter.load).toHaveBeenCalled())
    await waitFor(() => expect(queryRequest).toHaveBeenCalled())
    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('pending'))
    expect(screen.getByText('待处理')).toBeTruthy()
  })

  it('keeps defaultQuery fields that a saved view did not write', async () => {
    const adapter = createTestAdapter<any>()
    adapter.load = vi.fn().mockResolvedValue({
      views: [
        {
          id: 'custom-pending',
          name: '待处理',
          scope: 'custom',
          order: 0,
          snapshot: {
            query: { status: 'pending' },
            columnPreferences: [],
            sorter: null,
          },
        },
      ],
      activeViewId: 'custom-pending',
    })
    const queryRequest = vi.fn(async () => ({
      data: [{ id: '1', name: 'A' }],
      total: 1,
    }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all', owner: 'Ada' },
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '负责人')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery).toEqual({
      status: 'pending',
      owner: 'Ada',
    }))
    expect(controller.getState().query).toEqual({
      status: 'pending',
      owner: 'Ada',
    })
  })

  it('keeps setQuery when views are disabled', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })
    controller.setQuery({ status: 'open' })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('open'))
    expect(controller.getState().query.status).toBe('open')
  })

  it('overlays setQuery fields onto the restored view snapshot', async () => {
    const adapter = createTestAdapter<any>()
    adapter.load = vi.fn().mockResolvedValue({
      views: [
        {
          id: 'custom-pending',
          name: '待处理',
          scope: 'custom',
          order: 0,
          snapshot: {
            query: { status: 'pending', owner: 'Ada' },
            columnPreferences: [],
            sorter: null,
          },
        },
      ],
      activeViewId: 'custom-pending',
    })
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })
    controller.setQuery({ status: 'open' })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '负责人')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery).toEqual({
      status: 'open',
      owner: 'Ada',
    }))
    expect(controller.getState().query).toEqual({
      status: 'open',
      owner: 'Ada',
    })
    await waitFor(() => expect(viewActionRoot()).toBeTruthy())
  })

  it('pins defaultQuery keys from a full setQuery overlay', async () => {
    const adapter = createTestAdapter<any>()
    adapter.load = vi.fn().mockResolvedValue({
      views: [
        {
          id: 'custom-pending',
          name: '待处理',
          scope: 'custom',
          order: 0,
          snapshot: {
            query: { status: 'pending' },
            columnPreferences: [],
            sorter: null,
          },
        },
      ],
      activeViewId: 'custom-pending',
    })
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all', owner: 'Ada' },
      queryRequest,
      rowKey: 'id',
    })
    controller.setQuery({ ...controller.getState().defaultQuery, owner: 'Bob' })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '负责人')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery).toEqual({
      status: 'all',
      owner: 'Bob',
    }))
  })

  it('refetches after merging a view onto an already submitted controller', async () => {
    const adapter = createTestAdapter<any>()
    adapter.load = vi.fn().mockResolvedValue({
      views: [
        {
          id: 'custom-pending',
          name: '待处理',
          scope: 'custom',
          order: 0,
          snapshot: {
            query: { status: 'pending', owner: 'Ada' },
            columnPreferences: [],
            sorter: null,
          },
        },
      ],
      activeViewId: 'custom-pending',
    })
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })
    controller.setQuery({ status: 'open' })
    await controller.submitQuery()
    const requestCount = queryRequest.mock.calls.length

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '负责人')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(queryRequest.mock.calls.length).toBeGreaterThan(requestCount))
    expect(controller.getState().committedQuery).toEqual({
      status: 'open',
      owner: 'Ada',
    })
  })

  it('applies a later view in full without the entry overlay', async () => {
    const adapter = createTestAdapter<any>()
    adapter.load = vi.fn().mockResolvedValue({
      views: [
        {
          id: 'custom-pending',
          name: '待处理',
          scope: 'custom',
          order: 0,
          snapshot: {
            query: { status: 'pending', owner: 'Ada' },
            columnPreferences: [],
            sorter: null,
          },
        },
      ],
      activeViewId: 'custom-pending',
    })
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })
    controller.setQuery({ status: 'open' })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '负责人')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('open'))
    fireEvent.mouseDown(
      document.querySelector('.ant-pro-view-management-selector [role="combobox"]')!,
    )
    fireEvent.click(
      document.querySelector('.ant-pro-view-management-selector-option-name[title="默认视图"]')!,
    )
    await waitFor(() => expect(controller.getState().committedQuery).toEqual({
      status: 'all',
    }))
  })

  it('restores defaultQuery when a saved view stored an empty field', async () => {
    const adapter = createTestAdapter<any>()
    adapter.load = vi.fn().mockResolvedValue({
      views: [
        {
          id: 'custom-owner',
          name: '负责人',
          scope: 'custom',
          order: 0,
          snapshot: {
            query: { status: '', owner: 'Ada' },
            columnPreferences: [],
            sorter: null,
          },
        },
      ],
      activeViewId: 'custom-owner',
    })
    const queryRequest = vi.fn(async () => ({
      data: [{ id: '1', name: 'A' }],
      total: 1,
    }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '负责人')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().query.status).toBe('all'))
    expect(controller.getState().query.owner).toBe('Ada')
  })

  it('hides the view count when query matches defaultQuery', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 48 }))

    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id', queryRequest }}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views
      />,
    )

    await waitFor(() => expect(screen.getByText('默认视图')).toBeTruthy())
    expect(screen.queryByText('(48)')).toBeNull()
    expect(screen.queryByText('(1)')).toBeNull()
  })

  it('shows the modified search field count on the active view', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 48 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: {},
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '负责人')]}
        views
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('默认视图')).toBeTruthy())
    expect(screen.queryByText('(1)')).toBeNull()

    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), {
      target: { value: 'open' },
    })
    await waitFor(() => expect(screen.getByText('(1)')).toBeTruthy())
    expect(queryRequest).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByRole('textbox', { name: /负责人/ }), {
      target: { value: 'lee' },
    })
    await waitFor(() => expect(screen.getByText('(2)')).toBeTruthy())
    expect(queryRequest).toHaveBeenCalledTimes(1)
  })

  it('keeps each view count on that view snapshot and the active draft', async () => {
    const adapter = createTestAdapter<any>()
    adapter.load = vi.fn().mockResolvedValue({
      views: [
        {
          id: 'custom-pending',
          name: '待处理',
          scope: 'custom',
          order: 0,
          snapshot: {
            query: { status: 'pending' },
            columnPreferences: [],
            sorter: null,
          },
        },
      ],
      activeViewId: undefined,
    })
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 48 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '负责人')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(screen.getByText('默认视图')).toBeTruthy())
    expect(screen.queryByText('(1)')).toBeNull()

    fireEvent.mouseDown(
      document.querySelector('.ant-pro-view-management-selector [role="combobox"]')!,
    )
    await waitFor(() => expect(viewOptionCount('待处理')).toBe('1'))
    expect(viewOptionCount('默认视图')).toBeNull()

    fireEvent.click(
      document.querySelector(
        '.ant-pro-view-management-selector-option-name[title="待处理"]',
      )!,
    )
    await waitFor(() => expect(screen.getByText('(1)')).toBeTruthy())

    fireEvent.change(screen.getByRole('textbox', { name: /负责人/ }), {
      target: { value: 'lee' },
    })
    await waitFor(() => expect(screen.getByText('(2)')).toBeTruthy())

    fireEvent.mouseDown(
      document.querySelector('.ant-pro-view-management-selector [role="combobox"]')!,
    )
    await waitFor(() => {
      expect(viewOptionCount('待处理')).toBe('2')
      expect(viewOptionCount('默认视图')).toBeNull()
    })
  })

  it('dirties the view from draft filters without requesting', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: {},
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(viewActionRoot()).toBeNull()

    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), {
      target: { value: 'open' },
    })
    await waitFor(() => expect(viewActionRoot()).toBeTruthy())
    expect(queryRequest).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }))
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(2))
    expect(viewActionRoot()).toBeTruthy()
  })

  it('dirties the view when closing a search tag without requesting', async () => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('pending'))
    const requestCount = queryRequest.mock.calls.length

    fireEvent.click(
      document.querySelector('.ant-pro-table-search-tags .ant-tag-close-icon') as HTMLElement,
    )
    expect(controller.getState().query.status).toBe('all')
    expect(controller.getState().committedQuery.status).toBe('pending')
    expect(queryRequest).toHaveBeenCalledTimes(requestCount)
    await waitFor(() => expect(viewActionRoot()).toBeTruthy())
  })

  it('submits uncommitted filters and resets the page when saving a custom view', async () => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 20 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }, { key: 'name', title: '名称' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('pending'))
    await controller.setPage(2)
    expect(controller.getState().currentPage).toBe(2)
    const requestCount = queryRequest.mock.calls.length

    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), {
      target: { value: 'done' },
    })
    await waitFor(() => expect(viewActionRoot()).toBeTruthy())
    expect(queryRequest).toHaveBeenCalledTimes(requestCount)

    await saveActiveCustomView()
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(requestCount + 1))
    expect(queryRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'done', page: 1 }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(controller.getState().currentPage).toBe(1)
    expect(controller.getState().committedQuery.status).toBe('done')
  })

  it('does not request when saving a custom view if filters are already committed', async () => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 20 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称' },
        ]}
        filters={[searchInputField('status', '状态')]}
        toolbar
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('pending'))
    await controller.setPage(2)
    const requestCount = queryRequest.mock.calls.length

    act(() => {
      screen.getByLabelText('列设置').click()
    })
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '名称' })).toBeTruthy())
    act(() => {
      screen.getByRole('checkbox', { name: '名称' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: '确定' }).click()
    })
    await waitFor(() => expect(viewActionRoot()).toBeTruthy())
    expect(queryRequest).toHaveBeenCalledTimes(requestCount)

    await saveActiveCustomView()
    await waitFor(() => expect(adapter.update).toHaveBeenCalled())
    expect(queryRequest).toHaveBeenCalledTimes(requestCount)
    expect(controller.getState().currentPage).toBe(2)
  })

  it('closes more filters when resetting a view', async () => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('pending'))
    fireEvent.click(screen.getByRole('button', { name: '更多筛选' }))
    expect(document.querySelector('.ant-pro-table-search-overlay.ant-drawer-open')).toBeTruthy()
    await waitFor(() => expect(viewActionRoot()).toBeTruthy())

    fireEvent.click(viewActionRoot()!.querySelectorAll('button')[1] as HTMLElement)
    await waitFor(() =>
      expect(document.querySelector('.ant-pro-table-search-overlay.ant-drawer-open')).toBeNull(),
    )
  })

  it('maps heightMode fill to Table height 100%', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })

    const { rerender } = renderProTable(
      <ProTable<Row, Query> controller={controller} columns={[]} />,
    )

    expect(screen.getByTestId('height').textContent).toBe('none')

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query> controller={controller} columns={[]} heightMode="fill" />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('height').textContent).toBe('100%'))
  })
})
