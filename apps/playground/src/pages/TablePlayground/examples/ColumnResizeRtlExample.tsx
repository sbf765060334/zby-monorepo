import { Table } from '@zby/ui'
import { ConfigProvider } from 'antd'
import * as React from 'react'

import {
  PlaygroundCase,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function ColumnResizeRtlExample() {
  const [lastRtlResize, setLastRtlResize] = React.useState(
    'RTL 下手柄在左侧，向外拖动加宽',
  )

  return (
    <PlaygroundCase
      title="列宽拖拽（RTL）"
      description="阿拉伯语等 RTL 场景下手柄在单元格起始侧，向外拖动加宽。"
    >
      <PlaygroundStatus label="RTL 拖拽状态">{lastRtlResize}</PlaygroundStatus>
      <ConfigProvider direction="rtl">
        <Table<OrderRecord>
          rowKey="id"
          size="small"
          columnResize={{
            onResizeEnd: ({ key, width }) => {
              setLastRtlResize(`列 ${String(key)} 调整为 ${Math.round(width)}px`)
            },
          }}
          columns={contentColumns}
          dataSource={normalData.slice(0, 8)}
          pagination={false}
          scroll={{ x: 1290, y: 320 }}
        />
      </ConfigProvider>
    </PlaygroundCase>
  )
}
