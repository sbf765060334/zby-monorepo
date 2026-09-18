import { Button, Descriptions, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { useRouterCore, useRouterCoreSelector, useRouterPage } from '@zby/router-core/react'

import { PlaygroundPage } from '../../components/ComponentPlayground'
import { getMockOrder, getNextMockOrderId } from './orders'

import type { RouterCoreState } from '@zby/router-core'

export default function SharedTabOrderDetailPage() {
  const router = useRouterCore()
  const page = useRouterPage()
  const [messageApi, contextHolder] = message.useMessage()
  const [mountId] = useState(() => Math.random().toString(36).slice(2, 8))
  const orderId = page.pathname.split('/').pop()
  const order = getMockOrder(orderId)
  const nextId = getNextMockOrderId(orderId)
  const tab = useRouterCoreSelector((state: RouterCoreState) =>
    state.tabs.find((item) => item.key === page.tabKey),
  )
  const isFixed = useRouterCoreSelector((state: RouterCoreState) =>
    state.fixedSet.includes(page.tabKey),
  )

  useEffect(() => {
    if (order)
      router.setTabLabel(page.tabKey, `订单 ${order.id}`)
  }, [order, page.tabKey, router])

  async function replaceWith(newPath: string, successText: string) {
    const closed = await router.closeThisTabOpenNewOne({
      oldPath: page.pathname,
      newPath,
    })
    if (!closed) {
      void messageApi.warning('替换没有被接受，当前页签还在。')
      return
    }
    void messageApi.success(successText)
  }

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title={order ? `订单 ${order.id}：${order.title}` : `未知订单 ${orderId}`}
      description="两个按钮都走 closeThisTabOpenNewOne，和关掉当前页再打开另一页一样。「替换为下一单」目标仍是 /orders/:id；「关闭并打开列表」会关掉详情页签。"
    >
      {contextHolder}
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Descriptions
          bordered
          size="small"
          column={2}
          items={[
            { label: '页签 key', children: page.tabKey },
            { label: '真实 pathname', children: page.pathname },
            { label: '页签标题', children: tab?.label ?? '-' },
            { label: '是否固定', children: isFixed ? '是' : '否' },
            { label: '页面实例 ID', children: mountId },
            { label: 'location', children: `${page.location?.pathname ?? ''}${page.location?.search ?? ''}${page.location?.hash ?? ''}` },
          ]}
        />
        {order ? (
          <Descriptions
            bordered
            size="small"
            column={2}
            title="订单数据"
            items={[
              { label: '客户', children: order.customer },
              { label: '金额', children: order.amount },
              { label: '状态', children: order.status },
            ]}
          />
        ) : null}
        <Space wrap>
          <Button onClick={() => router.toggleFixed(page.tabKey)}>
            {isFixed ? '取消固定' : '固定当前页签'}
          </Button>
          <Button
            type="primary"
            onClick={() => {
              void replaceWith(`/orders/${nextId}`, `已请求替换为订单 ${nextId}`)
            }}
          >
            {`保存并替换为订单 ${nextId}`}
          </Button>
          <Button
            onClick={() => {
              void replaceWith('/workbench/finance', '已关闭详情，打开订单列表')
            }}
          >
            关闭详情并打开财务列表
          </Button>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          页面实例 ID 在组件挂载时生成。关页再开后 location 会换成新单号。
          关掉本页签回到列表后，再点「按 pattern 打开详情」不会跳回来：真实地址缓存已经清掉。
        </Typography.Paragraph>
      </Space>
    </PlaygroundPage>
  )
}
