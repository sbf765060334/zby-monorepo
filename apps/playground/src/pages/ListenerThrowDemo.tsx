import { Button, Descriptions, Space, Typography } from 'antd'
import { useRef, useState } from 'react'
import { createRouterCore } from '@zby/router-core'

import { PlaygroundPage } from '../components/ComponentPlayground'

import type { RouterRoute } from '@zby/router-core'

const demoRoutes: RouterRoute[] = [
  { path: '/dashboard', title: '首页', element: {} },
  { path: '/settings/profile', title: '设置', element: {} },
]

type DemoStep = 'empty' | 'ready' | 'asked' | 'confirmed'

function createDemoRouter() {
  const navigateCalls: Array<{ target: unknown, options: unknown }> = []
  const onTabCloseCalls: string[] = []
  const router = createRouterCore({ routes: demoRoutes, storageAdapter: false })
  router.bindHost({
    navigate: (target, options) => {
      navigateCalls.push({ target, options })
    },
  })
  router.configureRuntime({
    onTabClose: (tabKey, info) => {
      onTabCloseCalls.push(`${tabKey} ← ${info.pathname}`)
    },
  })
  return { router, navigateCalls, onTabCloseCalls }
}

function describeState(
  router: ReturnType<typeof createRouterCore>,
  extra: {
    onTabCloseCalls: string[]
    syncError?: string
  },
) {
  const state = router.getState()
  return [
    { label: '页签栏', children: state.tabs.map((tab) => tab.key).join(' ， ') || '（空）' },
    { label: '当前地址', children: state.currentPathname || '（无）' },
    { label: '导航状态', children: state.navigationStatus },
    {
      label: 'onTabClose',
      children: extra.onTabCloseCalls.join(' ； ') || '一次都没调',
    },
    { label: 'syncLocation', children: extra.syncError ?? '还没回传地址' },
  ]
}

export default function ListenerThrowDemoPage() {
  const sessionRef = useRef<ReturnType<typeof createDemoRouter> | null>(null)
  const [step, setStep] = useState<DemoStep>('empty')
  const [listenerMode, setListenerMode] = useState<'throw' | 'safe'>()
  const [syncError, setSyncError] = useState<string>()
  const [note, setNote] = useState('还没开始。先打开两页，再选择首页 listener 会不会抛错。')

  const session = sessionRef.current
  const items = session
    ? describeState(session.router, {
        onTabCloseCalls: session.onTabCloseCalls,
        syncError,
      })
    : [
        { label: '页签栏', children: '（空）' },
        { label: '当前地址', children: '（无）' },
        { label: '导航状态', children: '还没创建 Demo Core' },
        { label: 'onTabClose', children: '一次都没调' },
        { label: 'syncLocation', children: '还没回传地址' },
      ]

  function refresh(nextNote: string, nextStep: DemoStep) {
    setNote(nextNote)
    setStep(nextStep)
  }

  function resetDemo() {
    sessionRef.current = null
    setListenerMode(undefined)
    setSyncError(undefined)
    setNote('已清空。从「打开首页和设置」重新走。')
    setStep('empty')
  }

  function openTwoPages() {
    const next = createDemoRouter()
    next.router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    next.router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    sessionRef.current = next
    setListenerMode(undefined)
    setSyncError(undefined)
    refresh(
      '现在人在设置页。首页页签还在，但当前没显示，所以给首页挂 listener 时不会立刻补发。',
      'ready',
    )
  }

  function attachListener(mode: 'throw' | 'safe') {
    const current = sessionRef.current
    if (!current)
      return
    current.router.subscribePageLocation('/dashboard', () => {
      if (mode === 'throw')
        throw new Error('首页 listener 炸了')
    })
    setListenerMode(mode)
    refresh(
      mode === 'throw'
        ? '首页 listener 已经挂上，收到地址就会抛错。下一步关掉设置页。'
        : '首页 listener 已经挂上，收到地址什么都不做。下一步关掉设置页。',
      'ready',
    )
  }

  async function closeSettings() {
    const current = sessionRef.current
    if (!current)
      return
    current.navigateCalls.length = 0
    const accepted = await current.router.closeTab('/settings/profile')
    refresh(
      accepted
        ? '关闭被接受了。设置页签还在，要等宿主回 /dashboard 才提交删除。'
        : '关闭被拒绝了，后面步骤没有意义。',
      'asked',
    )
  }

  function hostReturnsDashboard() {
    const current = sessionRef.current
    if (!current)
      return
    try {
      current.router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
      setSyncError('正常结束，没有抛错')
      refresh(
        listenerMode === 'throw'
          ? '首页 listener 抛错已被隔离。设置页签已删，onTabClose 应已调用；控制台会有 page location listener failed。'
          : '地址回到首页，设置页签已删，onTabClose 应已调用。',
        'confirmed',
      )
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error))
      refresh(
        '首页 listener 抛错把 syncLocation 后半段打断了。设置页签其实已经删了，但 onTabClose 没跑。导航状态也已经是 settled。',
        'confirmed',
      )
    }
  }

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title="listener 抛错不再打断关页"
      description="这是一套独立的迷你 Core。关掉设置回到首页时，Core 会通知首页 listener，然后再调 onTabClose。首页 listener 抛错只打日志，关页通知仍会跑完。"
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {note}
        </Typography.Paragraph>
        <Space wrap>
          <Button onClick={openTwoPages}>
            1. 打开首页和设置
          </Button>
          <Button
            disabled={step !== 'ready'}
            danger
            onClick={() => attachListener('throw')}
          >
            2a. 首页 listener 会抛错
          </Button>
          <Button
            disabled={step !== 'ready'}
            onClick={() => attachListener('safe')}
          >
            2b. 对照：首页 listener 正常
          </Button>
          <Button
            disabled={step !== 'ready' || !listenerMode}
            type="primary"
            onClick={() => void closeSettings()}
          >
            3. 关掉设置页签
          </Button>
          <Button disabled={step !== 'asked'} onClick={hostReturnsDashboard}>
            4. 宿主回 /dashboard
          </Button>
          <Button onClick={resetDemo}>
            从头再来
          </Button>
        </Space>
        <Descriptions
          bordered
          size="small"
          column={1}
          title="这一步之后的 Core 状态"
          items={items}
        />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          走 2a 时：第 4 步 syncLocation 正常结束，页签栏只剩首页，onTabClose 会记下 /settings/profile，控制台有 error。
          走 2b 时：结果相同，只是没有那条 error。
          页面 listener 和 onTabClose 一样被隔离，一个监听者抛错不能毁掉提交点。
        </Typography.Paragraph>
      </Space>
    </PlaygroundPage>
  )
}
