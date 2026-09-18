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

type DemoStep = 'empty' | 'ready' | 'first' | 'raced' | 'confirmed'

function formatTarget(target: unknown) {
  return typeof target === 'string' ? target : JSON.stringify(target)
}

function createDemoRouter() {
  const navigateCalls: Array<{ target: unknown, options: unknown }> = []
  const onTabCloseCalls: string[] = []
  const closeResults: string[] = []
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
  return { router, navigateCalls, onTabCloseCalls, closeResults }
}

function describeState(
  router: ReturnType<typeof createRouterCore>,
  extra: ReturnType<typeof createDemoRouter>,
) {
  const state = router.getState()
  return [
    { label: '页签栏', children: state.tabs.map((tab) => tab.key).join(' ， ') || '（空）' },
    { label: '当前地址', children: state.currentPathname || '（无）' },
    { label: '活动页签', children: state.activeTabKey || '（无）' },
    { label: '导航状态', children: state.navigationStatus },
    {
      label: 'closeTab 返回值',
      children: extra.closeResults.join(' ， ') || '还没关',
    },
    {
      label: '发给宿主的跳转',
      children: extra.navigateCalls.map((item) => formatTarget(item.target)).join(' ， ') || '还没有',
    },
    {
      label: 'onTabClose',
      children: extra.onTabCloseCalls.join(' ； ') || '一次都没调',
    },
  ]
}

export default function PendingLockDemoPage() {
  const sessionRef = useRef<ReturnType<typeof createDemoRouter> | null>(null)
  const [step, setStep] = useState<DemoStep>('empty')
  const [note, setNote] = useState('还没开始。先打开三页，人站在设置上。')

  const session = sessionRef.current
  const items = session
    ? describeState(session.router, session)
    : [
        { label: '页签栏', children: '（空）' },
        { label: '当前地址', children: '（无）' },
        { label: '活动页签', children: '（无）' },
        { label: '导航状态', children: '还没创建 Demo Core' },
        { label: 'closeTab 返回值', children: '还没关' },
        { label: '发给宿主的跳转', children: '还没有' },
        { label: 'onTabClose', children: '一次都没调' },
      ]

  function refresh(nextNote: string, nextStep: DemoStep) {
    setNote(nextNote)
    setStep(nextStep)
  }

  function resetDemo() {
    sessionRef.current = null
    setNote('已清空。从「打开三页」重新走。')
    setStep('empty')
  }

  function openThreePages() {
    const next = createDemoRouter()
    next.router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    next.router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    next.router.syncLocation({ pathname: '/reports', search: '', hash: '' })
    next.router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    sessionRef.current = next
    refresh(
      '三页都开了，人在设置。关掉设置时，Core 会先让宿主去首页，等确认后再删设置页签。',
      'ready',
    )
  }

  async function closeSettingsOnce() {
    const current = sessionRef.current
    if (!current)
      return
    current.navigateCalls.length = 0
    const accepted = await current.router.closeTab('/settings/profile')
    current.closeResults.push(`第1次 ${String(accepted)}`)
    refresh(
      accepted
        ? '第一次关闭被接受了。设置页签还在，正在等宿主确认，关闭锁还没放。'
        : '第一次关闭被拒绝了。',
      'first',
    )
  }

  async function closeSettingsAgain() {
    const current = sessionRef.current
    if (!current)
      return
    const accepted = await current.router.closeTab('/settings/profile')
    current.closeResults.push(`第2次 ${String(accepted)}`)
    refresh(
      accepted
        ? '第二次关掉设置也成功了。锁没拦住，这不应该发生。'
        : '第二次被锁拦住了，返回 false。发给宿主的仍只有第一次的 /dashboard。',
      'raced',
    )
  }

  async function replaceWithReports() {
    const current = sessionRef.current
    if (!current)
      return
    const accepted = await current.router.closeThisTabOpenNewOne({
      oldPath: '/settings/profile',
      newPath: '/reports',
    })
    current.closeResults.push(`换成报表 ${String(accepted)}`)
    refresh(
      accepted
        ? '保存后换成报表也成功了。锁没拦住，这不应该发生。'
        : '换成报表失败了。第一次去首页还在等确认，同一设置页不能再关一次。',
      'raced',
    )
  }

  function hostReturns(pathname: string, label: string) {
    const current = sessionRef.current
    if (!current)
      return
    current.router.syncLocation({ pathname, search: '', hash: '' })
    refresh(
      `宿主回了 ${label}。离开设置后页签会删掉，关闭锁也会放开。第二次关闭没有发出去，所以不应再被拉去另一页。`,
      'confirmed',
    )
  }

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title="关闭锁保持到确认"
      description="这是一套独立的迷你 Core。关掉活动页后，在宿主确认前同一页不能再关。连点 X 或交错的「关旧开新」会返回 false，不会再发一次跳转。"
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {note}
        </Typography.Paragraph>
        <Space wrap>
          <Button onClick={openThreePages}>
            1. 打开首页、设置、报表
          </Button>
          <Button
            disabled={step !== 'ready'}
            type="primary"
            onClick={() => void closeSettingsOnce()}
          >
            2. 关掉设置（先不回传）
          </Button>
          <Button
            disabled={step !== 'first'}
            danger
            onClick={() => void closeSettingsAgain()}
          >
            3a. 再关一次设置
          </Button>
          <Button
            disabled={step !== 'first'}
            danger
            onClick={() => void replaceWithReports()}
          >
            3b. 保存后换成报表
          </Button>
          <Button
            disabled={step === 'empty' || step === 'ready'}
            onClick={() => hostReturns('/dashboard', '/dashboard')}
          >
            4a. 宿主回首页
          </Button>
          <Button
            disabled={step === 'empty' || step === 'ready'}
            onClick={() => hostReturns('/reports', '/reports')}
          >
            4b. 宿主回报表
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
          锁会保持到宿主确认已经离开被关页。3a / 3b 都应返回 false，发给宿主只有第一次的 /dashboard。
          4a 确认后设置页签删除；4b 这时只是普通跳到报表，不是第二次关闭插队。
        </Typography.Paragraph>
      </Space>
    </PlaygroundPage>
  )
}
