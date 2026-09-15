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
