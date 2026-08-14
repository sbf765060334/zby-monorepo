import { useRouterPageSelector } from '@zby/router-core/react'
import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { virtualData } from '../data'
import type { OrderRecord } from '../data'

export default function VirtualFillTableExample() {
  const pageActive = useRouterPageSelector((state) => state.active)

  return (
    <PlaygroundCase
      title="虚拟 Fill"
      description="3,000 行数据；激活时填满容器，失活时由业务保持稳定的虚拟滚动高度。"
    >
      <div style={{ height: 420, minHeight: 0, overflow: 'hidden' }}>
        <Table<OrderRecord>
          rowKey="id"
          size="small"
          virtual
          height={pageActive ? '100%' : undefined}
          columnResize
          columns={contentColumns}
          dataSource={virtualData}
          pagination={false}
          scroll={{ x: 1290, y: pageActive ? undefined : 360 }}
        />
      </div>
    </PlaygroundCase>
  )
}
