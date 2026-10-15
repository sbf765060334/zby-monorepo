import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { longTextData } from '../data'
import type { OrderRecord } from '../data'

const bodyEllipsisColumns: TableColumnsType<OrderRecord> = [
  {
    title: '客户名称（含集团全称及备注信息）',
    dataIndex: 'customer',
    key: 'ellipsis-true',
    width: 160,
    copyable: true,
    ellipsis: true,
  },
  {
    title: '单行省略',
    dataIndex: 'address',
    key: 'ellipsis-single',
    width: 180,
    ellipsis: true,
  },
  {
    title: '关闭表体提示',
    dataIndex: 'address',
    key: 'ellipsis-no-tooltip',
    width: 180,
    ellipsis: { showTitle: false },
  },
]

export default function ColumnBodyEllipsisExample() {
  return (
    <PlaygroundCase
      title="表体省略"
      description="收窄列宽后表头和表体都走原生单行省略。悬停「关闭表体提示」列不应出现 title。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columnResize
        columns={bodyEllipsisColumns}
        dataSource={longTextData}
        pagination={false}
        scroll={{ x: 520 }}
      />
    </PlaygroundCase>
  )
}
