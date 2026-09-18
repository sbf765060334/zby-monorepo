import { Button, Descriptions, Space, Typography } from 'antd'
import { useRef, useState } from 'react'
import { createRouterCore } from '@zby/router-core'

import { PlaygroundPage } from '../components/ComponentPlayground'

import type { RouterRoute } from '@zby/router-core'

const demoRoutes: RouterRoute[] = [
  { path: '/dashboard', title: '首页', element: {} },
  { path: '/settings/profile', title: '设置', element: {} },
  { path: '/reports', title: '报表', element: {} },
]

type DemoStep = 'empty' | 'ready' | 'failed' | 'asked' | 'confirmed'

function formatTarget(target: unknown) {
  return typeof target === 'string' ? target : JSON.stringify(target)
}

function createDemoRouter() {
  const navigateCalls: Array<{ target: unknown, options: unknown }> = []
  const onTabCloseCalls: string[] = []
  let throwOnNavigate = false
  const router = createRouterCore({ routes: demoRoutes, storageAdapter: false })
  router.bindHost({
    navigate: (target, options) => {
      navigateCalls.push({ target, options })
      if (throwOnNavigate)
        throw new Error('宿主跳转失败')
    },
  })
  router.configureRuntime({
    onTabClose: (tabKey, info) => {
      onTabCloseCalls.push(`${tabKey} ← ${info.pathname}`)
    },
  })
  return {
    router,
    navigateCalls,
    onTabCloseCalls,
    setThrowOnNavigate(next: boolean) {
      throwOnNavigate = next
    },
  }
}

function describeState(
  router: ReturnType<typeof createRouterCore>,
  extra: ReturnType<typeof createDemoRouter> & {
    commandResult: string
    commandError: string
  },
) {
  const state = router.getState()
  return [
    { label: '页签栏', children: state.tabs.map((tab) => tab.key).join(' ， ') || '（空）' },
    { label: '当前地址', children: state.currentPathname || '（无）' },
    { label: '活动页签', children: state.activeTabKey || '（无）' },
    { label: '导航状态', children: state.navigationStatus },
    { label: '命令返回值', children: extra.commandResult },
    {
      label: '发给宿主的跳转',
      children: extra.navigateCalls.map((item) => formatTarget(item.target)).join(' ， ') || '还没有',
    },
    {
      label: 'onTabClose',
      children: extra.onTabCloseCalls.join(' ； ') || '一次都没调',
    },
    { label: '抛错', children: extra.commandError || '没有' },
  ]
}

