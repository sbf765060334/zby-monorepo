import { useRouterPageSelector } from '@zby/router-core/react'
import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { virtualData } from '../data'
import type { OrderRecord } from '../data'

export default function VirtualFillTableExample() {
  const layoutActive = useRouterPageSelector((state) => state.active)

  return (
    <PlaygroundCase
      title="虚拟 Fill"
      description="3,000 行数据；页签失活时冻结最后有效高度，恢复后重新测量。"
    >
      <div style={{ height: 420, minHeight: 0, overflow: 'hidden' }}>
        <Table<OrderRecord>
          rowKey="id"
          size="small"
          virtual
          heightMode="fill"
          layoutActive={layoutActive}
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
