// @vitest-environment jsdom

import * as React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider, DatePicker, Input, Select } from 'antd'
import type * as ZbyUi from '@zby/ui'

import { zbyProIntlResources } from '../../../locale/intl-resources'
import { ProTable, createProTableController } from '..'
import type { ProTableReadyInfo, ProTableRef } from '..'
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
        <span data-testid="first-column-width">{props.columns?.[0]?.width}</span>
        <span data-testid="height">{props.height === undefined ? 'none' : String(props.height)}</span>
        <span data-testid="selected-keys">{(props.rowSelection?.selectedRowKeys ?? []).join(',')}</span>
        <span data-testid="expanded-keys">{(props.expandable?.expandedRowKeys ?? []).join(',')}</span>
        <button
          data-testid="resize-column"
          onClick={() => {
            const info = {
              key: 'name',
              width: 240,
              previousWidth: props.columns?.[0]?.width,
              delta: 120,
              widths: { name: 240 },
              column: props.columns?.[0],
              nativeEvent: new Event('pointerup'),
            }
            props.columnResize?.onWidthsChange?.(info.widths, info)
            props.columnResize?.onResizeEnd?.(info)
          }}
        />
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

function openFilterSettings() {
  fireEvent.click(screen.getByLabelText('设置'))
  fireEvent.click(screen.getByRole('tab', { name: '筛选设置' }))
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

function createDeferred<Value>() {
  let resolve!: (value: Value) => void
  let reject!: (error: Error) => void
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function viewActionRoot() {
  return document.querySelector('.ant-pro-view-management-actions') as HTMLElement | null
}

function activeViewSelectorTitle() {
  return document.querySelector('.ant-pro-view-management-selector .ant-select-content')?.getAttribute('title')
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

  it.each([false, true, 'onMount'] as const)(
    'combines saved-view restoration with autoRequest=%s on cached remounts',
    async (autoRequest) => {
      const adapter = createPendingCustomViewAdapter()
      const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
      const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
      const onReady = vi.fn()
      const table = () => (
        <ProTable<Row, Query>
          controller={controller}
          columns={[{ key: 'id', title: 'ID' }]}
          filters={[searchInputField('status', '状态'), searchInputField('owner', '货号')]}
          views={{ adapter, restoreOnMount: true }}
          autoRequest={autoRequest}
          onReady={onReady}
        />
      )
      controller.setQuery({ owner: 'entry-overlay' })
      const first = renderProTable(table())
      await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
      expect(controller.getState().query).toEqual({ status: 'pending' })
      act(() => controller.setQuery({ owner: 'ABC' }))
      await act(async () => controller.submitQuery())
      const requestsBeforeRemount = queryRequest.mock.calls.length
      first.unmount()

      const second = renderProTable(table())
      await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2))
      expect(controller.getState().query).toEqual({ status: 'pending' })
      expect(activeViewSelectorTitle()).toBe('待处理')
      expect(viewActionRoot()).toBeNull()
      expect(adapter.load).toHaveBeenCalledTimes(1)
      expect(adapter.update).not.toHaveBeenCalled()
      expect(queryRequest).toHaveBeenCalledTimes(requestsBeforeRemount + (autoRequest === 'onMount' ? 1 : 0))
      if (autoRequest === 'onMount') {
        expect(queryRequest).toHaveBeenLastCalledWith(
          expect.objectContaining({ status: 'pending', page: 1 }),
          expect.anything(),
        )
      }
      act(() => controller.setQuery({ owner: 'new-draft' }))
      second.rerender(
        <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
          <ConfigProvider>{table()}</ConfigProvider>
        </ZbyIntlProvider>,
      )
      expect(controller.getState().query.owner).toBe('new-draft')
      expect(onReady).toHaveBeenCalledTimes(2)
    },
  )

  it.each([{}, { status: 'all' }])('restores the system view from defaultQuery=%j', async (defaultQuery) => {
    const adapter = createTestAdapter<any>()
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ defaultQuery, queryRequest })
    const table = () => (
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '货号')]}
        views={{ adapter, restoreOnMount: true }}
        autoRequest="onMount"
      />
    )
    const first = renderProTable(table())
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    act(() => controller.setQuery({ status: 'done', owner: 'ABC' }))
    first.unmount()
    renderProTable(table())
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(2))
    expect(controller.getState().query).toEqual(defaultQuery)
    expect(activeViewSelectorTitle()).toBe('默认视图')
    expect(viewActionRoot()).toBeNull()
  })

  it('queries the preserved draft on every mount without restoring views', async () => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ queryRequest })
    const table = () => (
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        filters={[searchInputField('status', '状态'), searchInputField('owner', '货号')]}
        views={{ adapter }}
        autoRequest="onMount"
      />
    )
    const first = renderProTable(table())
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    act(() => controller.setQuery({ owner: 'ABC' }))
    first.unmount()
    renderProTable(table())
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(2))
    expect(queryRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'pending', owner: 'ABC' }),
      expect.anything(),
    )
    expect(viewActionRoot()).toBeTruthy()
  })

  it('exposes the same restoration method through ref and onReady without querying', async () => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [{ id: 'done', name: 'Done' }], total: 1 }))
    const controller = createProTableController<Row, Query>({ queryRequest })
    const ref = React.createRef<ProTableRef<Row, Query, unknown>>()
    const onReady = vi.fn()
    const mounted = renderProTable(
      <ProTable<Row, Query>
        ref={ref}
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
        onReady={onReady}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    expect(onReady).toHaveBeenCalledWith({ controller, restoreActiveView: ref.current?.restoreActiveView })
    act(() => controller.setQuery({ status: 'done' }))
    await act(async () => controller.submitQuery())
    const restore = ref.current!.restoreActiveView
    await act(async () => restore())
    expect(controller.getState()).toMatchObject({
      query: { status: 'pending' },
      committedQuery: { status: 'done' },
      dataSource: [{ id: 'done', name: 'Done' }],
    })
    expect(queryRequest).toHaveBeenCalledTimes(1)
    expect(viewActionRoot()).toBeNull()
    expect(adapter.update).not.toHaveBeenCalled()
    mounted.unmount()
    await expect(restore()).rejects.toThrow('not ready')
  })

  it('supports awaiting restoration then submitting in onReady with autoRequest disabled', async () => {
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ queryRequest })
    const onReady = vi.fn(async ({ restoreActiveView }: ProTableReadyInfo<Row, Query, unknown>) => {
      controller.setQuery({ status: 'done' })
      await restoreActiveView()
      await controller.submitQuery()
    })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter: createPendingCustomViewAdapter() }}
        onReady={onReady}
      />,
    )
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(queryRequest).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }), expect.anything())
  })

  it('restores saved columns, filter placement and sort together and clears the old overlay', async () => {
    const adapter = createPendingCustomViewAdapter()
    const storage = await adapter.load('orders:views')
    storage.views[0].snapshot.columnPreferences = [
      { key: 'id', visible: false, order: 0 },
      { key: 'name', visible: true, order: 1 },
    ]
    storage.views[0].snapshot.filterPreferences = [
      { key: 'status', placement: 'more', order: 0 },
    ]
    storage.views[0].snapshot.sorter = [{ field: 'name', order: 'ascend' }]
    vi.mocked(adapter.load).mockResolvedValue(storage)
    const controller = createProTableController<Row, Query>({})
    const ref = React.createRef<ProTableRef<Row, Query, unknown>>()
    const onReady = vi.fn()
    const table = (viewAdapter: typeof adapter) => (
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            ref={ref}
            controller={controller}
            columns={[{ key: 'id', title: 'ID' }, { key: 'name', title: 'Name' }]}
            filters={[searchInputField('status', '状态')]}
            views={{ adapter: viewAdapter }}
            onReady={onReady}
          />
        </ConfigProvider>
      </ZbyIntlProvider>
    )
    const mounted = render(table(adapter))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    act(() => controller.setViewState({ query: { status: 'done' }, sorter: null }))
    act(() => controller.setQuery({ status: 'done' }))
    await act(async () => ref.current!.restoreActiveView())
    expect(controller.getState().sort).toEqual([{ field: 'name', order: 'ascend' }])
    expect(screen.getByTestId('columns').textContent).toBe('1')
    expect(screen.queryByRole('textbox', { name: /状态/ })).toBeNull()
    expect(viewActionRoot()).toBeNull()

    // 更换作用域会重新消费 overlay；旧的 done 不应再次覆盖保存的 pending。
    const replacement = createPendingCustomViewAdapter()
    mounted.rerender(table(replacement))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2))
    expect(controller.getState().query.status).toBe('pending')
  })

  it('does not replay a skipped onMount query when the policy changes after readiness', async () => {
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ queryRequest })
    await controller.submitQuery()
    const onReady = vi.fn()
    const table = (autoRequest: false | 'onMount') => (
      <ProTable<Row, Query> controller={controller} columns={[]} autoRequest={autoRequest} onReady={onReady} />
    )
    const mounted = render(table(false))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    mounted.rerender(table('onMount'))
    expect(queryRequest).toHaveBeenCalledTimes(1)
    mounted.unmount()
    render(table('onMount'))
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(2))
  })

  it('rejects restoration before view loading completes and when views are disabled', async () => {
    const deferred = createDeferred<any>()
    const adapter = createTestAdapter<any>()
    vi.mocked(adapter.load).mockReturnValue(deferred.promise)
    const ref = React.createRef<ProTableRef<Row, Query, unknown>>()
    const mounted = renderProTable(
      <ProTable<Row, Query> ref={ref} columns={[]} views={{ adapter }} />,
    )
    await expect(ref.current!.restoreActiveView()).rejects.toThrow('not ready')
    await act(async () => deferred.resolve({ views: [] }))
    await act(async () => ref.current!.restoreActiveView())
    mounted.unmount()
    const onReady = vi.fn()
    renderProTable(<ProTable<Row, Query> ref={ref} columns={[]} onReady={onReady} />)
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    await expect(ref.current!.restoreActiveView()).rejects.toThrow('not enabled')
  })

  it.each(['resolve', 'reject'] as const)('ignores a cancelled request that later %ss after restoring a view', async (outcome) => {
    const deferred = createDeferred<{ data: Row[]; total: number }>()
    const queryRequest = vi.fn(() => deferred.promise)
    const controller = createProTableController<Row, Query>({ queryRequest })
    const ref = React.createRef<ProTableRef<Row, Query, unknown>>()
    const onReady = vi.fn()
    renderProTable(
      <ProTable<Row, Query>
        ref={ref}
        controller={controller}
        columns={[]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter: createPendingCustomViewAdapter() }}
        onReady={onReady}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    let request!: Promise<void>
    act(() => {
      controller.setQuery({ status: 'done' })
      request = controller.submitQuery()
    })
    await act(async () => ref.current!.restoreActiveView())
    expect(controller.getState().loading).toBe(false)
    await act(async () => {
      if (outcome === 'resolve') deferred.resolve({ data: [{ id: 'old', name: 'Old' }], total: 1 })
      else deferred.reject(new Error('late failure'))
      await request
    })
    expect(controller.getState().query.status).toBe('pending')
    expect(controller.getState().dataSource).toEqual([])
    expect(controller.getState().loading).toBe(false)
  })

  it.each([false, true])('queries once per mount in StrictMode with views=%s and waits for queryRequest', async (views) => {
    const controller = createProTableController<Row, Query>({})
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const onReady = vi.fn()
    const table = () => (
      <React.StrictMode>
        <ProTable<Row, Query>
          controller={controller}
          columns={[]}
          filters={[searchInputField('status', '状态')]}
          views={views ? { adapter, restoreOnMount: true } : false}
          autoRequest="onMount"
          onReady={onReady}
        />
      </React.StrictMode>
    )
    const first = renderProTable(table())
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    act(() => controller.configure({ queryRequest }))
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    first.unmount()
    renderProTable(table())
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(2))
    expect(onReady).toHaveBeenCalledTimes(2)
  })

  it('does not duplicate a synchronous onReady request in onMount mode', async () => {
    const controller = createProTableController<Row, Query>({
      queryRequest: vi.fn(async () => ({ data: [], total: 0 })),
    })
    const query = vi.spyOn(controller, 'submitQuery')
    const onReady = vi.fn(() => {
      void controller.submitQuery()
    })
    renderProTable(
      <ProTable<Row, Query> controller={controller} columns={[]} autoRequest="onMount" onReady={onReady} />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('restores the currently selected system view after switching away from the initial custom view', async () => {
    const adapter = createPendingCustomViewAdapter()
    const controller = createProTableController<Row, Query>({ defaultQuery: { status: 'all' } })
    const ref = React.createRef<ProTableRef<Row, Query, unknown>>()
    const onReady = vi.fn()
    const table = () => (
      <ProTable<Row, Query>
        ref={ref}
        controller={controller}
        columns={[]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter, restoreOnMount: true }}
        onReady={onReady}
      />
    )
    const first = renderProTable(table())
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    fireEvent.mouseDown(document.querySelector('.ant-pro-view-management-selector [role="combobox"]')!)
    fireEvent.click(document.querySelector('.ant-pro-view-management-selector-option-name[title="默认视图"]')!)
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('默认视图'))
    act(() => controller.setQuery({ status: 'done' }))
    await act(async () => ref.current!.restoreActiveView())
    expect(controller.getState().query).toEqual({ status: 'all' })
    act(() => controller.setQuery({ status: 'done' }))
    first.unmount()
    renderProTable(table())
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2))
    expect(controller.getState().query).toEqual({ status: 'all' })
    expect(activeViewSelectorTitle()).toBe('默认视图')
    expect(adapter.load).toHaveBeenCalledTimes(1)
  })

  it('does not loop after a failed onMount query and retries on the next real mount', async () => {
    const queryRequest = vi.fn().mockRejectedValue(new Error('request failed'))
    const controller = createProTableController<Row, Query>({ queryRequest })
    const onReady = vi.fn()
    const table = () => (
      <ProTable<Row, Query> controller={controller} columns={[]} autoRequest="onMount" onReady={onReady} />
    )
    const mounted = render(table())
    await waitFor(() => expect(controller.getState()).toMatchObject({ requested: true, loading: false }))
    mounted.rerender(table())
    expect(queryRequest).toHaveBeenCalledTimes(1)
    mounted.unmount()
    render(table())
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(2))
    expect(controller.getState().loading).toBe(false)
    expect(onReady).toHaveBeenCalledTimes(2)
  })

  it('rejects a retained restoration method during scope loading and uses the new scope after readiness', async () => {
    const adapter = createPendingCustomViewAdapter()
    const newStorage = createDeferred<any>()
    const controller = createProTableController<Row, Query>({})
    const ref = React.createRef<ProTableRef<Row, Query, unknown>>()
    const onReady = vi.fn()
    const table = (persistenceKey: string, viewsEnabled = true) => (
      <ProTable<Row, Query>
        ref={ref}
        controller={controller}
        columns={[]}
        filters={[searchInputField('status', '状态')]}
        views={viewsEnabled ? { adapter } : false}
        persistenceKey={persistenceKey}
        onReady={onReady}
      />
    )
    const mounted = render(table('first'))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    const restore = ref.current!.restoreActiveView
    vi.mocked(adapter.load).mockReturnValueOnce(newStorage.promise)
    mounted.rerender(table('second'))
    await expect(restore()).rejects.toThrow('not ready')
    await act(async () => newStorage.resolve({ views: [] }))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2))
    act(() => controller.setQuery({ status: 'done' }))
    await act(async () => restore())
    expect(controller.getState().query).toEqual({})
    mounted.rerender(table('second', false))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(3))
    await expect(restore()).rejects.toThrow('not enabled')
  })

  it.each([false, true])('restores transient column widths while respecting controlled widths=%s', async (controlled) => {
    const ref = React.createRef<ProTableRef<Row, Query, unknown>>()
    const onReady = vi.fn()
    renderProTable(
      <ProTable<Row, Query>
        ref={ref}
        columns={[{ key: 'name', title: 'Name', width: 120 }]}
        columnResize={{ persist: false, ...(controlled ? { widths: { name: 180 } } : {}) }}
        views
        onReady={onReady}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByTestId('resize-column'))
    expect(screen.getByTestId('first-column-width').textContent).toBe(controlled ? '180' : '240')
    await act(async () => ref.current!.restoreActiveView())
    expect(screen.getByTestId('first-column-width').textContent).toBe(controlled ? '180' : '120')
  })

  it.each([undefined, false])('does not automatically query with autoRequest=%s and still supports manual query', async (autoRequest) => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        autoRequest={autoRequest}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />,
    )
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    expect(queryRequest).not.toHaveBeenCalled()
    expect(controller.getState().requested).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }))
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
  })

  it.each([undefined, false])('does not automatically refetch a submitted controller with autoRequest=%s', async (autoRequest) => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    controller.setQuery({ status: 'done' })
    await controller.submitQuery()
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        autoRequest={autoRequest}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />,
    )
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    expect(queryRequest).toHaveBeenCalledTimes(1)
  })

  it.each([true, false])('uses controller request history when reopening a cached controller requested=%s', async (requested) => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    const table = (autoRequest?: boolean) => (
      <ProTable<Row, Query>
        controller={controller}
        autoRequest={autoRequest}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />
    )
    const mounted = renderProTable(table())
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    expect(queryRequest).not.toHaveBeenCalled()
    if (requested) await act(async () => controller.submitQuery())
    mounted.unmount()
    renderProTable(table(true))
    await act(async () => {})
    expect(queryRequest).toHaveBeenCalledTimes(1)
    expect(adapter.load).toHaveBeenCalledTimes(1)
  })

  it('can opt into the first request after mounting without autoRequest', async () => {
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    const table = (autoRequest?: boolean) => (
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query> controller={controller} autoRequest={autoRequest} columns={[]} />
        </ConfigProvider>
      </ZbyIntlProvider>
    )
    const mounted = render(table())
    expect(queryRequest).not.toHaveBeenCalled()
    mounted.rerender(table(true))
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    mounted.rerender(table(false))
    mounted.rerender(table(true))
    expect(queryRequest).toHaveBeenCalledTimes(1)
  })

  it('notifies onReady after defaults are committed without waiting for a request function', async () => {
    const events: string[] = []
    const onReady = vi.fn(({ controller }: { controller: ReturnType<typeof createProTableController<Row, Query>> }) => {
      events.push('ready')
      expect(controller.getState().query).toEqual({ status: 'all' })
      expect(screen.getByRole<HTMLInputElement>('textbox', { name: /状态/ }).value).toBe('all')
      expect(controller.getState().requestReady).toBe(false)
    })
    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id', defaultQuery: { status: 'all' } }}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        onControllerReady={() => events.push('controller')}
        onReady={onReady}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    expect(events).toEqual(['controller', 'ready'])
  })

  it('notifies onReady after restoring a view and before automatic query', async () => {
    const adapter = createPendingCustomViewAdapter()
    const events: string[] = []
    const queryRequest = vi.fn(async () => {
      events.push('query')
      return { data: [], total: 0 }
    })
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    const onReady = vi.fn(() => {
      events.push('ready')
      expect(activeViewSelectorTitle()).toBe('待处理')
      expect(controller.getState().query.status).toBe('pending')
      expect(queryRequest).not.toHaveBeenCalled()
      controller.setQuery({ status: 'done' })
    })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        autoRequest
        onReady={onReady}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />,
    )
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(events).toEqual(['ready', 'query'])
    expect(queryRequest).toHaveBeenCalledWith(expect.objectContaining({ status: 'done' }), expect.anything())
  })

  it.each([false, true])('does not duplicate a synchronous onReady query when controller requested=%s', async (requested) => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    if (requested) await controller.submitQuery()
    const before = queryRequest.mock.calls.length
    const onReady = vi.fn(() => {
      controller.resetQuery({ status: 'done' })
      void controller.submitQuery()
    })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        autoRequest
        onReady={onReady}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    expect(queryRequest).toHaveBeenCalledTimes(before + 1)
    expect(controller.getState().query.status).toBe('done')
    expect(controller.getState().committedQuery.status).toBe('done')
  })

  it('does not duplicate an onReady request that throws synchronously', async () => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(() => {
      throw new Error('query failed')
    })
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    await expect(controller.submitQuery()).rejects.toThrow('query failed')
    const onReady = vi.fn(() => {
      void controller.submitQuery().catch(() => undefined)
    })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        autoRequest
        onReady={onReady}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    expect(queryRequest).toHaveBeenCalledTimes(2)
  })

  it('notifies onReady for cached remounts without reloading views or reacting to callback changes', async () => {
    const adapter = createPendingCustomViewAdapter()
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const firstReady = vi.fn()
    const nextReady = vi.fn()
    const table = (onReady: typeof firstReady) => (
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            onReady={onReady}
            columns={[{ key: 'id', title: 'ID' }]}
            filters={[searchInputField('status', '状态')]}
            views={{ adapter }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>
    )
    const mounted = render(table(firstReady))
    await waitFor(() => expect(firstReady).toHaveBeenCalledTimes(1))
    act(() => controller.setQuery({ status: 'done' }))
    mounted.rerender(table(nextReady))
    expect(nextReady).not.toHaveBeenCalled()
    mounted.unmount()
    render(table(nextReady))
    await waitFor(() => expect(nextReady).toHaveBeenCalledTimes(1))
    expect(controller.getState().query.status).toBe('done')
    expect(adapter.load).toHaveBeenCalledTimes(1)
  })

  it.each(['controller', 'scope', 'adapter'])('notifies onReady again when the %s changes', async (change) => {
    let adapter = createPendingCustomViewAdapter()
    let controller = createProTableController<Row, Query>({ rowKey: 'id' })
    let persistenceKey = 'orders'
    const onReady = vi.fn()
    const table = () => (
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            onReady={onReady}
            persistenceKey={persistenceKey}
            columns={[{ key: 'id', title: 'ID' }]}
            filters={[searchInputField('status', '状态')]}
            views={{ adapter }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>
    )
    const mounted = render(table())
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    if (change === 'controller') controller = createProTableController<Row, Query>({ rowKey: 'id' })
    if (change === 'scope') persistenceKey = 'other-orders'
    if (change === 'adapter') adapter = createPendingCustomViewAdapter()
    mounted.rerender(table())
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2))
    expect(onReady).toHaveBeenLastCalledWith({ controller, restoreActiveView: expect.any(Function) })
  })

  it.each([false, true])('notifies onReady once per mount under StrictMode with views=%s', async (views) => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    const onReady = vi.fn(() => {
      void controller.submitQuery()
    })
    const table = () => (
      <React.StrictMode>
        <ProTable<Row, Query>
          controller={controller}
          onReady={onReady}
          autoRequest
          columns={[{ key: 'id', title: 'ID' }]}
          filters={[searchInputField('status', '状态')]}
          views={views ? { adapter } : false}
        />
      </React.StrictMode>
    )
    const mounted = renderProTable(table())
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    expect(queryRequest).toHaveBeenCalledTimes(1)
    mounted.unmount()
    renderProTable(table())
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2))
    expect(queryRequest).toHaveBeenCalledTimes(2)
  })

  it('does not notify onReady or query after a failed view load until retry succeeds', async () => {
    const adapter = createPendingCustomViewAdapter()
    const storage = await adapter.load('orders:views')
    const loading = createDeferred<typeof storage>()
    vi.mocked(adapter.load).mockReset().mockRejectedValueOnce(new Error('views unavailable')).mockReturnValueOnce(loading.promise)
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    const onLoadError = vi.fn()
    const onReady = vi.fn(() => {
      void controller.submitQuery()
    })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        autoRequest
        onReady={onReady}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter, onLoadError }}
      />,
    )
    await waitFor(() => expect(onLoadError).toHaveBeenCalledTimes(1))
    expect(onReady).not.toHaveBeenCalled()
    expect(queryRequest).not.toHaveBeenCalled()
    act(() => onLoadError.mock.calls[0][1].retry())
    expect(onReady).not.toHaveBeenCalled()
    await act(async () => loading.resolve(storage))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    expect(queryRequest).toHaveBeenCalledTimes(1)
    expect(controller.getState().query.status).toBe('pending')
  })

  it('does not notify onReady for a cancelled load after the same controller remounts', async () => {
    const adapter = createPendingCustomViewAdapter()
    const storage = await adapter.load('orders:views')
    const loading = createDeferred<typeof storage>()
    vi.mocked(adapter.load).mockReturnValueOnce(loading.promise)
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const onReady = vi.fn()
    const table = () => (
      <ProTable<Row, Query>
        controller={controller}
        onReady={onReady}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />
    )
    const mounted = renderProTable(table())
    expect(onReady).not.toHaveBeenCalled()
    mounted.unmount()
    renderProTable(table())
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    await act(async () => loading.resolve(storage))
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('does not await an asynchronous onReady callback before automatic query', async () => {
    const gate = createDeferred<void>()
    const events: string[] = []
    const queryRequest = vi.fn(async () => {
      events.push('query')
      return { data: [], total: 0 }
    })
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    const onReady = vi.fn(async () => {
      events.push('ready')
      await gate.promise
      events.push('finished')
    })
    renderProTable(
      <ProTable<Row, Query> controller={controller} autoRequest onReady={onReady} columns={[]} />,
    )
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(events).toEqual(['ready', 'query'])
    await act(async () => {
      gate.resolve()
      await onReady.mock.results[0].value
    })
    expect(events).toEqual(['ready', 'query', 'finished'])
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])('uses the committed autoRequest=%s after a slow view initialization', async (autoRequest) => {
    const adapter = createPendingCustomViewAdapter()
    const storage = await adapter.load('orders:views')
    const loading = createDeferred<typeof storage>()
    vi.mocked(adapter.load).mockReturnValueOnce(loading.promise)
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    await controller.submitQuery()
    const onReady = vi.fn()
    const table = (enabled: boolean) => (
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            autoRequest={enabled}
            onReady={onReady}
            columns={[{ key: 'id', title: 'ID' }]}
            filters={[searchInputField('status', '状态')]}
            views={{ adapter }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>
    )
    const mounted = render(table(!autoRequest))
    mounted.rerender(table(autoRequest))
    await act(async () => loading.resolve(storage))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    expect(queryRequest).toHaveBeenCalledTimes(autoRequest ? 2 : 1)
  })

  it('waits for a request implementation when onReady submitted without one', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const onReady = vi.fn(() => {
      void controller.submitQuery()
    })
    renderProTable(
      <ProTable<Row, Query> controller={controller} autoRequest onReady={onReady} columns={[]} />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    act(() => controller.configure({ queryRequest }))
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('does not retain a disabled initialization refetch after onReady', async () => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    await controller.submitQuery()
    const onReady = vi.fn()
    const table = (autoRequest: boolean) => (
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            autoRequest={autoRequest}
            onReady={onReady}
            columns={[{ key: 'id', title: 'ID' }]}
            filters={[searchInputField('status', '状态')]}
            views={{ adapter }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>
    )
    const mounted = render(table(false))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    expect(queryRequest).toHaveBeenCalledTimes(1)
    mounted.rerender(table(true))
    expect(queryRequest).toHaveBeenCalledTimes(1)
  })

  it('uses the committed filter schema when a slow view becomes ready', async () => {
    const adapter = createPendingCustomViewAdapter()
    const storage = await adapter.load('orders:views')
    const loading = createDeferred<typeof storage>()
    vi.mocked(adapter.load).mockReturnValueOnce(loading.promise)
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    const onReady = vi.fn()
    const table = (withStatus: boolean) => (
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            autoRequest
            onReady={onReady}
            columns={[{ key: 'id', title: 'ID' }]}
            filters={withStatus ? [searchInputField('status', '状态')] : []}
            views={{ adapter }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>
    )
    const mounted = render(table(false))
    mounted.rerender(table(true))
    await act(async () => loading.resolve(storage))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    expect(controller.getState().query.status).toBe('pending')
    expect(queryRequest).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }), expect.anything())
  })

  it.each([undefined, null, false])('does not notify onReady when a view load rejects with %s', async (reason) => {
    const adapter = createPendingCustomViewAdapter()
    vi.mocked(adapter.load).mockRejectedValueOnce(reason)
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id', queryRequest })
    const onReady = vi.fn()
    const onLoadError = vi.fn()
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        autoRequest
        onReady={onReady}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter, onLoadError }}
      />,
    )
    await waitFor(() => expect(onLoadError).toHaveBeenCalledTimes(1))
    expect(onReady).not.toHaveBeenCalled()
    expect(queryRequest).not.toHaveBeenCalled()
  })

  it('reports a synchronous view load error without notifying onReady', async () => {
    const adapter = createPendingCustomViewAdapter()
    vi.mocked(adapter.load).mockImplementationOnce(() => {
      throw new Error('synchronous view error')
    })
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const onReady = vi.fn()
    const onLoadError = vi.fn()
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        onReady={onReady}
        columns={[]}
        views={{ adapter, onLoadError }}
      />,
    )
    await waitFor(() => expect(onLoadError).toHaveBeenCalledTimes(1))
    expect(onReady).not.toHaveBeenCalled()
  })

  it('creates an internal controller and performs the automatic request', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))

    renderProTable(
      <ProTable<Row, Query>
        autoRequest
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
        autoRequest
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
          autoRequest
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
        autoRequest
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
        autoRequest
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

  it('does not re-run onControllerReady when only the callback identity changes', () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const ready = vi.fn()

    const { rerender } = renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        onControllerReady={(next) => ready(next)}
      />,
    )

    expect(ready).toHaveBeenCalledTimes(1)
    expect(ready).toHaveBeenCalledWith(controller)

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            columns={[]}
            onControllerReady={(next) => ready(next)}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    expect(ready).toHaveBeenCalledTimes(1)
  })

  it('runs onControllerReady again when the controller instance changes', () => {
    const first = createProTableController<Row, Query>({ rowKey: 'id' })
    const second = createProTableController<Row, Query>({ rowKey: 'id' })
    const firstReady = vi.fn()
    const secondReady = vi.fn()

    const { rerender } = renderProTable(
      <ProTable<Row, Query>
        controller={first}
        columns={[]}
        onControllerReady={firstReady}
      />,
    )

    expect(firstReady).toHaveBeenCalledTimes(1)
    expect(firstReady).toHaveBeenCalledWith(first)

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={second}
            columns={[]}
            onControllerReady={secondReady}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    expect(firstReady).toHaveBeenCalledTimes(1)
    expect(secondReady).toHaveBeenCalledTimes(1)
    expect(secondReady).toHaveBeenCalledWith(second)
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

  it('disables a filter without clearing its value and restores interaction when enabled', () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'open' },
      rowKey: 'id',
    })
    const table = (disabled: boolean) => (
      <ProTable<Row, Query>
        controller={controller}
        columns={[]}
        views={false}
        filters={[{
          key: 'status',
          label: '状态',
          disabled,
          render: ({ value, setValue }) => (
            <Input disabled={false} value={value} onChange={(event) => setValue(event.target.value)} />
          ),
        }]}
      />
    )
    const { rerender } = render(table(true), {
      wrapper: ({ children }) => (
        <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
          <ConfigProvider>{children}</ConfigProvider>
        </ZbyIntlProvider>
      ),
    })
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: /状态/ })
    const capsule = input.closest('.ant-pro-table-search-field')

    expect(input.disabled).toBe(true)
    expect(input.value).toBe('open')
    expect(capsule?.getAttribute('aria-disabled')).toBe('true')
    expect(capsule?.querySelector('.ant-pro-table-search-field-lock')).toBeTruthy()
    fireEvent.change(input, { target: { value: 'closed' } })
    expect(controller.getState().query.status).toBe('open')

    rerender(table(false))
    expect(input.disabled).toBe(false)
    expect(capsule?.hasAttribute('aria-disabled')).toBe(false)
    expect(capsule?.querySelector('.ant-pro-table-search-field-lock')).toBeNull()
    fireEvent.change(input, { target: { value: 'closed' } })
    expect(controller.getState().query.status).toBe('closed')
  })

  it('keeps control-only disabling separate from filter disabling', () => {
    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id' }}
        columns={[]}
        views={false}
        filters={[
          { key: 'status', label: '状态', disabled: false, render: () => <Select disabled placeholder="请选择" /> },
          { key: 'owner', label: '日期', render: () => <DatePicker.RangePicker disabled={[true, false]} /> },
        ]}
      />,
    )

    expect(document.querySelector('.ant-select-disabled')).toBeTruthy()
    const dates = document.querySelectorAll<HTMLInputElement>('.ant-picker input')
    expect(dates[0]?.disabled).toBe(true)
    expect(dates[1]?.disabled).toBe(false)
    expect(document.querySelector('.ant-pro-table-search-field-disabled')).toBeNull()
    expect(document.querySelector('.ant-pro-table-search-field-lock')).toBeNull()
  })

  it('disables both range endpoints in more filters when the filter is disabled', async () => {
    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id' }}
        columns={[]}
        views={false}
        filters={[{
          key: 'status',
          label: '日期',
          disabled: true,
          hidden: true,
          render: () => <DatePicker.RangePicker disabled={[true, false]} />,
        }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '更多筛选' }))
    const capsule = document.querySelector('.ant-pro-table-search-overlay .ant-pro-table-search-field-disabled')
    expect(capsule).toBeTruthy()
    expect(capsule?.querySelector('.ant-pro-table-search-field-lock')).toBeTruthy()
    const dates = capsule?.querySelectorAll<HTMLInputElement>('input')
    expect(dates?.length).toBe(2)
    expect(Array.from(dates ?? []).every((input) => input.disabled)).toBe(true)
  })

  it('submits the draft only from the search button and keeps hidden fields in more filters', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))

    renderProTable(
      <ProTable<Row, Query>
        autoRequest
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
        autoRequest
        controllerConfig={{ rowKey: 'id', queryRequest }}
        columns={[{ key: 'id', title: 'ID' }]}
        toolbar
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('textbox', { name: /负责人/ })).toBeNull()
    expect(screen.queryByRole('button', { name: '筛选设置' })).toBeNull()
    expect(screen.getByLabelText('设置')).toBeTruthy()

    openFilterSettings()
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '负责人' })).toBeTruthy())
    fireEvent.click(screen.getByRole('checkbox', { name: '负责人' }))
    fireEvent.click(screen.getByRole('button', { name: '移到默认展示' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: /负责人/ })).toBeTruthy())
    expect(screen.queryByRole('button', { name: '更多筛选' })).toBeNull()
    expect(queryRequest).toHaveBeenCalledTimes(1)
  })

  it('applies column and filter drafts together from the settings modal', async () => {
    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id' }}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称' },
        ]}
        toolbar
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('2'))
    fireEvent.click(screen.getByLabelText('设置'))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '名称' })).toBeTruthy())
    fireEvent.click(screen.getByRole('checkbox', { name: '名称' }))
    fireEvent.click(screen.getByRole('tab', { name: '筛选设置' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '负责人' })).toBeTruthy())
    fireEvent.click(screen.getByRole('checkbox', { name: '负责人' }))
    fireEvent.click(screen.getByRole('button', { name: '移到默认展示' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('1'))
    expect(screen.getByRole('textbox', { name: /负责人/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '更多筛选' })).toBeNull()
  })

  it('hides the settings gear when toolbar.setting is false', async () => {
    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id' }}
        columns={[{ key: 'id', title: 'ID' }]}
        toolbar={{ setting: false }}
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(screen.getByRole('textbox', { name: /状态/ })).toBeTruthy())
    expect(screen.queryByLabelText('设置')).toBeNull()
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
        toolbar
        views
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(screen.getByText('默认视图')).toBeTruthy())
    expect(viewActionRoot()).toBeNull()

    openFilterSettings()
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
        toolbar
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
      />,
    )

    await waitFor(() => expect(screen.getByRole('textbox', { name: /状态/ })).toBeTruthy())
    openFilterSettings()
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
        toolbar
        filters={[
          searchInputField('status', '状态'),
          searchInputField('owner', '负责人', { hidden: true }),
        ]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('pending'))
    openFilterSettings()
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
        autoRequest
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
        toolbar
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

    openFilterSettings()
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
        autoRequest
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
    expect(screen.getByLabelText('设置')).toBeTruthy()

    act(() => {
      screen.getByLabelText('设置').click()
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
    expect(screen.getByLabelText('设置')).toBeTruthy()
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
    expect(screen.queryByLabelText('设置')).toBeNull()
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
      screen.getByLabelText('设置').click()
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

  it('does not apply column preferences when toolbar.setting is false', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    renderProTable(
      <ProTable<Row, Query>
        controller={controller}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '名称', fieldConfig: { defaultPreference: { visible: false } } },
        ]}
        toolbar={{ setting: false }}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('2'))
    expect(screen.queryByLabelText('设置')).toBeNull()
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
    expect(screen.getByLabelText('设置')).toBeTruthy()

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            columns={[{ key: 'id', title: 'ID' }]}
            toolbar={{ setting: false }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )
    expect(screen.getByLabelText('刷新')).toBeTruthy()
    expect(screen.queryByLabelText('设置')).toBeNull()

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

  it('keeps layout.header above search and inside the fullscreen root', () => {
    renderProTable(
      <ProTable<Row, Query>
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        toolbar
        layout={{ header: <div>快速筛选</div> }}
      />,
    )

    const header = screen.getByText('快速筛选')
    const searchRow = document.querySelector('.ant-pro-table-search-row')
    const content = header.closest('.ant-pro-table-content')

    expect(header.closest('.ant-pro-table-header')).toBeTruthy()
    expect(content).toBeTruthy()
    expect(searchRow).toBeTruthy()
    expect(content?.contains(searchRow ?? null)).toBe(true)
    expect(
      header.compareDocumentPosition(searchRow as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    fireEvent.click(screen.getByLabelText('全屏'))

    const fullscreenRoot = document.querySelector('.ant-pro-table-fullscreen')
    expect(fullscreenRoot?.contains(screen.getByText('快速筛选'))).toBe(true)
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
    fireEvent.click(screen.getByLabelText('设置'))
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
      screen.getByLabelText('设置').click()
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
        autoRequest
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

  it('preserves a cached controller across repeated mounts and recomputes view dirty state', async () => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async (params: { status?: string; page: number }) => ({
      data: [{ id: `${params.status}-${params.page}`, name: 'Order' }],
      total: 30,
    }))
    const controller = createProTableController<Row, Query>({
      rowKey: 'id',
      defaultQuery: { status: 'all' },
      queryRequest,
    })
    const table = () => (
      <ProTable<Row, Query>
        autoRequest
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />
    )
    let mounted = renderProTable(table())
    await waitFor(() => expect(screen.getByTestId('row-ids').textContent).toBe('pending-1'))
    expect(viewActionRoot()).toBeNull()
    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), { target: { value: 'done' } })
    await act(async () => {
      await controller.submitQuery()
      await controller.setPage(2)
    })
    expect(screen.getByTestId('row-ids').textContent).toBe('done-2')
    const requestCount = queryRequest.mock.calls.length

    for (let reopen = 0; reopen < 2; reopen += 1) {
      mounted.unmount()
      mounted = renderProTable(table())
      await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
      expect(controller.getState().query.status).toBe('done')
      expect(controller.getState().committedQuery.status).toBe('done')
      expect(screen.getByTestId('row-ids').textContent).toBe('done-2')
      expect(controller.getState().currentPage).toBe(2)
      expect(viewActionRoot()).toBeTruthy()
    }
    expect(adapter.load).toHaveBeenCalledTimes(1)
    expect(queryRequest).toHaveBeenCalledTimes(requestCount)

    mounted.unmount()
    act(() => controller.setQuery({ status: 'pending' }))
    mounted = renderProTable(table())
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: /状态/ }).value).toBe('pending')
    expect(viewActionRoot()).toBeNull()
    expect(controller.getState().committedQuery.status).toBe('done')
    expect(screen.getByTestId('row-ids').textContent).toBe('done-2')
    expect(queryRequest).toHaveBeenCalledTimes(requestCount)

    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), { target: { value: 'done' } })
    const actions = viewActionRoot()
    expect(actions).toBeTruthy()
    fireEvent.click(within(actions!).getByRole('button', { name: /重\s*置/ }))
    await waitFor(() => expect(screen.getByTestId('row-ids').textContent).toBe('pending-1'))
    await waitFor(() => expect(viewActionRoot()).toBeNull())
  })

  it.each(['controller', 'scope', 'adapter'])('initializes views again when the %s changes', async (change) => {
    const adapter = createPendingCustomViewAdapter()
    let activeAdapter = adapter
    let persistenceKey = 'orders'
    let controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const table = () => (
      <ProTable<Row, Query>
        controller={controller}
        autoRequest={false}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        persistenceKey={persistenceKey}
        views={{ adapter: activeAdapter }}
      />
    )
    const mounted = renderProTable(table())
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    mounted.unmount()
    controller.resetQuery()
    if (change === 'controller') controller = createProTableController<Row, Query>({ rowKey: 'id' })
    if (change === 'scope') persistenceKey = 'other-orders'
    if (change === 'adapter') activeAdapter = createPendingCustomViewAdapter()
    renderProTable(table())
    await waitFor(() => expect(controller.getState().query.status).toBe('pending'))
    expect(activeViewSelectorTitle()).toBe('待处理')
    expect(viewActionRoot()).toBeNull()
    expect(activeAdapter.load).toHaveBeenLastCalledWith(`${persistenceKey}:views`)
    expect(activeAdapter.load).toHaveBeenCalledTimes(change === 'adapter' ? 1 : 2)
  })

  it('retains transient custom views and their unsaved query on controller reuse', async () => {
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    let persistenceKey = 'orders'
    const table = () => (
      <ProTable<Row, Query>
        controller={controller}
        autoRequest={false}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        persistenceKey={persistenceKey}
        views={{ adapter: false }}
      />
    )
    const mounted = renderProTable(table())
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('默认视图'))
    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), { target: { value: 'pending' } })
    fireEvent.click(viewActionRoot()!.querySelector('button')!)
    fireEvent.click(await screen.findByRole('menuitem', { name: '另存为' }))
    fireEvent.change(await screen.findByPlaceholderText('请输入视图名称'), { target: { value: '临时订单' } })
    fireEvent.click(screen.getByRole('button', { name: /创\s*建/ }))
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('临时订单'))
    await waitFor(() => expect(viewActionRoot()).toBeNull())
    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), { target: { value: 'done' } })
    mounted.unmount()
    const reopened = renderProTable(table())
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('临时订单'))
    expect(controller.getState().query.status).toBe('done')
    expect(controller.getState().committedQuery.status).toBe('pending')
    expect(viewActionRoot()).toBeTruthy()
    reopened.unmount()
    persistenceKey = 'other-orders'
    renderProTable(table())
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('默认视图'))
    expect(screen.queryByText('临时订单')).toBeNull()
  })

  it('waits for the new controller view before making an automatic request', async () => {
    const adapter = createPendingCustomViewAdapter()
    const original = createProTableController<Row, Query>({ rowKey: 'id' })
    const table = (controller: typeof original) => (
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            autoRequest
            controller={controller}
            columns={[{ key: 'id', title: 'ID' }]}
            filters={[searchInputField('status', '状态')]}
            views={{ adapter }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>
    )
    const mounted = render(table(original))
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    const storage = await adapter.load('orders:views')
    let finishLoad!: (value: typeof storage) => void
    vi.mocked(adapter.load).mockReturnValueOnce(new Promise((resolve) => {
      finishLoad = resolve
    }))
    const queryRequest = vi.fn(async () => ({ data: [], total: 0 }))
    const replacement = createProTableController<Row, Query>({
      rowKey: 'id',
      defaultQuery: { status: 'all' },
      queryRequest,
    })
    mounted.rerender(table(replacement))
    expect(queryRequest).not.toHaveBeenCalled()
    await act(async () => finishLoad(storage))
    await waitFor(() => expect(queryRequest).toHaveBeenCalledTimes(1))
    expect(queryRequest).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
      expect.anything(),
    )
  })

  it('retains saved view fields while the filter schema loads asynchronously', async () => {
    const adapter = createPendingCustomViewAdapter()
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const table = (withStatus: boolean) => (
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            autoRequest={false}
            columns={[{ key: 'id', title: 'ID' }]}
            filters={withStatus ? [searchInputField('status', '状态')] : []}
            views={{ adapter }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>
    )
    const mounted = render(table(false))
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    mounted.rerender(table(true))
    act(() => controller.setQuery({ status: 'done' }))
    await waitFor(() => expect(viewActionRoot()).toBeTruthy())
    fireEvent.click(within(viewActionRoot()!).getByRole('button', { name: /重\s*置/ }))
    await waitFor(() => expect(controller.getState().query.status).toBe('pending'))
    await waitFor(() => expect(viewActionRoot()).toBeNull())
  })

  it.each(['cancelled', 'failed'])('does not reuse a %s view initialization', async (outcome) => {
    const adapter = createPendingCustomViewAdapter()
    const storage = await adapter.load('orders:views')
    vi.mocked(adapter.load).mockClear()
    let finishLoad!: (value: typeof storage) => void
    let failLoad!: (error: Error) => void
    vi.mocked(adapter.load).mockReturnValueOnce(new Promise((resolve, reject) => {
      finishLoad = resolve
      failLoad = reject
    }))
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const table = () => (
      <ProTable<Row, Query>
        controller={controller}
        autoRequest={false}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />
    )
    const mounted = renderProTable(table())
    if (outcome === 'failed') {
      await act(async () => failLoad(new Error('storage unavailable')))
      await waitFor(() => expect(activeViewSelectorTitle()).toBe('默认视图'))
    }
    mounted.unmount()
    controller.setQuery({ status: 'open' })
    renderProTable(table())
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    expect(adapter.load).toHaveBeenCalledTimes(2)
    expect(controller.getState().committedQuery.status).toBe('open')
    if (outcome === 'cancelled') {
      act(() => controller.setQuery({ status: 'done' }))
      await act(async () => finishLoad(storage))
      expect(controller.getState().query.status).toBe('done')
      expect(controller.getState().committedQuery.status).toBe('open')
    }
  })

  it('initializes views again after they are disabled and re-enabled', async () => {
    const adapter = createPendingCustomViewAdapter()
    const controller = createProTableController<Row, Query>({ rowKey: 'id' })
    const table = (enabled: boolean) => (
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            controller={controller}
            autoRequest={false}
            columns={[{ key: 'id', title: 'ID' }]}
            filters={[searchInputField('status', '状态')]}
            views={enabled ? { adapter } : false}
          />
        </ConfigProvider>
      </ZbyIntlProvider>
    )
    const mounted = render(table(true))
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    act(() => controller.setQuery({ status: 'done' }))
    mounted.rerender(table(false))
    expect(controller.getState().query.status).toBe('done')
    mounted.rerender(table(true))
    await waitFor(() => expect(controller.getState().query.status).toBe('pending'))
    expect(adapter.load).toHaveBeenCalledTimes(2)
    expect(viewActionRoot()).toBeNull()
  })

  it('keeps the active custom view after entering fullscreen', async () => {
    const adapter = createPendingCustomViewAdapter()

    renderProTable(
      <ProTable<Row, Query>
        controllerConfig={{ rowKey: 'id' }}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        toolbar
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(activeViewSelectorTitle()).toBe('待处理'))
    fireEvent.click(screen.getByLabelText('全屏'))
    await waitFor(() => expect(document.querySelector('.ant-pro-table-fullscreen')).toBeTruthy())
    expect(activeViewSelectorTitle()).toBe('待处理')
  })

  it('adds a saved-as view to the selector', async () => {
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: {},
      queryRequest,
      rowKey: 'id',
    })

    renderProTable(
      <ProTable<Row, Query>
        autoRequest
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        toolbar
        views
      />,
    )

    await waitFor(() => expect(activeViewSelectorTitle()).toBe('默认视图'))
    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), {
      target: { value: 'open' },
    })
    await waitFor(() => expect(viewActionRoot()).toBeTruthy())
    fireEvent.click(viewActionRoot()!.querySelector('button') as HTMLElement)
    fireEvent.click(await screen.findByRole('menuitem', { name: '另存为' }))
    fireEvent.change(await screen.findByPlaceholderText('请输入视图名称'), {
      target: { value: '进行中' },
    })
    fireEvent.click(screen.getByRole('button', { name: /创\s*建/ }))
    await waitFor(() => expect(activeViewSelectorTitle()).toBe('进行中'))
  })

  it('loads stored views after views are enabled', async () => {
    const adapter = createPendingCustomViewAdapter()
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })

    const { rerender } = renderProTable(
      <ProTable<Row, Query>
        autoRequest
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={false}
      />,
    )

    await waitFor(() => expect(queryRequest).toHaveBeenCalled())
    expect(adapter.load).not.toHaveBeenCalled()
    expect(controller.getState().committedQuery.status).toBe('all')

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            autoRequest
            controller={controller}
            columns={[{ key: 'id', title: 'ID' }]}
            filters={[searchInputField('status', '状态')]}
            views={{ adapter }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    await waitFor(() => expect(adapter.load).toHaveBeenCalled())
    await waitFor(() => expect(controller.getState().committedQuery.status).toBe('pending'))
    expect(screen.getByText('待处理')).toBeTruthy()
  })

  it('loads stored views after persistenceKey is set', async () => {
    const adapter = createTestAdapter<any>()
    adapter.load = vi.fn(async (instanceId: string) => {
      if (String(instanceId).includes('orders')) {
        return {
          views: [
            {
              id: 'custom-pending',
              name: '待处理',
              scope: 'custom' as const,
              order: 0,
              snapshot: {
                query: { status: 'pending' },
                columnPreferences: [],
                sorter: null,
              },
            },
          ],
          activeViewId: 'custom-pending',
        }
      }
      return { views: [], activeViewId: undefined }
    })
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      queryRequest,
      rowKey: 'id',
    })

    const { rerender } = renderProTable(
      <ProTable<Row, Query>
        autoRequest
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        filters={[searchInputField('status', '状态')]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(adapter.load).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('默认视图')).toBeTruthy())
    expect(screen.queryByText('待处理')).toBeNull()

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            autoRequest
            controller={controller}
            columns={[{ key: 'id', title: 'ID' }]}
            filters={[searchInputField('status', '状态')]}
            persistenceKey="orders"
            views={{ adapter }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    await waitFor(() => expect(adapter.load).toHaveBeenCalledWith('orders:views'))
    await waitFor(() => expect(screen.getByText('待处理')).toBeTruthy())
    expect(controller.getState().committedQuery.status).toBe('pending')
  })

  it('does not reload views when only columns change', async () => {
    const adapter = createTestAdapter<any>()
    const queryRequest = vi.fn(async () => ({ data: [{ id: '1', name: 'A' }], total: 1 }))
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
    })

    const { rerender } = renderProTable(
      <ProTable<Row, Query>
        autoRequest
        controller={controller}
        columns={[{ key: 'id', title: 'ID' }]}
        views={{ adapter }}
      />,
    )

    await waitFor(() => expect(adapter.load).toHaveBeenCalledTimes(1))

    rerender(
      <ZbyIntlProvider locale="zh-CN" resources={zbyProIntlResources}>
        <ConfigProvider>
          <ProTable<Row, Query>
            autoRequest
            controller={controller}
            columns={[
              { key: 'id', title: 'ID' },
              { key: 'name', title: '名称' },
            ]}
            views={{ adapter }}
          />
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('columns').textContent).toBe('2'))
    expect(adapter.load).toHaveBeenCalledTimes(1)
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
        autoRequest
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
      screen.getByLabelText('设置').click()
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
        autoRequest
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
    fireEvent.change(screen.getByRole('textbox', { name: /状态/ }), {
      target: { value: 'done' },
    })
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
