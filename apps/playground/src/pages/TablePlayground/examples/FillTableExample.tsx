import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { fillData } from '../data'
import type { OrderRecord } from '../data'

export default function FillTableExample() {
  return (
    <PlaygroundCase
      title="普通 Fill"
      description="3 行数据放入高容器，观察少量内容下的填充布局。"
    >
      <div style={{ height: 420, minHeight: 0, overflow: 'hidden' }}>
        <Table<OrderRecord>
          rowKey="id"
          size="small"
          height="100%"
          columnResize
          columns={contentColumns}
          dataSource={fillData}
          pagination={false}
          scroll={{ x: 1290 }}
        />
      </div>
    </PlaygroundCase>
  )
}
