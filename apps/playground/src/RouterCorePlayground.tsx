import { useRouterCore, useRouterCoreSelector, useRouterPage } from '@zby/router-core/react'
import { useIntl } from '@zby/intl'
import { Alert, Button, Card, Descriptions, Input, Space, Tag, Typography, theme } from 'antd'
import React from 'react'

import type { RouterCoreState } from '@zby/router-core'
import type { ProLayoutRoute } from '@zby/pro'

const { Paragraph, Text, Title } = Typography

/** ProLayout 默认落点，同时用本地计数直观演示 KeepAlive 不会在切换页签时卸载页面。 */
export function OverviewPlayground() {
  const intl = useIntl()
  const router = useRouterCore<ProLayoutRoute>()
  const [count, setCount] = React.useState(0)

  return (
    <PageFrame
      title={intl.getMessage('playground.proLayout.overview.title', 'ZBY ProLayout 功能预览')}
      subtitle={intl.getMessage(
        'playground.proLayout.overview.subtitle',
        '基于 router-core 的菜单、页签、KeepAlive、收藏和持久化演示。',
      )}
    >
      <Alert
        type="info"
        showIcon
        message={intl.getMessage(
          'playground.proLayout.overview.guide',
          '从左侧打开组件或路由页面，再通过顶部页签操作。',
        )}
      />

      <Card
        size="small"
        title={intl.getMessage('playground.proLayout.overview.keepAliveTitle', 'KeepAlive 页面状态')}
      >
        <Paragraph type="secondary">
          {intl.getMessage(
            'playground.proLayout.overview.keepAliveDescription',
            '增加计数后切换到其他页签，再返回本页，计数仍会保留。',
          )}
        </Paragraph>
        <Space wrap>
          <Button type="primary" onClick={() => setCount((value) => value + 1)}>
            {intl.getMessage('playground.proLayout.overview.increment', '增加计数')}：{count}
          </Button>
          <Button onClick={() => router.jumpTo('/input-number-range')}>
            {intl.getMessage('playground.proLayout.overview.openInput', '打开 InputNumberRange')}
          </Button>
          <Button onClick={() => router.jumpTo('/scroll-area')}>
            {intl.getMessage('playground.proLayout.overview.openScroll', '打开 ScrollArea')}
          </Button>
          <Button onClick={() => router.jumpTo('/router-core')}>
            {intl.getMessage('playground.proLayout.overview.openRouter', '查看路由状态')}
          </Button>
        </Space>
      </Card>

      <Card
        size="small"
        title={intl.getMessage('playground.proLayout.overview.featureTitle', '本预览覆盖的能力')}
      >
        <Space wrap>
          <FeatureTag id="routing" fallback="真实 URL 双向同步" />
          <FeatureTag id="tabs" fallback="页签切换、关闭、固定与拖拽" />
          <FeatureTag id="keepAlive" fallback="KeepAlive 与缓存上限" />
          <FeatureTag id="favorites" fallback="菜单收藏及持久化" />
          <FeatureTag id="i18n" fallback="中英文" />
          <FeatureTag id="theme" fallback="三态主题" />
        </Space>
      </Card>
    </PageFrame>
  )
}

