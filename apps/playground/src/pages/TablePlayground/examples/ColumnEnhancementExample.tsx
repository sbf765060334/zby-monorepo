import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { longTextData } from '../data'
import type { OrderRecord } from '../data'

const enhanceColumns: TableColumnsType<OrderRecord> = [
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
      description="表头 tooltip 与原生 ellipsis；表体 copyable / renderText / ActionText 省略。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columnResize
        columns={enhanceColumns}
        dataSource={longTextData}
        pagination={false}
        scroll={{ x: 590 }}
      />
    </PlaygroundCase>
  )
}
