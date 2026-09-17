import { CloudOutlined, DatabaseOutlined } from '@ant-design/icons'
import { ProViewManagement } from '@zby/pro'
import { Divider, Flex, Input, Segmented, Select, Space, Tag, Typography } from 'antd'
import * as React from 'react'

import {
  PlaygroundCase,
  PlaygroundControl,
  PlaygroundGrid,
  PlaygroundSection,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'
import type { CountMode, Snapshot } from '../shared'
import {
  createMemoryAdapter,
  defaultSnapshot,
  syncCounts,
  systemViews,
} from '../shared'

type EventItem = {
  id: number
  text: string
}

let nextEventId = 0

export default function OrderViewsExample() {
  const [snapshot, setSnapshot] = React.useState(defaultSnapshot)
  const [countMode, setCountMode] = React.useState<CountMode>('async')
  const [events, setEvents] = React.useState<EventItem[]>([])
  const [lastViews, setLastViews] = React.useState(systemViews)

  const appendEvent = React.useCallback((text: string) => {
    const id = ++nextEventId
    setEvents((current) => [
      { id, text },
      ...current,
    ].slice(0, 8))
  }, [])

  const adapter = React.useMemo(() => createMemoryAdapter(appendEvent), [appendEvent])

  const countGetter = React.useCallback(
    async (view: (typeof systemViews)[number]) => {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 240))
      appendEvent(`getViewCount · ${view.name}`)
      return syncCounts[view.id] ?? Math.max(1, view.snapshot.keyword.length * 3)
    },
    [appendEvent],
  )

  const updateSnapshot = React.useCallback((patch: Partial<Snapshot>) => {
    setSnapshot((current) => ({ ...current, ...patch }))
  }, [])

  return (
    <>
      <PlaygroundSection
        title="完整交互"
        description="主实例使用远程 adapter 模拟异步持久化和服务端校验。"
      >
        <PlaygroundCase
          title="订单视图"
          description="选择视图后会应用 snapshot；修改筛选条件会进入 dirty 状态。"
        >
          <Flex align="center" gap="small" wrap>
            <ProViewManagement<Snapshot>
              adapter={adapter}
              currentSnapshot={snapshot}
              defaultSnapshot={defaultSnapshot}
              getViewCount={countMode === 'async' ? countGetter : undefined}
              instanceId="playground-pro-view-management"
              maxCustomViews={4}
              popupWidth={280}
              showCount
              systemViews={systemViews}
              viewCounts={countMode === 'sync' ? syncCounts : undefined}
              onActiveViewChange={(view) => appendEvent(`active · ${view.name}`)}
              onApplyView={(view) => {
                setSnapshot(view.snapshot)
                appendEvent(`apply · ${view.name}`)
              }}
              onResetView={(view) => {
                setSnapshot(view.snapshot)
                appendEvent(`reset · ${view.name}`)
              }}
              onSaveView={(view) => appendEvent(`save · ${view.name}`)}
              onViewsChange={(views) => setLastViews(views)}
            />
            <Tag color="blue">adapter + IndexedDB API shape</Tag>
          </Flex>

          <Divider style={{ marginBlock: 4 }} />

          <PlaygroundGrid minItemWidth={220}>
            <PlaygroundControl label="状态">
              <Segmented
                block
                options={[
                  { label: '全部', value: 'all' },
                  { label: '待处理', value: 'pending' },
                  { label: '已归档', value: 'archived' },
                ]}
                value={snapshot.status}
                onChange={(value) =>
                  updateSnapshot({ status: value as Snapshot['status'] })
                }
              />
            </PlaygroundControl>
            <PlaygroundControl label="负责人">
              <Select
                style={{ width: '100%' }}
                value={snapshot.owner}
                options={[
                  { label: '全部负责人', value: 'all' },
                  { label: '我负责的', value: 'me' },
                  { label: '团队负责的', value: 'team' },
                ]}
                onChange={(owner: Snapshot['owner']) => updateSnapshot({ owner })}
              />
            </PlaygroundControl>
            <PlaygroundControl label="关键词">
              <Input
                allowClear
                placeholder="订单号或客户名称"
                value={snapshot.keyword}
                onChange={(event) => updateSnapshot({ keyword: event.target.value })}
              />
            </PlaygroundControl>
          </PlaygroundGrid>

          <PlaygroundStatus label="当前 snapshot">
            {JSON.stringify(snapshot)}
          </PlaygroundStatus>
        </PlaygroundCase>
      </PlaygroundSection>

      <PlaygroundSection title="数量与持久化事件">
        <PlaygroundGrid>
          <PlaygroundCase
            title="数量来源"
            description="同时覆盖 viewCounts 和 getViewCount 两种 API。"
          >
            <Segmented<CountMode>
              block
              value={countMode}
              options={[
                { label: '异步 getter', value: 'async', icon: <CloudOutlined /> },
                { label: '同步映射', value: 'sync', icon: <DatabaseOutlined /> },
              ]}
              onChange={setCountMode}
            />
            <Typography.Text type="secondary">
              {countMode === 'async'
                ? '切换视图后异步读取数量。'
                : '直接读取 viewCounts。'}
            </Typography.Text>
          </PlaygroundCase>
          <PlaygroundCase title="最近事件">
            <Space orientation="vertical" size={6} style={{ width: '100%' }}>
              {events.length > 0 ? (
                events.map((event) => (
                  <Typography.Text key={event.id} code>
                    {event.text}
                  </Typography.Text>
                ))
              ) : (
                <Typography.Text type="secondary">暂无事件</Typography.Text>
              )}
            </Space>
          </PlaygroundCase>
          <PlaygroundCase title="当前视图列表">
            <Space wrap size={[4, 8]}>
              {lastViews.map((view) => (
                <Tag key={view.id} color={view.scope === 'system' ? 'default' : 'green'}>
                  {view.name}
                </Tag>
              ))}
            </Space>
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>
    </>
  )
}
