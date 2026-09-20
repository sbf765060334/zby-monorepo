import { describe, expect, it, vi } from 'vitest'

import { createProTableController } from '..'

type Row = { id: string; status: string }
type Query = { status?: string; page: number; pageSize: number }

describe('createProTableController', () => {
  it('submits queries and exposes the resulting table state', async () => {
    const queryRequest = vi.fn(async (query: Query) => ({
      data: [{ id: String(query.page), status: query.status ?? 'all' }],
      total: 1,
    }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { page: 1, pageSize: 10 },
      queryRequest,
      rowKey: 'id',
    })

    controller.setQueryField('status', 'pending')
    await controller.submitQuery()

    expect(queryRequest).toHaveBeenCalledWith(
      { status: 'pending', page: 1, pageSize: 10 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(controller.getState()).toMatchObject({
      committedQuery: { status: 'pending', page: 1, pageSize: 10 },
      dataSource: [{ id: '1', status: 'pending' }],
      total: 1,
      loading: false,
      inquired: true,
    })
  })

  it('configure updates the request wiring without resetting the current query', async () => {
    const queryRequest = vi.fn(async (query: Query) => ({
      data: [{ id: String(query.page), status: query.status ?? 'all' }],
      total: 20,
    }))
    const nextQueryRequest = vi.fn(async (query: Query) => ({
      data: [{ id: String(query.page), status: query.status ?? 'all' }],
      total: 20,
    }))
    const controller = createProTableController<Row, Query>({
      defaultQuery: { page: 1, pageSize: 10 },
      queryRequest,
      rowKey: 'id',
    })

    await controller.submitQuery()
    await controller.setPage(2)
    controller.setQueryField('status', 'pending')

    controller.configure({
      defaultQuery: { page: 1, pageSize: 10 },
      queryRequest: nextQueryRequest,
    })

    expect(controller.getState()).toMatchObject({
      query: { status: 'pending', page: 2, pageSize: 10 },
      committedQuery: { page: 2, pageSize: 10 },
      defaultQuery: { page: 1, pageSize: 10 },
      currentPage: 2,
    })

    await controller.reload()
    expect(nextQueryRequest).toHaveBeenCalledWith(
      { page: 2, pageSize: 10 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(queryRequest).toHaveBeenCalledTimes(2)
  })

  it('resetQuery applies the latest defaultQuery from configure', () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: { page: 1, pageSize: 10, status: 'all' },
      rowKey: 'id',
    })

    controller.setQueryField('status', 'pending')
    controller.configure({
      defaultQuery: { page: 1, pageSize: 10, status: 'done' },
    })

    expect(controller.getState().query.status).toBe('pending')
    controller.resetQuery()
    expect(controller.getState().query).toEqual({ page: 1, pageSize: 10, status: 'done' })
  })

  it('keeps selected rows and supports row patching', () => {
    const controller = createProTableController<Row, Query>({
      defaultQuery: { page: 1, pageSize: 10 },
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
