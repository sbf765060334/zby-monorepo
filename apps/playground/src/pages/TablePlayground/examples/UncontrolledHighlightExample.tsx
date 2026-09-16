import { Table } from '@zby/ui'
import { Button } from 'antd'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function UncontrolledHighlightExample() {
  return (
    <PlaygroundCase
      title="非受控行高亮"
      description="点击单元格文字切换高亮；操作列按钮不会切换当前行。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        rowHighlight
        columns={[
          ...contentColumns.slice(0, 5),
          {
            key: 'action',
            title: '操作',
            width: 90,
            render: () => <Button size="small">编辑</Button>,
          },
        ]}
        dataSource={normalData.slice(0, 6)}
        pagination={false}
        scroll={{ x: 820 }}
      />
    </PlaygroundCase>
  )
}
