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

export default function RowSelectionExample() {
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<Key[]>([1])

  return (
    <PlaygroundCase
      title="行选择"
      description="AntD rowSelection 与 ZBY 当前行高亮相互独立。"
    >
      <PlaygroundStatus label="已选择">
        {selectedRowKeys.join(', ') || '无'}
      </PlaygroundStatus>
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        rowHighlight
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        columns={contentColumns.slice(0, 5)}
        dataSource={normalData.slice(0, 6)}
        pagination={false}
        scroll={{ x: 730 }}
      />
    </PlaygroundCase>
  )
}