/** 直接订阅 RouterCore 快照，展示路由、页签、页面缓存和持久化的真实运行状态。 */
export function RouterStatePlayground() {
  const intl = useIntl()
  const router = useRouterCore<ProLayoutRoute>()
  const page = useRouterPage<ProLayoutRoute>()
  const pathname = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.currentPathname,
  )
  const tabs = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.tabs,
  )
  const pages = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.pages,
  )
  const fixedSet = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.fixedSet,
  )
  const storageHydrated = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.storageHydrated,
  )
  const storageLoading = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.storageLoading,
  )

  return (
    <PageFrame
      title={intl.getMessage('playground.proLayout.core.title', 'RouterCore 实时状态')}
      subtitle={intl.getMessage(
        'playground.proLayout.core.subtitle',
        '下面的数据直接订阅当前 RouterCore。',
      )}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        <MetricCard
          label={intl.getMessage('playground.proLayout.core.currentPath', '当前路径')}
          value={pathname}
        />
        <MetricCard
          label={intl.getMessage('playground.proLayout.core.openTabs', '已打开页签')}
          value={tabs.length}
        />
        <MetricCard
          label={intl.getMessage('playground.proLayout.core.retainedPages', '保留页面')}
          value={pages.length}
        />
        <MetricCard
          label={intl.getMessage('playground.proLayout.core.fixedTabs', '固定页签')}
          value={fixedSet.length}
        />
        <MetricCard
          label={intl.getMessage('playground.proLayout.core.storage', '持久化状态')}
          value={storageLoading
            ? intl.getMessage('playground.proLayout.core.loading', '加载中')
            : storageHydrated
              ? intl.getMessage('playground.proLayout.core.hydrated', '已加载')
              : '—'}
        />
      </div>

      <Card size="small">
        <Space wrap>
          <Button type="primary" onClick={() => router.jumpTo('/orders/1001')}>
            {intl.getMessage('playground.proLayout.core.openOrder1001', '打开订单 1001')}
          </Button>
          <Button onClick={() => router.jumpTo('/orders/1002')}>
            {intl.getMessage('playground.proLayout.core.openOrder1002', '打开订单 1002')}
          </Button>
          <Button
            onClick={() => router.smartNavigate({
              searchParams: 'source=playground',
              hash: 'router-state',
            })}
          >
            {intl.getMessage('playground.proLayout.core.updateUrl', '更新 search 与 hash')}
          </Button>
        </Space>
      </Card>

      <Card
        id="router-state"
        size="small"
        title={intl.getMessage('playground.proLayout.core.location', '当前页面 location')}
      >
        <Text code>{JSON.stringify(page.location)}</Text>
      </Card>

      <Card
        size="small"
        title={intl.getMessage('playground.proLayout.core.tabSnapshot', '页签快照')}
      >
        <Space wrap>
          {tabs.length
            ? tabs.map((tab) => (
                <Tag key={tab.key} color={fixedSet.includes(tab.key) ? 'blue' : undefined}>
                  {tab.label} · {tab.key}
                </Tag>
              ))
            : (
                <Text type="secondary">
                  {intl.getMessage('playground.proLayout.core.emptyTabs', '暂无页签')}
                </Text>
              )}
        </Space>
      </Card>
    </PageFrame>
  )
}

/** 动态路由页面；每个真实订单 pathname 都会获得独立页签和独立 React 状态。 */
export function DynamicOrderPlayground() {
  const intl = useIntl()
  const page = useRouterPage<ProLayoutRoute>()
  const [note, setNote] = React.useState('')
  const orderId = page.pathname.split('/').filter(Boolean).at(-1) || '—'

  return (
    <PageFrame
      title={intl.getMessage(
        'playground.proLayout.order.title',
        `动态订单页签：${orderId}`,
        { id: orderId },
      )}
      subtitle={intl.getMessage(
        'playground.proLayout.order.subtitle',
        '不同订单号拥有独立页签和独立页面实例。',
      )}
    >
      <Descriptions
        bordered
        size="small"
        column={1}
        items={[
          {
            key: 'pathname',
            label: intl.getMessage('playground.proLayout.order.pathname', '真实 pathname'),
            children: <Text code>{page.pathname}</Text>,
          },
          {
            key: 'tabKey',
            label: intl.getMessage('playground.proLayout.order.tabKey', '页签 key'),
            children: <Text code>{page.tabKey}</Text>,
          },
        ]}
      />
      <Card
        size="small"
        title={intl.getMessage('playground.proLayout.order.note', '当前页签备注')}
      >
        <Input
          value={note}
          placeholder={intl.getMessage(
            'playground.proLayout.order.notePlaceholder',
            '输入内容后切换订单，验证每个页签的状态互不影响',
          )}
          onChange={(event) => setNote(event.target.value)}
        />
      </Card>
      <Space wrap>
        <Button onClick={() => page.router.jumpTo('/orders/1001')}>
          {intl.getMessage('playground.proLayout.order.openPrevious', '打开订单 1001')}
        </Button>
        <Button onClick={() => page.router.jumpTo('/orders/1002')}>
          {intl.getMessage('playground.proLayout.order.openNext', '打开订单 1002')}
        </Button>
      </Space>
    </PageFrame>
  )
}

function FeatureTag(props: { id: string, fallback: string }) {
  const intl = useIntl()
  return (
    <Tag color="processing">
      {intl.getMessage(`playground.proLayout.overview.${props.id}`, props.fallback)}
    </Tag>
  )
}

function MetricCard(props: { label: string, value: React.ReactNode }) {
  return (
    <Card size="small">
      <Text type="secondary">{props.label}</Text>
      <div style={{ marginBlockStart: 8, fontSize: 20, fontWeight: 600 }}>
        {props.value}
      </div>
    </Card>
  )
}

function PageFrame(props: { title: string, subtitle: string, children: React.ReactNode }) {
  const { token } = theme.useToken()

  return (
    <Space orientation="vertical" size={16} style={{ display: 'flex', width: '100%' }}>
      <header>
        <Title level={3} style={{ margin: 0 }}>
          {props.title}
        </Title>
        <Text type="secondary">{props.subtitle}</Text>
      </header>
      <div
        style={{
          display: 'grid',
          gap: 16,
          padding: 16,
          border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          background: token.colorBgLayout,
        }}
      >
        {props.children}
      </div>
    </Space>
  )
}
