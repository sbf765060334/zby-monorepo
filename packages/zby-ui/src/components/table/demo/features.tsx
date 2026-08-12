import * as React from 'react'

import Table from '..'
import type { ColumnsType } from '../interface'

interface DemoRecord {
  key: number
  name: string
  status: string
}

const columns: ColumnsType<DemoRecord> = [
  { title: 'Name', dataIndex: 'name', width: 180, minWidth: 120 },
  { title: 'Status', dataIndex: 'status', width: 160 },
]

const data: DemoRecord[] = [
  { key: 1, name: 'Alpha', status: 'Processing' },
  { key: 2, name: 'Beta', status: 'Done' },
]

export default function TableFeaturesDemo() {
  const [lastWidth, setLastWidth] = React.useState<number>()

  return (
    <div style={{ height: 360 }}>
      <Table<DemoRecord>
        rowKey="key"
        columns={columns}
        dataSource={data}
        pagination={false}
        heightMode="fill"
        columnResize={{ onResize: ({ width }) => setLastWidth(width) }}
        footer={() =>
          lastWidth === undefined ? 'Drag a column edge' : `Width: ${lastWidth}px`
        }
      />
    </div>
  )
}
