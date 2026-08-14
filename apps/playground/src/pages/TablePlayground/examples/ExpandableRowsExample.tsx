import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { treeData } from '../data'
import type { TreeOrderRecord } from '../data'

export default function ExpandableRowsExample() {
  return (
    <PlaygroundCase
      title="树形展开"
      description="children 数据、选择列与展开图标沿用 AntD 原生语义。"
    >
      <Table<TreeOrderRecord>
        rowKey="id"
        size="small"
        rowSelection={{}}
        columns={contentColumns.slice(0, 5)}
        dataSource={treeData}
        pagination={false}
        scroll={{ x: 730, y: 320 }}
      />
    </PlaygroundCase>
  )
}
