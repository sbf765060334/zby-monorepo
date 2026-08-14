import { Table } from '@zby/ui'
import * as React from 'react'

import {
  PlaygroundCase,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function ColumnResizeExample() {
  const [lastResize, setLastResize] = React.useState('拖动表头右侧分隔线')

  return (
    <PlaygroundCase
      title="列宽拖拽"
      description="展示最小/最大宽度限制与拖拽结束事件。"
    >
      <PlaygroundStatus label="拖拽状态">{lastResize}</PlaygroundStatus>
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columnResize={{
          onResizeEnd: ({ key, width }) => {
            setLastResize(`列 ${String(key)} 调整为 ${Math.round(width)}px`)
          },
        }}
        columns={contentColumns}
        dataSource={normalData.slice(0, 8)}
        pagination={false}
        scroll={{ x: 1290, y: 300 }}
      />
    </PlaygroundCase>
  )
}
