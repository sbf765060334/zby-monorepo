// @vitest-environment jsdom

import * as React from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
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
        <span data-testid="loading">{String(Boolean(props.loading))}</span>
        <span data-testid="columns">{props.columns?.length ?? 0}</span>
        <span data-testid="height">{props.height === undefined ? 'none' : String(props.height)}</span>
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

function createTestAdapter<TSnapshot>(): ProViewManagementAdapter<TSnapshot> {
  return {
    load: vi.fn().mockResolvedValue({ views: [], activeViewId: undefined }),
    update: vi.fn().mockResolvedValue(undefined),
  }
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
        rowKey="id"
        queryRequest={queryRequest}
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
    expect(controller.getState().sortField).toBe('name')
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

  it('does not render search fields while still supporting search snapshot fields for views', async () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        search={{
          fields: [
            { key: 'status', label: '状态' },
            { key: 'owner', label: '负责人' },
          ],
        }}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('rows')).toBeTruthy())
    expect(screen.queryByText('更多筛选')).toBeNull()
    expect(screen.queryByText('查询')).toBeNull()
  })

  it('hides columns through field default preferences when column state is enabled', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称', fieldConfig: { defaultPreference: { visible: false } } },
        ]}
        toolbar={{}}
        columnsState={{}}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('1'))
    expect(screen.getByLabelText('列设置')).toBeTruthy()

    act(() => {
      screen.getByLabelText('列设置').click()
    })
    await waitFor(() => expect(screen.getByText('字段信息')).toBeTruthy())
    expect(screen.getByText('恢复默认')).toBeTruthy()
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
        search={{ fields: [{ key: 'status', label: '状态' }] }}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(adapter.load).toHaveBeenCalled())
    await waitFor(() => expect(queryRequest).toHaveBeenCalled())
    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('pending'))
    expect(screen.getByText('待处理')).toBeTruthy()
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
