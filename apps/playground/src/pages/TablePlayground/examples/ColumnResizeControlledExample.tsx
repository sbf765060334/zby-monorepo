import { Table } from '@zby/ui'
import type { ColumnResizeWidths } from '@zby/ui'
import * as React from 'react'

import {
  PlaygroundCase,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function ColumnResizeControlledExample() {
  const [widths, setWidths] = React.useState<ColumnResizeWidths>({
    orderNo: 190,
    customer: 180,
  })

  return (
    <PlaygroundCase
      title="受控列宽"
      description="widths / onWidthsChange 由实例持有，松手后提交映射。"
    >
      <PlaygroundStatus label="列宽">
        {`orderNo ${Math.round(Number(widths.orderNo) || 0)} / customer ${Math.round(Number(widths.customer) || 0)}`}
      </PlaygroundStatus>
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columnResize={{
          widths,
          onWidthsChange: setWidths,
        }}
        columns={contentColumns}
        dataSource={normalData.slice(0, 8)}
        pagination={false}
        scroll={{ x: 1290, y: 320 }}
      />
    </PlaygroundCase>
  )
}
