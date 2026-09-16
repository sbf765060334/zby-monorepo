import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { virtualData } from '../data'
import type { OrderRecord } from '../data'

const GROUP_SIZE = 12

const columns: TableColumnsType<OrderRecord> = [
  {
    title: '批次',
    dataIndex: 'id',
    key: 'batch',
    width: 120,
    onCell: (_, index) => ({
      rowSpan: index % GROUP_SIZE === 0 ? GROUP_SIZE : 0,
    }),
    render: (_, __, index) => `批次 ${Math.floor(index / GROUP_SIZE) + 1}`,
  },
  { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 190 },
  { title: '客户', dataIndex: 'customer', key: 'customer', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '目的地', dataIndex: 'address', key: 'address', width: 240 },
]

export default function VirtualRowSpanExample() {
  return (
    <PlaygroundCase
      title="虚拟 rowSpan"
      description="用 onCell 提供 rowSpan；滚动跨过合并起始行时仍保留 origin 并补偿高度。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        virtual
        columns={columns}
        dataSource={virtualData.slice(0, 240)}
        pagination={false}
        scroll={{ x: 850, y: 320 }}
      />
    </PlaygroundCase>
  )
}
