import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function FillPaginationExample() {
  return (
    <PlaygroundCase
      title="Fill + 分页"
      description="填充高度会扣掉分页器；切换每页条数后表体重新测量。"
    >
      <div style={{ height: 420, minHeight: 0, overflow: 'hidden' }}>
        <Table<OrderRecord>
          rowKey="id"
          size="small"
          height="100%"
          columnResize
          columns={contentColumns}
          dataSource={normalData}
          pagination={{ pageSize: 6, showSizeChanger: true }}
          scroll={{ x: 1290 }}
        />
      </div>
    </PlaygroundCase>
  )
}
