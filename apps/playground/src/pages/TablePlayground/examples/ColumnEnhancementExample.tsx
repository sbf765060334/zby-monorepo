import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

const columns: TableColumnsType<OrderRecord> = [
  {
    title: '订单号',
    dataIndex: 'orderNo',
    key: 'orderNo',
    width: 190,
    tooltip: '业务系统中的唯一订单标识',
    copyable: true,
  },
  {
    title: '客户',
    dataIndex: 'customer',
    key: 'customer',
    width: 220,
    renderText: (value) => `客户：${String(value)}`,
    ellipsis: { rows: 1, tooltip: true },
  },
  {
    title: '目的地',
    dataIndex: 'address',
    key: 'address',
    width: 180,
    ellipsis: { rows: 1, tooltip: true },
  },
]

export default function ColumnEnhancementExample() {
  return (
    <PlaygroundCase
      title="列增强"
      description="展示 tooltip、renderText、copyable 与多行 ellipsis 扩展。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columnResize
        columns={columns}
        dataSource={normalData.slice(0, 5)}
        pagination={false}
        scroll={{ x: 590 }}
      />
    </PlaygroundCase>
  )
}
