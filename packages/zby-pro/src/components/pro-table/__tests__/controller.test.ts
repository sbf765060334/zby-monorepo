import { describe, expect, it, vi } from 'vitest'

import { cancelProTableControllerRequests, consumeProTableQueryOverlay, createProTableController } from '../controller'

type Row = { id: string; status: string }
type Query = { status?: string }

function createAbortError() {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

describe('createProTableController', () => {
  it('keeps filters on query and only puts paging on the request params', async () => {
    const queryRequest = vi.fn(async (params: Query & { page: number; pageSize: number }) => ({
      data: [{ id: String(params.page), status: params.status ?? 'all' }],
      total: 1,
    }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: {},
      queryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    controller.setQueryField('status', 'pending')
    await controller.submitQuery()

    expect(queryRequest).toHaveBeenCalledWith(
      { status: 'pending', page: 1, pageSize: 10 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(controller.getState()).toMatchObject({
      query: { status: 'pending' },
      committedQuery: { status: 'pending' },
      defaultQuery: {},
      latestParams: { status: 'pending', page: 1, pageSize: 10 },
      currentPage: 1,
      pageSize: 10,
      dataSource: [{ id: '1', status: 'pending' }],
      total: 1,
      loading: false,
      inquired: true,
    })
  })

  it('uses data length as total when the list response omits total', async () => {
    const queryRequest = vi.fn(async () => ({
      data: [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
      ],
      total: 20,
    }))
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
    })

    await controller.submitQuery()
    expect(controller.getState().total).toBe(20)

    queryRequest.mockResolvedValueOnce({
      data: [{ id: '1', status: 'pending' }],
    } as { data: Row[]; total?: number })
    await controller.reload()

    expect(controller.getState().dataSource).toHaveLength(1)
    expect(controller.getState().total).toBe(1)
  })

  it('still rejects submitQuery when the list request fails', async () => {
    const controller = createProTableController<Row, Query>({
      queryRequest: async () => {
        throw new Error('query failed')
      },
      rowKey: 'id',
    })

    await expect(controller.submitQuery()).rejects.toThrow('query failed')
    expect(controller.getState().loading).toBe(false)
  })

  it('does not write page or sort into query when paging, sorting, or reloading', async () => {
    const queryRequest = vi.fn(async (params: Query & { page: number; pageSize: number }) => ({
      data: [{ id: String(params.page), status: params.status ?? 'all' }],
      total: 20,
    }))
    const nextQueryRequest = vi.fn(async (params: Query & { page: number; pageSize: number }) => ({
      data: [{ id: String(params.page), status: params.status ?? 'all' }],
      total: 20,
    }))
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    controller.setQueryField('status', 'pending')
    await controller.submitQuery()
    await controller.setPage(2)
    controller.setQueryField('status', 'done')

    expect(controller.getState()).toMatchObject({
      query: { status: 'done' },
      committedQuery: { status: 'pending' },
      currentPage: 2,
      latestParams: { status: 'pending', page: 2, pageSize: 10 },
    })

    controller.configure({
      defaultQuery: { status: 'all' },
      queryRequest: nextQueryRequest,
    })

    expect(controller.getState()).toMatchObject({
      query: { status: 'done' },
      committedQuery: { status: 'pending' },
      defaultQuery: { status: 'all' },
      currentPage: 2,
    })

    await controller.reload()
    expect(nextQueryRequest).toHaveBeenCalledWith(
      { status: 'pending', page: 2, pageSize: 10 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(queryRequest).toHaveBeenCalledTimes(2)

    await controller.setSort([{ field: 'amount', order: 'ascend' }])
    expect(controller.getState()).toMatchObject({
      query: { status: 'done' },
      committedQuery: { status: 'pending' },
      currentPage: 1,
      sort: [{ field: 'amount', order: 'ascend' }],
      latestParams: {
        status: 'pending',
        page: 1,
        pageSize: 10,
        sort: [{ field: 'amount', order: 'ascend' }],
      },
    })
    expect(controller.getRequestParams()).toEqual({
      status: 'pending',
      page: 1,
      pageSize: 10,
      sort: [{ field: 'amount', order: 'ascend' }],
    })

    await controller.setSort([
      { field: 'amount', order: 'ascend' },
      { field: 'id', order: 'descend' },
    ])
    expect(controller.getRequestParams()).toEqual({
      status: 'pending',
      page: 1,
      pageSize: 10,
      sort: [
        { field: 'amount', order: 'ascend' },
        { field: 'id', order: 'descend' },
      ],
    })
  })

  it('keeps local sort on the client and only sends remote sort in the request', async () => {
    const queryRequest = vi.fn(async (params: Query & { page: number; pageSize: number }) => ({
      data: [{ id: String(params.page), status: params.status ?? 'all' }],
      total: 20,
    }))
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
      localSortFields: ['name'],
    })

    await controller.submitQuery()
    await controller.setPage(2)
    controller.setSelectedRowKeys(['2'], [{ id: '2', status: 'all' }])
    queryRequest.mockClear()

    await controller.setSort([{ field: 'name', order: 'ascend' }])
    expect(queryRequest).not.toHaveBeenCalled()
    expect(controller.getState()).toMatchObject({
      currentPage: 2,
      selectedRowKeys: ['2'],
      sort: [{ field: 'name', order: 'ascend' }],
    })
    expect(controller.getRequestParams()).toEqual({ page: 2, pageSize: 10 })

    await controller.setSort([
      { field: 'amount', order: 'ascend' },
      { field: 'name', order: 'descend' },
    ])
    expect(queryRequest).toHaveBeenCalledTimes(1)
    expect(queryRequest).toHaveBeenCalledWith(
      { page: 1, pageSize: 10, sort: [{ field: 'amount', order: 'ascend' }] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(controller.getState().sort).toEqual([
      { field: 'amount', order: 'ascend' },
      { field: 'name', order: 'descend' },
    ])
    expect(controller.getState().currentPage).toBe(1)
    expect(controller.getState().selectedRowKeys).toEqual([])
    expect(controller.getRequestParams()).toEqual({
      page: 1,
      pageSize: 10,
      sort: [{ field: 'amount', order: 'ascend' }],
    })

    queryRequest.mockClear()
    await controller.setSort([
      { field: 'amount', order: 'ascend' },
      { field: 'name', order: 'ascend' },
    ])
    expect(queryRequest).not.toHaveBeenCalled()
    expect(controller.getState().currentPage).toBe(1)
    expect(controller.getState().sort).toEqual([
      { field: 'amount', order: 'ascend' },
      { field: 'name', order: 'ascend' },
    ])

    await controller.submitQuery()
    expect(queryRequest).toHaveBeenLastCalledWith(
      { page: 1, pageSize: 10, sort: [{ field: 'amount', order: 'ascend' }] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('pages with committed filters and ignores the unsaved draft', async () => {
    const queryRequest = vi.fn(async () => ({
      data: [{ id: '1', status: 'all' }],
      total: 20,
    }))
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    controller.setQueryField('status', 'pending')
    expect(controller.getRequestParams()).toEqual({ page: 1, pageSize: 10 })

    await controller.setPage(2)

    expect(queryRequest).toHaveBeenCalledWith(
      { page: 2, pageSize: 10 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(controller.getState()).toMatchObject({
      query: { status: 'pending' },
      committedQuery: {},
      currentPage: 2,
      latestParams: { page: 2, pageSize: 10 },
    })
  })

  it('lets paging during an in-flight search use the submitted filters', async () => {
    const queryRequest = vi.fn(
      (
        params: Query & { page: number; pageSize: number },
        context: { signal: AbortSignal },
      ) =>
        new Promise<{ data: Row[]; total: number }>((resolve, reject) => {
          const fail = () => {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            reject(error)
          }

          if (context.signal.aborted) {
            fail()
            return
          }

          context.signal.addEventListener('abort', fail, { once: true })

          if (params.page !== 1) {
            resolve({
              data: [{ id: String(params.page), status: params.status ?? 'all' }],
              total: 20,
            })
          }
        }),
    )
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    controller.setQueryField('status', 'pending')
    const searchPromise = controller.submitQuery()

    expect(queryRequest).toHaveBeenCalledTimes(1)
    expect(queryRequest.mock.calls[0]?.[0]).toEqual({
      status: 'pending',
      page: 1,
      pageSize: 10,
    })
    expect(controller.getState()).toMatchObject({
      committedQuery: { status: 'pending' },
      currentPage: 1,
      latestParams: { status: 'pending', page: 1, pageSize: 10 },
    })

    await controller.setPage(2)
    await searchPromise

    expect(queryRequest).toHaveBeenCalledTimes(2)
    expect(queryRequest.mock.calls[1]?.[0]).toEqual({
      status: 'pending',
      page: 2,
      pageSize: 10,
    })
    expect(controller.getState()).toMatchObject({
      query: { status: 'pending' },
      committedQuery: { status: 'pending' },
      currentPage: 2,
      latestParams: { status: 'pending', page: 2, pageSize: 10 },
      loading: false,
      inquired: true,
    })
    expect(controller.getRequestParams()).toEqual({
      status: 'pending',
      page: 2,
      pageSize: 10,
    })
  })

  it('writes the request snapshot even when queryRequest is missing', async () => {
    const controller = createProTableController<Row, Query>({
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    controller.setQueryField('status', 'pending')
    await controller.submitQuery()

    expect(controller.getState()).toMatchObject({
      query: { status: 'pending' },
      committedQuery: { status: 'pending' },
      currentPage: 1,
      latestParams: { status: 'pending', page: 1, pageSize: 10 },
    })
    expect(controller.getRequestParams()).toEqual({
      status: 'pending',
      page: 1,
      pageSize: 10,
    })
  })

  it('refetches summary together with every list request', async () => {
    const queryRequest = vi.fn(async () => ({
      data: [{ id: '1', status: 'all' }],
      total: 1,
    }))
    const summaryRequest = vi.fn(async () => ({ count: 1 }))
    const controller = createProTableController<Row, Query, { count: number }>({
      queryRequest,
      summaryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    await controller.submitQuery()
    expect(summaryRequest).toHaveBeenCalledTimes(1)

    await controller.setPage(2)
    expect(summaryRequest).toHaveBeenCalledTimes(2)
    expect(summaryRequest).toHaveBeenLastCalledWith(
      { page: 2, pageSize: 10 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )

    await controller.reload()
    expect(summaryRequest).toHaveBeenCalledTimes(3)

    await controller.setPageSize(20)
    expect(summaryRequest).toHaveBeenCalledTimes(4)

    await controller.setSort([{ field: 'id', order: 'ascend' }])
    expect(summaryRequest).toHaveBeenCalledTimes(5)

    controller.setQueryField('status', 'pending')
    await controller.submitQuery({ resetPage: false })
    expect(summaryRequest).toHaveBeenCalledTimes(6)
    expect(queryRequest).toHaveBeenLastCalledWith(
      { status: 'pending', page: 1, pageSize: 20, sort: [{ field: 'id', order: 'ascend' }] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(summaryRequest).toHaveBeenLastCalledWith(
      { status: 'pending', page: 1, pageSize: 20, sort: [{ field: 'id', order: 'ascend' }] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('keeps the last successful picture when summary fails', async () => {
    const queryRequest = vi.fn(async (params: Query & { page: number; pageSize: number }) => ({
      data: [{ id: String(params.page), status: params.status ?? 'all' }],
      total: 20,
    }))
    const summaryRequest = vi.fn(async (params: Query & { page: number; pageSize: number }) => ({
      count: params.status === 'done' ? 2 : 1,
    }))
    const controller = createProTableController<Row, Query, { count: number }>({
      queryRequest,
      summaryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    controller.setQueryField('status', 'pending')
    await controller.submitQuery()
    await controller.setPage(2)

    const settled = controller.getState()
    controller.setQueryField('status', 'done')
    summaryRequest.mockRejectedValueOnce(new Error('summary failed'))

    await expect(controller.submitQuery()).rejects.toThrow('summary failed')

    expect(controller.getState()).toMatchObject({
      query: { status: 'done' },
      committedQuery: { status: 'pending' },
      currentPage: 2,
      latestParams: { status: 'pending', page: 2, pageSize: 10 },
      dataSource: [{ id: '2', status: 'pending' }],
      summary: { count: 1 },
      loading: false,
      inquired: true,
    })
    expect(controller.getRequestParams()).toEqual({
      status: 'pending',
      page: 2,
      pageSize: 10,
    })
    expect(settled.dataSource).toEqual(controller.getState().dataSource)
  })

  it('waits for the page list and a new summary before ending an overlapped search', async () => {
    const queryRequest = vi.fn(
      (
        params: Query & { page: number; pageSize: number },
        context: { signal: AbortSignal },
      ) =>
        new Promise<{ data: Row[]; total: number }>((resolve, reject) => {
          const fail = () => reject(createAbortError())
          if (context.signal.aborted) {
            fail()
            return
          }
          context.signal.addEventListener('abort', fail, { once: true })
          if (params.page !== 1) {
            resolve({
              data: [{ id: String(params.page), status: params.status ?? 'all' }],
              total: 20,
            })
          }
        }),
    )
    const summaryRequest = vi.fn(
      (
        params: Query & { page: number; pageSize: number },
        context: { signal: AbortSignal },
      ) =>
        new Promise<{ count: number }>((resolve, reject) => {
          const fail = () => reject(createAbortError())
          if (context.signal.aborted) {
            fail()
            return
          }
          context.signal.addEventListener('abort', fail, { once: true })
          if (params.page !== 1) {
            resolve({ count: params.page })
          }
        }),
    )
    const controller = createProTableController<Row, Query, { count: number }>({
      queryRequest,
      summaryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    controller.setQueryField('status', 'pending')
    const searchPromise = controller.submitQuery()
    await controller.setPage(2)
    await searchPromise

    expect(queryRequest).toHaveBeenCalledTimes(2)
    expect(summaryRequest).toHaveBeenCalledTimes(2)
    expect(summaryRequest.mock.calls[1]?.[0]).toEqual({
      status: 'pending',
      page: 2,
      pageSize: 10,
    })
    expect(controller.getState()).toMatchObject({
      committedQuery: { status: 'pending' },
      currentPage: 2,
      latestParams: { status: 'pending', page: 2, pageSize: 10 },
      dataSource: [{ id: '2', status: 'pending' }],
      summary: { count: 2 },
      loading: false,
    })
  })

  it('does not apply a superseded pair when queryRequest ignores abort', async () => {
    const queryRequest = vi.fn(async (params: Query & { page: number; pageSize: number }) => {
      await wait(20)
      return {
        data: [{ id: `late-${params.page}`, status: params.status ?? 'all' }],
        total: 20,
      }
    })
    const summaryRequest = vi.fn(async (params: Query & { page: number; pageSize: number }) => {
      await wait(params.page === 1 ? 40 : 0)
      return { count: params.page === 1 ? 99 : 2 }
    })
    const controller = createProTableController<Row, Query, { count: number }>({
      queryRequest,
      summaryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    controller.setQueryField('status', 'pending')
    const searchPromise = controller.submitQuery()
    await controller.setPage(2)
    await searchPromise
    await wait(50)

    expect(controller.getState()).toMatchObject({
      currentPage: 2,
      dataSource: [{ id: 'late-2', status: 'pending' }],
      summary: { count: 2 },
      loading: false,
    })
  })

  it('restores the last successful identity when requests are cancelled', async () => {
    let holdNextRequest = false
    const queryRequest = vi.fn(
      (params: Query & { page: number; pageSize: number }, context: { signal: AbortSignal }) => {
        if (!holdNextRequest) {
          return Promise.resolve({
            data: [{ id: String(params.page), status: params.status ?? 'all' }],
            total: 1,
          })
        }

        return new Promise<{ data: Row[]; total: number }>((_resolve, reject) => {
          const fail = () => reject(createAbortError())
          if (context.signal.aborted) {
            fail()
            return
          }
          context.signal.addEventListener('abort', fail, { once: true })
        })
      },
    )
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    controller.setQueryField('status', 'pending')
    await controller.submitQuery()
    holdNextRequest = true
    controller.setQueryField('status', 'done')
    const searchPromise = controller.submitQuery()
    cancelProTableControllerRequests(controller)
    await searchPromise

    expect(controller.getState()).toMatchObject({
      query: { status: 'done' },
      committedQuery: { status: 'pending' },
      latestParams: { status: 'pending', page: 1, pageSize: 10 },
      loading: false,
    })
  })

  it('resetQuery applies the latest defaultQuery from configure without touching page', () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      rowKey: 'id',
      pagination: { defaultCurrent: 3, defaultPageSize: 8 },
    })

    controller.setQueryField('status', 'pending')
    controller.configure({
      defaultQuery: { status: 'done' },
    })

    expect(controller.getState().query.status).toBe('pending')
    expect(controller.getState().currentPage).toBe(3)
    expect(controller.getState().pageSize).toBe(8)
    controller.resetQuery()
    expect(controller.getState().query).toEqual({ status: 'done' })
    expect(controller.getState().currentPage).toBe(3)
  })

  it('coerces empty search writes to undefined by default', () => {
    type EmptyQuery = { status?: string; labels?: string[] }
    const controller = createProTableController<Row, EmptyQuery>({
      rowKey: 'id',
    })

    controller.setQueryField('status', '')
    expect(controller.getState().query.status).toBeUndefined()

    controller.setQuery({ status: 'pending', labels: [] })
    expect(controller.getState().query).toMatchObject({ status: 'pending' })
    expect(controller.getState().query.labels).toBeUndefined()
  })

  it('keeps empty search writes when coerceEmptyQuery is false', () => {
    type EmptyQuery = { status?: string; labels?: string[] }
    const controller = createProTableController<Row, EmptyQuery>({
      rowKey: 'id',
      coerceEmptyQuery: false,
    })

    controller.setQueryField('status', '')
    expect(controller.getState().query.status).toBe('')

    controller.setQuery({ labels: [] })
    expect(controller.getState().query.labels).toEqual([])

    controller.configure({ coerceEmptyQuery: true })
    controller.setQueryField('status', '')
    expect(controller.getState().query.status).toBeUndefined()
  })

  it('seeds live page size from configure only before the first request', async () => {
    const queryRequest = vi.fn(async () => ({
      data: [{ id: '1', status: 'pending' }],
      total: 1,
    }))
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    })

    controller.configure({ pagination: { defaultPageSize: 20 } })
    expect(controller.getState().pageSize).toBe(20)
    expect(controller.getState().rowKey).toBe('id')

    await controller.submitQuery()
    expect(queryRequest).toHaveBeenLastCalledWith(
      { page: 1, pageSize: 20 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )

    controller.configure({ pagination: { defaultPageSize: 50 } })
    expect(controller.getState().pageSize).toBe(20)
  })

  it('keeps selected rows and supports row patching', () => {
    const controller = createProTableController<Row, Query>({
      rowKey: 'id',
    })
    controller.setDataSource([
      { id: '1', status: 'pending' },
      { id: '2', status: 'done' },
    ])

    controller.setSelectedRowKeys(['1'])
    controller.patchRow('id', '1', { status: 'done' })

    expect(controller.getSelectedRows()).toEqual([{ id: '1', status: 'done' }])
    expect(controller.getState().dataSource).toEqual([
      { id: '1', status: 'done' },
      { id: '2', status: 'done' },
    ])
  })

  it('fills selected rows from the default key field when rowKey is omitted', () => {
    type KeyRow = { key: string; status: string }
    const controller = createProTableController<KeyRow, Query>()
    controller.setDataSource([{ key: 'a', status: 'pending' }])
    controller.setSelectedRowKeys(['a'])
    expect(controller.getSelectedRows()).toEqual([{ key: 'a', status: 'pending' }])
  })

  it('drops stale selected rows when keys are cleared and refreshes them from new data', () => {
    const first = { id: '1', status: 'pending' }
    const controller = createProTableController<Row, Query>({
      rowKey: 'id',
    })
    controller.setDataSource([first, { id: '2', status: 'done' }])
    controller.setSelectedRowKeys(['1'])
    expect(controller.getSelectedRows()[0]).toBe(first)

    controller.setSelectedRowKeys([])
    expect(controller.getSelectedRows()).toEqual([])

    const next = { id: '1', status: 'shipping' }
    controller.setDataSource([next])
    controller.setSelectedRowKeys(['1'])
    expect(controller.getSelectedRows()).toEqual([next])
  })

  it('keeps off-page selected rows and replaces them when the same key comes back', () => {
    const first = { id: '1', status: 'pending' }
    const controller = createProTableController<Row, Query>({
      rowKey: 'id',
    })
    controller.setDataSource([first, { id: '2', status: 'done' }])
    controller.setSelectedRowKeys(['1'])

    controller.setDataSource([{ id: '2', status: 'done' }])
    expect(controller.getSelectedRows()).toEqual([first])

    const refreshed = { id: '1', status: 'done' }
    controller.setDataSource([refreshed])
    expect(controller.getSelectedRows()).toEqual([refreshed])
  })

  it('refreshes selected rows after reload without clearing the keys', async () => {
    const queryRequest = vi.fn(async () => ({
      data: [{ id: '1', status: 'pending' }],
      total: 1,
    }))
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
    })

    await controller.submitQuery()
    controller.setSelectedRowKeys(['1'])
    expect(controller.getSelectedRows()).toEqual([{ id: '1', status: 'pending' }])

    queryRequest.mockResolvedValueOnce({
      data: [{ id: '1', status: 'done' }],
      total: 1,
    })
    await controller.reload()

    expect(controller.getState().selectedRowKeys).toEqual(['1'])
    expect(controller.getSelectedRows()).toEqual([{ id: '1', status: 'done' }])
  })

  it('does not let stale table rows overwrite a patched selected row', () => {
    const controller = createProTableController<Row, Query>({
      rowKey: 'id',
    })
    controller.setDataSource([{ id: '1', status: 'pending' }])
    controller.setSelectedRowKeys(['1'])
    controller.patchRow('id', '1', { status: 'done' })
    controller.setSelectedRowKeys(['1'], [{ id: '1', status: 'pending' }])

    expect(controller.getSelectedRows()).toEqual([{ id: '1', status: 'done' }])
    expect(controller.getState().dataSource).toEqual([{ id: '1', status: 'done' }])
  })

  it('keeps patched selected rows when a later request is cancelled', async () => {
    let holdNextRequest = false
    const queryRequest = vi.fn(
      (_params: Query & { page: number; pageSize: number }, context: { signal: AbortSignal }) => {
        if (!holdNextRequest) {
          return Promise.resolve({
            data: [{ id: '1', status: 'pending' }],
            total: 1,
          })
        }

        return new Promise<{ data: Row[]; total: number }>((_resolve, reject) => {
          const fail = () => reject(createAbortError())
          if (context.signal.aborted) {
            fail()
            return
          }
          context.signal.addEventListener('abort', fail, { once: true })
        })
      },
    )
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
    })

    await controller.submitQuery()
    controller.setSelectedRowKeys(['1'])
    await controller.reload()
    controller.patchRow('id', '1', { status: 'done' })

    holdNextRequest = true
    const reloadPromise = controller.reload()
    cancelProTableControllerRequests(controller)
    await reloadPromise

    expect(controller.getState().selectedRowKeys).toEqual(['1'])
    expect(controller.getState().dataSource).toEqual([{ id: '1', status: 'done' }])
    expect(controller.getSelectedRows()).toEqual([{ id: '1', status: 'done' }])
  })

  it('records explicit setQuery keys until the overlay is consumed', () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      rowKey: 'id',
    })

    controller.setQuery({ status: 'open' })
    expect(consumeProTableQueryOverlay(controller)).toEqual({ status: 'open' })
    expect(consumeProTableQueryOverlay(controller)).toEqual({})
  })

  it('pins setQueryField and default-matching setQuery keys on the overlay', () => {
    type OverlayQuery = { status?: string; owner?: string }
    const controller = createProTableController<Row, OverlayQuery>({
      defaultQuery: { status: 'all' },
      rowKey: 'id',
    })

    controller.setQuery({ status: 'all' })
    controller.setQueryField('owner', 'Ada')
    expect(consumeProTableQueryOverlay(controller)).toEqual({
      status: 'all',
      owner: 'Ada',
    })
  })

  it('clears the query overlay on resetQuery', () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: { status: 'all' },
      rowKey: 'id',
    })

    controller.setQuery({ status: 'open' })
    controller.resetQuery()
    expect(consumeProTableQueryOverlay(controller)).toEqual({})
    expect(controller.getState().query).toEqual({ status: 'all' })
  })

  it('seeds selected keys at create and keeps them through the first query', async () => {
    const queryRequest = vi.fn(async () => ({
      data: [{ id: '1', status: 'pending' }],
      total: 1,
    }))
    const controller = createProTableController<Row, Query>({
      queryRequest,
      rowKey: 'id',
      defaultSelectedRowKeys: ['1'],
    })

    expect(controller.getState().selectedRowKeys).toEqual(['1'])
    await controller.submitQuery()
    expect(controller.getState().selectedRowKeys).toEqual(['1'])
    expect(controller.getSelectedRows()).toEqual([{ id: '1', status: 'pending' }])

    await controller.submitQuery()
    expect(controller.getState().selectedRowKeys).toEqual([])
  })

  it('seeds expanded keys at create', () => {
    const controller = createProTableController<Row, Query>({
      rowKey: 'id',
      defaultExpandedRowKeys: ['1'],
    })

    expect(controller.getState().expandedRowKeys).toEqual(['1'])
  })

  it('expands all rows once when the first non-empty data arrives', () => {
    type TreeRow = { id: string; status: string; children?: TreeRow[] }
    const controller = createProTableController<TreeRow, Query>({
      rowKey: 'id',
      defaultExpandAllRows: true,
      defaultExpandedRowKeys: ['2'],
    })

    controller.setDataSource([
      {
        id: '1',
        status: 'pending',
        children: [{ id: '1-1', status: 'done' }],
      },
      { id: '2', status: 'pending' },
    ])
    expect(controller.getState().expandedRowKeys).toEqual(['1'])

    controller.setDataSource([
      {
        id: '1',
        status: 'pending',
        children: [{ id: '1-1', status: 'done' }],
      },
      {
        id: '2',
        status: 'pending',
        children: [{ id: '2-1', status: 'done' }],
      },
    ])
    expect(controller.getState().expandedRowKeys).toEqual(['1'])
  })

  it('does not expand all after an explicit collapse before data arrives', () => {
    type TreeRow = { id: string; status: string; children?: TreeRow[] }
    const controller = createProTableController<TreeRow, Query>({
      rowKey: 'id',
      defaultExpandAllRows: true,
    })

    controller.collapseAllRows()
    controller.setDataSource([
      {
        id: '1',
        status: 'pending',
        children: [{ id: '1-1', status: 'done' }],
      },
    ])
    expect(controller.getState().expandedRowKeys).toEqual([])
  })

  it('expands all rows after the first list response', async () => {
    type TreeRow = { id: string; status: string; children?: TreeRow[] }
    const queryRequest = vi.fn(async () => ({
      data: [
        {
          id: '1',
          status: 'pending',
          children: [{ id: '1-1', status: 'done' }],
        },
      ],
      total: 1,
    }))
    const controller = createProTableController<TreeRow, Query>({
      queryRequest,
      rowKey: 'id',
      defaultExpandAllRows: true,
    })

    await controller.submitQuery()
    expect(controller.getState().expandedRowKeys).toEqual(['1'])
  })
})
