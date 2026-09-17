import { Table } from '@zby/ui'
import { Segmented } from 'antd'
import * as React from 'react'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

type TableSize = 'large' | 'middle' | 'small'

export default function SizeExample() {
  const [size, setSize] = React.useState<TableSize>('small')

  return (
    <PlaygroundCase
      title="尺寸"
      description="large / middle / small 只作用于当前实例。"
    >
      <Segmented<TableSize>
        value={size}
        options={[
          { label: 'large', value: 'large' },
          { label: 'middle', value: 'middle' },
          { label: 'small', value: 'small' },
        ]}
        onChange={setSize}
      />
      <Table<OrderRecord>
        rowKey="id"
        size={size}
        columns={contentColumns.slice(0, 5)}
        dataSource={normalData.slice(0, 5)}
        pagination={false}
        scroll={{ x: 730 }}
      />
    </PlaygroundCase>
  )
}
