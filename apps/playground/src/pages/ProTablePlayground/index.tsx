import { App } from 'antd'
import {
  ProLayoutContentContainer,
  ProTable,
  type ProTableColumnType,
  type ProTableQueryRequest,
} from '@zby/pro'
import * as React from 'react'

type OrderStatus = 'pending' | 'shipping' | 'done'

type PlaygroundRow = {
  id: string
  orderNo: string
  customer: string
  status: OrderStatus
  amount: number
  urgent: boolean
  owner: string
  warehouse: string
  route: string
  destination: string
  createdAt: string
  remark: string
}

type PlaygroundQuery = {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'ascend' | 'descend'
}

const OWNERS = ['张敏', '李想', '周宁', '王雪', '陈舟']
const CUSTOMERS = ['星河贸易', '北辰物流', '青云供应链', '远航进出口', '临港仓储']
const WAREHOUSES = ['上海仓', '杭州仓', '苏州仓', '宁波仓']
const ROUTES = ['华东干线', '沿海快运', '跨境陆运', '城配循环']
const DESTINATIONS = ['上海市浦东新区', '杭州市余杭区', '苏州市工业园区', '宁波市北仑区']
const STATUSES: OrderStatus[] = ['pending', 'shipping', 'done']

const ALL_ROWS: PlaygroundRow[] = Array.from({ length: 48 }, (_, index) => {
  const id = index + 1
  return {
    id: String(id),
    orderNo: `ZBY-${String(id).padStart(6, '0')}`,
    customer: CUSTOMERS[index % CUSTOMERS.length],
    status: STATUSES[index % STATUSES.length],
    amount: 1280 + ((index * 137) % 48000),
    urgent: index % 5 === 0,
    owner: OWNERS[index % OWNERS.length],
    warehouse: WAREHOUSES[index % WAREHOUSES.length],
    route: ROUTES[index % ROUTES.length],
    destination: DESTINATIONS[index % DESTINATIONS.length],
    createdAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')} 10:30`,
    remark: index % 4 === 0 ? '优先出库' : '',
  }
})

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

const queryOrders: ProTableQueryRequest<PlaygroundRow, PlaygroundQuery> = async (query) => {
  await wait(3000)

  const rows = ALL_ROWS.slice()
  if (query.sortBy && query.sortOrder) {
    const direction = query.sortOrder === 'ascend' ? 1 : -1
    const key = query.sortBy as keyof PlaygroundRow
    rows.sort((left, right) => {
      const leftValue = left[key]
      const rightValue = right[key]
      if (leftValue === rightValue) return 0
      return leftValue > rightValue ? direction : -direction
    })
  }

  const page = query.page || 1
  const pageSize = query.pageSize || 5
  const start = (page - 1) * pageSize

  return {
    data: rows.slice(start, start + pageSize),
    total: rows.length,
  }
}

const columns: ProTableColumnType<PlaygroundRow>[] = [
  {
    key: 'id',
    title: 'ID',
    dataIndex: 'id',
    width: 88,
    fixed: 'left',
    sorter: true,
  },
  {
    key: 'orderNo',
    title: '订单号',
    dataIndex: 'orderNo',
    width: 160,
    sorter: true,
  },
  {
    key: 'customer',
    title: '客户',
    dataIndex: 'customer',
    width: 160,
  },
  {
    key: 'status',
    title: '状态',
    dataIndex: 'status',
    width: 120,
    valueType: 'tag',
    valueEnum: {
      pending: { text: '待处理', color: 'warning' },
      shipping: { text: '运输中', color: 'processing' },
      done: { text: '已完成', color: 'success' },
    },
  },
  {
    key: 'amount',
    title: '金额',
    dataIndex: 'amount',
    width: 140,
    align: 'right',
    sorter: true,
    valueType: { type: 'money', currency: 'CNY' },
  },
  {
    key: 'urgent',
    title: '加急',
    dataIndex: 'urgent',
    width: 88,
    valueType: 'boolean',
  },
  {
    key: 'owner',
    title: '负责人',
    dataIndex: 'owner',
    width: 120,
  },
  {
    key: 'logistics',
    title: '物流信息',
    children: [
      {
        key: 'warehouse',
        title: '仓库',
        dataIndex: 'warehouse',
        width: 120,
      },
      {
        key: 'route',
        title: '线路',
        dataIndex: 'route',
        width: 140,
      },
      {
        key: 'destination',
        title: '目的地',
        dataIndex: 'destination',
        width: 180,
      },
    ],
  },
  {
    key: 'createdAt',
    title: '创建时间',
    dataIndex: 'createdAt',
    width: 180,
    sorter: true,
  },
  {
    key: 'remark',
    title: '备注',
    dataIndex: 'remark',
    width: 160,
    fieldConfig: {
      defaultPreference: { visible: false },
    },
  },
]

export default function ProTablePlayground() {
  const { message } = App.useApp()
  const queryRequest = React.useCallback<ProTableQueryRequest<PlaygroundRow, PlaygroundQuery>>(
    (query) => queryOrders(query),
    [],
  )

  return (
    <ProLayoutContentContainer mode="fill" itemBodyPadding={false}>
      <ProTable<PlaygroundRow, PlaygroundQuery>
        rowKey="id"
        heightMode="fill"
        persistenceKey="playground-pro-table"
        defaultQuery={{ page: 1, pageSize: 10 }}
        queryRequest={queryRequest}
        columns={columns}
        views={{}}
        columnsState={{}}
        columnResize
        fullscreen
        rowSelection={{}}
        rowHighlight
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        toolbar={{
          actionItems: [
            {
              key: 'create',
              type: 'primary',
              label: '新建订单',
              onClick: () => {
                void message.success('模拟新建订单')
              },
            },
            {
              key: 'export',
              label: '导出',
              onClick: () => {
                void message.success('模拟导出')
              },
            },
          ],
        }}
        actionColumn={{
          actions: ({ record }) => [
            {
              key: 'view',
              label: '查看',
              onClick: () => {
                void message.info(`查看 ${record.orderNo}`)
              },
            },
            {
              key: 'edit',
              label: '编辑',
              onClick: () => {
                void message.info(`编辑 ${record.orderNo}`)
              },
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              popconfirm: {
                title: `确定删除 ${record.orderNo} 吗？`,
                onConfirm: () => {
                  void message.success(`已模拟删除 ${record.orderNo}`)
                },
              },
            },
          ],
        }}
        style={{ flex: 1, minHeight: 0 }}
      />
    </ProLayoutContentContainer>
  )
}
