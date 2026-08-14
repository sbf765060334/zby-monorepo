import { Table } from '@zby/ui'
import type { Key } from 'react'
import * as React from 'react'

import {
  PlaygroundCase,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function ControlledHighlightExample() {
  const [currentRowKey, setCurrentRowKey] = React.useState<Key | null>(2)

  return (
    <PlaygroundCase
      title="受控行高亮"
      description="对象模式由实例维护 currentRowKey 与 onChange。"
    >
      <PlaygroundStatus label="当前行">
        {currentRowKey === null ? '未选择' : String(currentRowKey)}
      </PlaygroundStatus>
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        rowHighlight={{
          currentRowKey,
          onChange: (key) => setCurrentRowKey(key),
        }}
        columns={contentColumns.slice(0, 5)}
        dataSource={normalData.slice(0, 6)}
        pagination={false}
        scroll={{ x: 730 }}
      />
    </PlaygroundCase>
  )
}
