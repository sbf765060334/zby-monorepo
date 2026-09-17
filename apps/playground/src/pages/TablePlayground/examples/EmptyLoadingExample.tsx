import { Table } from '@zby/ui'
import { Space, Switch } from 'antd'
import * as React from 'react'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

export default function EmptyLoadingExample() {
  const [loading, setLoading] = React.useState(false)
  const [empty, setEmpty] = React.useState(false)

  return (
    <PlaygroundCase
      title="空态与加载"
      description="loading 与空数据互不影响其他实例。"
    >
      <Space wrap>
        <Switch
          checked={loading}
          onChange={setLoading}
          checkedChildren="加载中"
          unCheckedChildren="加载关"
        />
        <Switch
          checked={empty}
          onChange={setEmpty}
          checkedChildren="空数据"
          unCheckedChildren="有数据"
        />
      </Space>
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        loading={loading}
        columns={contentColumns.slice(0, 5)}
        dataSource={empty ? [] : normalData.slice(0, 4)}
        pagination={false}
        scroll={{ x: 730 }}
      />
    </PlaygroundCase>
  )
}
