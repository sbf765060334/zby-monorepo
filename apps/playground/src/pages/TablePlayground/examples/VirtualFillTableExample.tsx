import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { virtualData } from '../data'
import type { OrderRecord } from '../data'

export default function VirtualFillTableExample() {
  return (
    <PlaygroundCase
      title="虚拟 Fill"
      description="3,000 行数据填满容器；祖先被隐藏时保持上次有效的虚拟滚动高度。"
    >
      <div style={{ height: 420, minHeight: 0, overflow: 'hidden' }}>
        <Table<OrderRecord>
          rowKey="id"
          size="small"
          virtual
          height="100%"
          columnResize
          columns={contentColumns}
          dataSource={virtualData}
          pagination={false}
          scroll={{ x: 1290 }}
        />
      </div>
    </PlaygroundCase>
  )
}