export default function InactiveReplaceDemoPage() {
  const sessionRef = useRef<(
    ReturnType<typeof createDemoRouter> & {
      commandResult: string
      commandError: string
    }
  ) | null>(null)
  const [step, setStep] = useState<DemoStep>('empty')
  const [note, setNote] = useState('还没开始。先打开首页和设置，人站在首页上，设置只是后台页签。')

  const session = sessionRef.current
  const items = session
    ? describeState(session.router, session)
    : [
        { label: '页签栏', children: '（空）' },
        { label: '当前地址', children: '（无）' },
        { label: '活动页签', children: '（无）' },
        { label: '导航状态', children: '还没创建 Demo Core' },
        { label: '命令返回值', children: '还没调' },
        { label: '发给宿主的跳转', children: '还没有' },
        { label: 'onTabClose', children: '一次都没调' },
        { label: '抛错', children: '没有' },
      ]

  function refresh(nextNote: string, nextStep: DemoStep) {
    setNote(nextNote)
    setStep(nextStep)
  }

  function resetDemo() {
    sessionRef.current = null
    setNote('已清空。从「打开首页和设置」重新走。')
    setStep('empty')
  }

  function openBackgroundSettings() {
    const next = {
      ...createDemoRouter(),
      commandResult: '还没调',
      commandError: '',
    }
    next.router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    next.router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    next.router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    sessionRef.current = next
    refresh(
      '人在首页。设置页签开着，但当前没显示。接下来用 closeThisTabOpenNewOne 关掉后台设置，并打开报表。',
      'ready',
    )
  }

  async function closeInactiveSettings(failNavigate: boolean) {
    const current = sessionRef.current
    if (!current)
      return
    current.navigateCalls.length = 0
    current.onTabCloseCalls.length = 0
    current.setThrowOnNavigate(failNavigate)
    try {
      const accepted = await current.router.closeThisTabOpenNewOne({
        oldPath: '/settings/profile',
        newPath: '/reports',
      })
      current.commandResult = String(accepted)
      current.commandError = ''
      refresh(
        failNavigate
          ? '跳转失败这条路不该走到成功。'
          : '命令已经返回。设置页签此时已经没了，但当前地址还是首页——要等宿主回 /reports 才会切过去。',
        failNavigate ? 'failed' : 'asked',
      )
    } catch (error) {
      current.commandResult = '抛错，没有返回值'
      current.commandError = error instanceof Error ? error.message : String(error)
      refresh(
        '跳转失败了。设置页签还在，人还停在首页。先跳再删，失败能保住旧页。',
        'failed',
      )
    }
  }

  async function closeActiveSettingsAndThrow() {
    const current = sessionRef.current
    if (!current)
      return
    current.router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    current.navigateCalls.length = 0
    current.onTabCloseCalls.length = 0
    current.setThrowOnNavigate(true)
    try {
      const accepted = await current.router.closeThisTabOpenNewOne({
        oldPath: '/settings/profile',
        newPath: '/reports',
      })
      current.commandResult = String(accepted)
      current.commandError = ''
      refresh('活动页这条对照不该走到成功。', 'failed')
    } catch (error) {
      current.commandResult = '抛错，没有返回值'
      current.commandError = error instanceof Error ? error.message : String(error)
      refresh(
        '人当时在设置上。跳转失败后设置页签还在，地址也还是设置。活动页会等确认再删，所以失败能保住旧页。',
        'failed',
      )
    }
  }

  function hostReturnsReports() {
    const current = sessionRef.current
    if (!current)
      return
    current.router.syncLocation({ pathname: '/reports', search: '', hash: '' })
    refresh(
      '宿主回了 /reports。报表页签这时才建起来。设置在命令返回时就已经删了，不是等这次确认才删。',
      'confirmed',
    )
  }

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title="非活动页组合关闭先跳再删"
      description="这是一套独立的迷你 Core。关掉后台页再打开另一页时，会先请宿主跳转，成功了再撕旧页签。跳转失败的话，旧页还在。"
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {note}
        </Typography.Paragraph>
        <Space wrap>
          <Button onClick={openBackgroundSettings}>
            1. 打开首页和设置，人回首页
          </Button>
          <Button
            disabled={step !== 'ready'}
            danger
            onClick={() => void closeInactiveSettings(true)}
          >
            2a. 关后台设置开报表（跳转失败）
          </Button>
          <Button
            disabled={step !== 'ready'}
            type="primary"
            onClick={() => void closeInactiveSettings(false)}
          >
            2b. 对照：关后台设置开报表（跳转正常）
          </Button>
          <Button
            disabled={step !== 'ready'}
            onClick={() => void closeActiveSettingsAndThrow()}
          >
            2c. 对照：人先站到设置再关（跳转失败）
          </Button>
          <Button disabled={step !== 'asked'} onClick={hostReturnsReports}>
            3. 宿主回 /reports
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
          2a：页签栏仍是首页和设置，当前地址仍是 /dashboard，报表没打开，onTabClose 没调。
          2b：设置已经没了，发给宿主 /reports，地址要等第 3 步才变。
          2c：设置页签还在，地址还是设置。只有活动页会等确认再删。
        </Typography.Paragraph>
      </Space>
    </PlaygroundPage>
  )
}
