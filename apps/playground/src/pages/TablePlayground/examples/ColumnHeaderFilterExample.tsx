import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'
import { Tag } from 'antd'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { longTextData } from '../data'
import type { OrderRecord } from '../data'

const renderEllipsisColumns: TableColumnsType<OrderRecord> = [
  {
    title: '自定义渲染（表头仍省略）',
    dataIndex: 'status',
    key: 'custom-render',
    width: 140,
    ellipsis: true,
    copyable: true,
    render: (status: OrderRecord['status']) => <Tag>{status}</Tag>,
  },
  {
    title: '排序列标题也很长用来观察表头限制',
    dataIndex: 'customer',
    key: 'sorter-ellipsis',
    width: 180,
    ellipsis: true,
    sorter: (left, right) => left.customer.localeCompare(right.customer, 'zh-CN'),
  },
  {
    title: '筛选列标题也很长用来观察表头限制',
    dataIndex: 'status',
    key: 'filter-ellipsis',
    width: 180,
    ellipsis: true,
    filters: [
      { text: '待处理', value: '待处理' },
      { text: '运输中', value: '运输中' },
      { text: '已完成', value: '已完成' },
    ],
    onFilter: (value, record) => record.status === value,
  },
]

export default function ColumnHeaderFilterExample() {
  return (
    <PlaygroundCase
      title="自定义 render 与表头排序筛选"
      description="第一列表体是 Tag，不会包 ActionText。后两列与 sorter / filter 同时开启，表头省略受 AntD 图标布局限制。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columnResize
        columns={renderEllipsisColumns}
        dataSource={longTextData}
        pagination={false}
        scroll={{ x: 500 }}
      />
    </PlaygroundCase>
  )
}
