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
    copyable: true,
  },
  {
    title: '固定文案',
    dataIndex: 'status',
    key: 'fixed-copy',
    width: 140,
    copyable: { text: '已审核' },
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 160,
    align: 'right',
    renderText: (value) => `¥ ${Number(value).toLocaleString('zh-CN')}`,
    copyable: {
      text: (_value, record, index) => `${index + 1}-${record.orderNo}-${record.amount}`,
      tooltips: ['复制金额', '已复制'],
    },
  },
]

export default function CopyableConfigExample() {
  return (
    <PlaygroundCase
      title="复制配置"
      description="布尔值复制显示文本；对象可指定 text、tooltips。行 hover 时显示复制按钮。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={normalData.slice(0, 5)}
        pagination={false}
        scroll={{ x: 490 }}
      />
    </PlaygroundCase>
  )
}
