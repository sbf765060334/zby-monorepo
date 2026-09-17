import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { tableColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function FixedColumnsExample() {
  return (
    <PlaygroundCase
      title="固定列"
      description="ID 固定在左侧，目的地固定在右侧。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columnResize
        columns={tableColumns}
        dataSource={normalData.slice(0, 8)}
        pagination={false}
        scroll={{ x: 1290, y: 320 }}
      />
    </PlaygroundCase>
  )
}
