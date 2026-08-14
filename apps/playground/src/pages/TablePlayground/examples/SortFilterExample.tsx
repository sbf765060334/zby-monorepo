import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

const columns: TableColumnsType<OrderRecord> = [
  { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 180 },
  { title: '客户', dataIndex: 'customer', key: 'customer', width: 160 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    filters: [
      { text: '待处理', value: '待处理' },
      { text: '运输中', value: '运输中' },
      { text: '已完成', value: '已完成' },
    ],
    onFilter: (value, record) => record.status === value,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 140,
    sorter: (left, right) => left.amount - right.amount,
    render: (amount: number) => `¥ ${amount.toLocaleString('zh-CN')}`,
  },
]

export default function SortFilterExample() {
  return (
    <PlaygroundCase
      title="排序与筛选"
      description="状态列筛选、金额列排序沿用 AntD 6.5.3 行为。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={normalData}
        pagination={{ pageSize: 6, showSizeChanger: false }}
        scroll={{ x: 600 }}
      />
    </PlaygroundCase>
  )
}
