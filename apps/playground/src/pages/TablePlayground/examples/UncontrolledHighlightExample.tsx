import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function UncontrolledHighlightExample() {
  return (
    <PlaygroundCase
      title="非受控行高亮"
      description="rowHighlight=true；点击行切换当前高亮，再次点击清除。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        rowHighlight
        columns={contentColumns.slice(0, 5)}
        dataSource={normalData.slice(0, 6)}
        pagination={false}
        scroll={{ x: 730 }}
      />
    </PlaygroundCase>
  )
}
