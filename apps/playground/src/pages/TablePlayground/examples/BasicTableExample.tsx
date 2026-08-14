import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function BasicTableExample() {
  return (
    <PlaygroundCase
      title="普通渲染"
      description="18 行数据，分页与列宽拖拽在实例内工作。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columnResize
        columns={contentColumns}
        dataSource={normalData}
        pagination={{ pageSize: 6, showSizeChanger: false }}
        scroll={{ x: 1290 }}
      />
    </PlaygroundCase>
  )
}
