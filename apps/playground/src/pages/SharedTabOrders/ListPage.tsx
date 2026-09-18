import { Button, Space, Table, Typography, message } from 'antd'
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'

import { PlaygroundPage } from '../../components/ComponentPlayground'
import { MOCK_ORDERS } from './orders'

import type { RouterCoreState } from '@zby/router-core'
import type { MockOrder } from './orders'

export default function SharedTabOrderListPage() {
  const router = useRouterCore()
  const [messageApi, contextHolder] = message.useMessage()
  const currentPathname = useRouterCoreSelector(
    (state: RouterCoreState) => state.currentPathname,
  )
  const hasDetailTab = useRouterCoreSelector((state: RouterCoreState) =>
    state.tabs.some((tab) => tab.key === '/orders/:id'),
  )

  function jumpByPattern() {
    const before = router.getState()
    router.jumpTo('/orders/:id')
    const after = router.getState()
    if (
      after.currentPathname === before.currentPathname &&
      after.navigationStatus !== 'navigating'
    ) {
      void messageApi.warning(
        'jumpTo("/orders/:id") 没有发出导航。关详情后 cache 被清掉了；控制台会给出警告。',
      )
      return
    }
    void messageApi.success('已请求打开缓存里最后一次真实地址（通常是上一单）。')
  }

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title="共享页签复现"
      description="一级菜单进入订单列表。详情路由 /orders/:id 不会出现在菜单里。先打开一单，再关掉详情页签，然后点「按 pattern 打开详情」：jumpTo('/orders/:id') 不会跳转，控制台会警告。请用 /orders/79 这类具体地址进入。"
    >
      {contextHolder}
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          当前地址 {currentPathname}。详情页签{hasDetailTab ? '还在' : '不在'}。
          页签还在时（只是切回列表）点下面按钮会回到上一单；关掉详情后再点，地址不会变。
        </Typography.Paragraph>
        <Button onClick={jumpByPattern}>
          {`按 pattern 打开详情 jumpTo('/orders/:id')`}
        </Button>
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
          文档里的页签栏也是 jumpTo(tab.key)。共享动态页的 key 就是 /orders/:id。
          关页会 cache.clear，收藏/菜单如果存的是这个 pattern，同样打不开。
        </Typography.Paragraph>
      </Space>
    </PlaygroundPage>
  )
}
