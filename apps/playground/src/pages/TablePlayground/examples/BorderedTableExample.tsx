import { Table } from '@zby/ui'
import { Button, Space } from 'antd'
import * as React from 'react'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function BorderedTableExample() {
  const [bordered, setBordered] = React.useState(false)

  return (
    <PlaygroundCase
      title="边框"
      description="开关只更新当前实例，不影响页面中的其他表格。"
    >
      <Space>
        <Button
          type={bordered ? 'primary' : 'default'}
          aria-pressed={bordered}
          onClick={() => setBordered((value) => !value)}
        >
          bordered：{bordered ? '开启' : '关闭'}
        </Button>
      </Space>
      <Table<OrderRecord>
        rowKey="id"
        bordered={bordered}
        size="small"
        columns={contentColumns.slice(0, 5)}
        dataSource={normalData.slice(0, 4)}
        pagination={false}
        scroll={{ x: 730 }}
      />
    </PlaygroundCase>
  )
}
