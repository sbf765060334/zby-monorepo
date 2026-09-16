import { App } from 'antd'
import {
  ProLayoutContentContainer,
  ProTable,
  type ProTableColumnType,
  type ProTableQueryRequest,
} from '@zby/pro'
import * as React from 'react'

type OrderStatus = 'pending' | 'shipping' | 'done'
type OrderPriority = 'low' | 'normal' | 'high'
type OrderLabel = 'east' | 'urgent' | 'bonded'

type PlaygroundRow = {
  id: string
  orderNo: string
  customer: string
  status: OrderStatus
  priority: OrderPriority
  labels: OrderLabel[]
  amount: number
  rate: number | undefined
  quantity: number
  progress: number
  urgent: boolean
  owner: string
  warehouse: string
  route: string
  destination: string
  createdAt: string
  dateValue: string
  weekValue: string
  monthValue: string
  yearValue: string
  sku: string
  payload: { warehouse: string; route: string }
  note: string
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
const PRIORITIES: OrderPriority[] = ['low', 'normal', 'high']
const LABEL_SETS: OrderLabel[][] = [['east'], ['east', 'urgent'], ['bonded'], ['urgent', 'bonded']]

const ALL_ROWS: PlaygroundRow[] = Array.from({ length: 48 }, (_, index) => {
  const id = index + 1
  const owner = OWNERS[index % OWNERS.length]
  const warehouse = WAREHOUSES[index % WAREHOUSES.length]
  const route = ROUTES[index % ROUTES.length]
  const createdAt = `2026-08-${String((index % 28) + 1).padStart(2, '0')} 10:30`
  return {
    id: String(id),
    orderNo: `ZBY-${String(id).padStart(6, '0')}`,
    customer: CUSTOMERS[index % CUSTOMERS.length],
    status: STATUSES[index % STATUSES.length],
    priority: PRIORITIES[index % PRIORITIES.length],
    labels: LABEL_SETS[index % LABEL_SETS.length],
    amount: 1280 + ((index * 137) % 48000),
    rate: index % 11 === 0 ? undefined : Number((18 + ((index * 7) % 80) + index / 10).toFixed(1)),
    quantity: 12 + ((index * 3) % 480),
    progress: (index * 13) % 101,
    urgent: index % 5 === 0,
    owner,
    warehouse,
    route,
    destination: DESTINATIONS[index % DESTINATIONS.length],
    createdAt,
    dateValue: createdAt,
    weekValue: createdAt,
    monthValue: createdAt,
    yearValue: createdAt,
    sku: index % 9 === 0 ? '' : `SKU-${String(id).padStart(4, '0')}`,
    payload: { warehouse, route },
    note: index % 3 === 0 ? '第一行备注\n第二行换行' : '',
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
    key: 'serial',
    title: '序号',
    width: 64,
    valueType: 'index',
  },
  {
    key: 'indexBorder',
    title: '序号(边框)',
    width: 88,
    valueType: 'indexBorder',
  },
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
    title: '状态 Tag',
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
    key: 'priority',
    title: '优先级',
    dataIndex: 'priority',
    width: 130,
    valueEnum: {
      low: { text: '低', status: 'default' },
      normal: { text: '中', status: 'processing' },
      high: { text: '高', status: 'error' },
    },
  },
  {
    key: 'labels',
    title: '标签 Enum[]',
    dataIndex: 'labels',
    width: 160,
    valueEnum: {
      east: { text: '华东', color: 'blue' },
      urgent: { text: '加急', color: 'red' },
      bonded: { text: '保税', color: 'gold' },
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
    key: 'rate',
    title: '完成率',
    dataIndex: 'rate',
    width: 110,
    align: 'right',
    valueType: { type: 'percent', precision: 1, showColor: true },
  },
  {
    key: 'quantity',
    title: '件数 Digit',
    dataIndex: 'quantity',
    width: 110,
    align: 'right',
    valueType: 'digit',
    fieldProps: { precision: 0 },
  },
  {
    key: 'progress',
    title: '进度',
    dataIndex: 'progress',
    width: 160,
    valueType: 'progress',
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
    width: 150,
    valueEnum: {
      张敏: '张敏 / 运营',
      李想: '李想 / 调度',
      周宁: '周宁 / 仓储',
      王雪: '王雪 / 客服',
      陈舟: '陈舟 / 关务',
    },
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
    valueType: 'dateTime',
  },
  {
    key: 'dateValue',
    title: '日期',
    dataIndex: 'dateValue',
    width: 120,
    valueType: 'date',
  },
  {
    key: 'weekValue',
    title: '周',
    dataIndex: 'weekValue',
    width: 110,
    valueType: 'week',
  },
  {
    key: 'monthValue',
    title: '月',
    dataIndex: 'monthValue',
    width: 100,
    valueType: 'month',
  },
  {
    key: 'yearValue',
    title: '年',
    dataIndex: 'yearValue',
    width: 88,
    valueType: 'year',
  },
  {
    key: 'sku',
    title: 'SKU Code',
    dataIndex: 'sku',
    width: 120,
    valueType: 'code',
  },
  {
    key: 'payload',
    title: 'JSON',
    dataIndex: 'payload',
    width: 220,
    valueType: 'jsonCode',
  },
  {
    key: 'note',
    title: '多行文本',
    dataIndex: 'note',
    width: 160,
    valueType: 'textarea',
  },
  {
    key: 'remark',
    title: '备注',
    dataIndex: 'remark',
    width: 120,
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
