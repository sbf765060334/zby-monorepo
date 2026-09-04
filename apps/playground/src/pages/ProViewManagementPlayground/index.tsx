import { CheckCircleOutlined, CloudOutlined, DatabaseOutlined, ReloadOutlined } from '@ant-design/icons'
import type {
  ProViewManagementAdapter,
  ProViewManagementView,
} from '@zby/pro'
import {
  createRemoteProViewManagementAdapter,
  ProViewManagement,
} from '@zby/pro'
import {
  Alert,
  Divider,
  Flex,
  Input,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import * as React from 'react'

import {
  PlaygroundCase,
  PlaygroundControl,
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
  PlaygroundStatus,
} from '../../components/ComponentPlayground'

type Snapshot = {
  keyword: string
  owner: 'all' | 'me' | 'team'
  status: 'all' | 'pending' | 'archived'
}

type EventItem = {
  id: number
  text: string
}

let nextEventId = 0

type CountMode = 'async' | 'sync'
type LoadMode = 'ready' | 'loading' | 'error'

const defaultSnapshot: Snapshot = {
  keyword: '',
  owner: 'all',
  status: 'all',
}

const systemViews: ProViewManagementView<Snapshot>[] = [
  {
    id: 'system-all',
    name: '全部订单',
    scope: 'system',
    order: 0,
    snapshot: defaultSnapshot,
  },
  {
    id: 'system-pending',
    name: '待处理',
    scope: 'system',
    order: 1,
    snapshot: { keyword: '', owner: 'all', status: 'pending' },
  },
  {
    id: 'system-archived',
    name: '已归档',
    scope: 'system',
    order: 2,
    snapshot: { keyword: '', owner: 'all', status: 'archived' },
  },
]

const initialCustomViews: ProViewManagementView<Snapshot>[] = [
  {
    id: 'custom-mine',
    name: '我的待办',
    scope: 'custom',
    order: 0,
    snapshot: { keyword: '', owner: 'me', status: 'pending' },
  },
  {
    id: 'custom-team',
    name: '团队归档',
    scope: 'custom',
    order: 1,
    snapshot: { keyword: '合同', owner: 'team', status: 'archived' },
  },
]

const syncCounts: Record<string, number> = {
  'system-all': 128,
  'system-pending': 36,
  'system-archived': 92,
  'custom-mine': 12,
  'custom-team': 8,
}

function createMemoryAdapter(
  onEvent: (text: string) => void,
): ProViewManagementAdapter<Snapshot> {
  let views = initialCustomViews.map((view) => ({ ...view }))
  let activeViewId: string | undefined = 'system-all'

  const wait = (duration = 180) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, duration)
    })

  return createRemoteProViewManagementAdapter({
    async load(instanceId) {
      await wait(500)
      onEvent(`load · ${instanceId}`)
      return { views, activeViewId }
    },
    async validateCreate(_instanceId, payload) {
      await wait()
      if (payload.name.includes('远程')) {
        return '远程校验拒绝了这个名称'
      }
      onEvent(`validateCreate · ${payload.name}`)
      return undefined
    },
    async validateRename(_instanceId, payload) {
      await wait()
      if (payload.name.includes('远程')) {
        return '远程校验拒绝了这个名称'
      }
      onEvent(`validateRename · ${payload.name}`)
      return undefined
    },
    async create(instanceId, view) {
      await wait()
      views = views.concat({ ...view, scope: 'custom' })
      onEvent(`create · ${view.name} · ${instanceId}`)
    },
    async update(_instanceId, viewId, patch) {
      await wait()
      views = views.map((view) =>
        view.id === viewId
          ? { ...view, ...patch, id: view.id, scope: 'custom' }
          : view,
      )
      onEvent(`update · ${viewId}`)
    },
    async remove(_instanceId, viewId) {
      await wait()
      views = views.filter((view) => view.id !== viewId)
      if (activeViewId === viewId) {
        activeViewId = undefined
      }
      onEvent(`remove · ${viewId}`)
    },
    async reorder(_instanceId, orderedViewIds) {
      await wait()
      const orderLookup = new Map(
        orderedViewIds.map((viewId, index) => [viewId, index]),
      )
      views = views
        .map((view, index) => ({
          ...view,
          order: orderLookup.get(view.id) ?? index,
        }))
        .sort((left, right) => left.order - right.order)
      onEvent(`reorder · ${orderedViewIds.join(', ')}`)
    },
    async setActiveViewId(_instanceId, viewId) {
      await wait()
      activeViewId = viewId
      onEvent(`setActiveViewId · ${viewId}`)
    },
  })
}

export default function ProViewManagementPlayground() {
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
    async (view: ProViewManagementView<Snapshot>) => {
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
    <PlaygroundPage
      packageName="@zby/pro"
      title="ProViewManagement"
      description="可持久化的视图切换、创建、保存、重置、管理与排序。"
    >
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

      <PlaygroundSection title="受控状态">
        <ControlledStateExample />
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

function ControlledStateExample() {
  const [mode, setMode] = React.useState<LoadMode>('ready')
  const statusText = mode === 'ready' ? '可用' : mode === 'loading' ? '加载中' : '加载失败'
  const statusType = mode === 'ready' ? 'success' : mode === 'loading' ? 'info' : 'error'

  return (
    <PlaygroundCase
      title="loading / error / retry"
      description="受控状态下系统视图仍可查看，失败后可点击重试。"
    >
      <Flex align="center" justify="space-between" gap="middle" wrap>
        <Segmented<LoadMode>
          value={mode}
          options={[
            { label: '正常', value: 'ready' },
            { label: '加载中', value: 'loading' },
            { label: '错误', value: 'error' },
          ]}
          onChange={setMode}
        />
        <Tag icon={mode === 'ready' ? <CheckCircleOutlined /> : <ReloadOutlined />} color={statusType}>
          {statusText}
        </Tag>
      </Flex>
      <ProViewManagement<Snapshot>
        currentSnapshot={defaultSnapshot}
        defaultSnapshot={defaultSnapshot}
        initialStorageState={{
          activeViewId: systemViews[0].id,
          views: [],
        }}
        instanceId="playground-pro-view-management-controlled"
        loadError={mode === 'error' ? new Error('demo load failed') : undefined}
        loading={mode === 'loading'}
        systemViews={systemViews}
        onApplyView={() => undefined}
        onRetryLoad={() => setMode('ready')}
      />
      {mode === 'error' ? (
        <Alert
          showIcon
          type="error"
          title="视图加载失败"
          description="点击组件右侧错误图标触发 retry。"
        />
      ) : null}
    </PlaygroundCase>
  )
}
