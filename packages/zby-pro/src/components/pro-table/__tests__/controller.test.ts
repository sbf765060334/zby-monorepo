import { describe, expect, it, vi } from 'vitest'

import { createProTableController } from '..'

type Row = { id: string; status: string }
type Query = { status?: string }

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

    await controller.setSort('amount', 'ascend')
    expect(controller.getState()).toMatchObject({
      query: { status: 'done' },
      committedQuery: { status: 'pending' },
      currentPage: 1,
      sortField: 'amount',
      sortOrder: 'ascend',
      latestParams: {
        status: 'pending',
        page: 1,
        pageSize: 10,
        sortBy: 'amount',
        sortOrder: 'ascend',
      },
    })
    expect(controller.getRequestParams()).toEqual({
      status: 'pending',
      page: 1,
      pageSize: 10,
      sortBy: 'amount',
      sortOrder: 'ascend',
    })
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

    expect(controller.getSelectedRows()).toEqual([{ id: '1', status: 'pending' }])
    expect(controller.getState().dataSource).toEqual([
      { id: '1', status: 'done' },
      { id: '2', status: 'done' },
    ])
  })
})
