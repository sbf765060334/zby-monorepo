import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function StickyHeaderExample() {
  return (
    <PlaygroundCase
      title="表头吸顶"
      description="在卡片内滚动时表头保持可见，沿用 AntD sticky。"
    >
      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        <Table<OrderRecord>
          rowKey="id"
          size="small"
          sticky
          columns={contentColumns.slice(0, 5)}
          dataSource={normalData}
          pagination={false}
          scroll={{ x: 730 }}
        />
      </div>
    </PlaygroundCase>
  )
}
