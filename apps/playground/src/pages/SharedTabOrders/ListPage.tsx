import { Button, Table, Typography } from 'antd'
import { useRouterCore } from '@zby/router-core/react'

import { PlaygroundPage } from '../../components/ComponentPlayground'
import { MOCK_ORDERS } from './orders'

import type { MockOrder } from './orders'

export default function SharedTabOrderListPage() {
  const router = useRouterCore()

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title="共享页签复现"
      description="一级菜单进入订单列表。详情路由 /orders/:id 未开 supportMultipleTabs，42 / 99 / 7 共用一个「订单详情」页签。打开 42 后在详情页执行 closeThisTabOpenNewOne 换到 99。"
    >
      <Table<MockOrder>
        rowKey="id"
        pagination={false}
        dataSource={MOCK_ORDERS}
        columns={[
          { title: '单号', dataIndex: 'id', width: 80 },
          { title: '标题', dataIndex: 'title' },
          { title: '客户', dataIndex: 'customer', width: 120 },
          { title: '金额', dataIndex: 'amount', width: 120 },
          { title: '状态', dataIndex: 'status', width: 100 },
          {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_, order) => (
              <Button
                type="link"
                onClick={() => router.jumpTo(`/orders/${order.id}`)}
              >
                打开详情
              </Button>
            ),
          },
        ]}
      />
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        详情页不出现在左侧菜单里。打开后请看顶部页签：只会有一个「订单详情」。
      </Typography.Paragraph>
    </PlaygroundPage>
  )
}
