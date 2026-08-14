import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { virtualData } from '../data'
import type { OrderRecord } from '../data'

export default function VirtualTableExample() {
  return (
    <PlaygroundCase
      title="虚拟渲染"
      description="3,000 行数据，固定 320px viewport，支持列宽拖拽。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        virtual
        columnResize
        columns={contentColumns}
        dataSource={virtualData}
        pagination={false}
        scroll={{ x: 1290, y: 320 }}
      />
    </PlaygroundCase>
  )
}
