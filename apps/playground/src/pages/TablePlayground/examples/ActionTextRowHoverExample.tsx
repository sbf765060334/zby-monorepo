import { ActionText, Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { longTextData } from '../data'
import type { OrderRecord } from '../data'

const columns: TableColumnsType<OrderRecord> = [
  {
    title: '订单号',
    dataIndex: 'orderNo',
    key: 'orderNo',
    width: 180,
    copyable: true,
  },
  {
    title: '客户',
    dataIndex: 'customer',
    key: 'customer',
    width: 280,
    render: (value: OrderRecord['customer']) => (
      <ActionText ellipsis copyable actionsVisibleOn="table-row-hover">
        {value}
      </ActionText>
    ),
  },
  {
    title: '地址',
    dataIndex: 'address',
    key: 'address',
    ellipsis: true,
  },
]

export default function ActionTextRowHoverExample() {
  return (
    <PlaygroundCase
      title="自定义单元格跟随行悬停"
      description="订单号使用列 copyable。客户列在 render 里用 ActionText，并设置 table-row-hover。悬停一行时，两列的复制按钮一起出现。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={longTextData}
        pagination={false}
        scroll={{ x: 720 }}
      />
    </PlaygroundCase>
  )
}
