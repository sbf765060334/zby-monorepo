import { Button, Descriptions, Space, Typography } from 'antd'
import { useRef, useState } from 'react'
import { createRouterCore } from '@zby/router-core'

import { PlaygroundPage } from '../components/ComponentPlayground'

import type { RouterRoute } from '@zby/router-core'

const demoRoutes: RouterRoute[] = [
  { path: '/dashboard', title: '首页', element: {} },
  { path: '/settings/profile', title: '设置', element: {} },
]

type DemoStep = 'empty' | 'ready' | 'asked' | 'mismatch' | 'retry' | 'matched'

function createDemoRouter() {
  const navigateCalls: Array<{ target: unknown, options: unknown }> = []
  const router = createRouterCore({ routes: demoRoutes, storageAdapter: false })
  router.bindHost({
    navigate: (target, options) => {
      navigateCalls.push({ target, options })
    },
  })
  return { router, navigateCalls }
}

function describeState(
  router: ReturnType<typeof createRouterCore>,
  extra: { closeTabReturned?: string, lastNavigate?: string },
) {
  const state = router.getState()
  return [
    { label: '页签栏', children: state.tabs.map((tab) => tab.key).join(' ， ') || '（空）' },
    { label: '当前地址', children: state.currentPathname || '（无）' },
    { label: '活动页面', children: state.activePage || '（无）' },
    { label: '导航状态', children: state.navigationStatus },
    { label: 'closeTab 返回值', children: extra.closeTabReturned ?? '还没点关闭' },
    { label: '发给宿主的跳转', children: extra.lastNavigate ?? '还没有' },
  ]
}

export default function CloseConfirmDemoPage() {
  const sessionRef = useRef<ReturnType<typeof createDemoRouter> | null>(null)
  const [step, setStep] = useState<DemoStep>('empty')
  const [closeTabReturned, setCloseTabReturned] = useState<string>()
  const [lastNavigate, setLastNavigate] = useState<string>()
  const [note, setNote] = useState('还没开始。下面每一步只做一件事，看页签栏怎么变。')

  const session = sessionRef.current
  const items = session
    ? describeState(session.router, { closeTabReturned, lastNavigate })
    : [
        { label: '页签栏', children: '（空）' },
        { label: '当前地址', children: '（无）' },
        { label: '活动页面', children: '（无）' },
        { label: '导航状态', children: '还没创建 Demo Core' },
        { label: 'closeTab 返回值', children: closeTabReturned ?? '还没点关闭' },
        { label: '发给宿主的跳转', children: lastNavigate ?? '还没有' },
      ]

  function refresh(nextNote: string, nextStep: DemoStep) {
    const current = sessionRef.current
    if (current?.navigateCalls.length) {
      const last = current.navigateCalls[current.navigateCalls.length - 1]
      setLastNavigate(JSON.stringify(last))
    }
    setNote(nextNote)
    setStep(nextStep)
  }

  function resetDemo() {
    sessionRef.current = null
    setCloseTabReturned(undefined)
    setLastNavigate(undefined)
    setNote('已清空。从「打开首页和设置」重新走。')
    setStep('empty')
  }

  function openTwoPages() {
    const next = createDemoRouter()
    next.router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    next.router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    sessionRef.current = next
    setCloseTabReturned(undefined)
    setLastNavigate(undefined)
    refresh(
      '现在有两个页签：首页 /dashboard，设置 /settings/profile。当前人站在设置页。这和 playground 顶栏先开首页再开另一页一样。',
      'ready',
    )
  }

  async function closeSettings() {
    const current = sessionRef.current
    if (!current)
      return
    current.navigateCalls.length = 0
    const accepted = await current.router.closeTab('/settings/profile')
    setCloseTabReturned(String(accepted))
    refresh(
      accepted
        ? '关闭被接受了，但设置页签还在。Core 只是让宿主 replace 到 /dashboard，要等宿主把新地址回传回来才真删。'
        : '关闭被拒绝了，后面步骤没有意义。',
      'asked',
    )
  }

  function hostReturnsTrailingSlash() {
    const current = sessionRef.current
    if (!current)
      return
    current.router.syncLocation({ pathname: '/dashboard/', search: '', hash: '' })
    refresh(
      '宿主回的是 /dashboard/。规范化后已经离开设置页，设置页签应被删掉，和回精确 /dashboard 一样。',
      'mismatch',
    )
  }

  function hostReturnsExactDashboardAgain() {
    const current = sessionRef.current
    if (!current)
      return
    current.router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    refresh(
      '这次宿主回了精确的 /dashboard。设置页签在上一步已经删掉了，这里只是地址从 /dashboard/ 变成 /dashboard。',
      'retry',
    )
  }

  function hostReturnsExactDashboard() {
    const current = sessionRef.current
    if (!current)
      return
    current.router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    refresh(
      '对照：宿主回的就是 /dashboard。设置页签这时也会被删掉。',
      'matched',
    )
  }

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title="关闭确认差一个字符"
      description="这是一套独立的迷你 Core，不走顶栏真实页签。关掉设置后，宿主回 /dashboard/ 或 /dashboard 都应删掉设置页签；还停在 /settings/profile/ 则继续等。"
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {note}
        </Typography.Paragraph>
        <Space wrap>
          <Button onClick={openTwoPages}>
            1. 打开首页和设置
          </Button>
          <Button disabled={step !== 'ready'} type="primary" onClick={() => void closeSettings()}>
            2. 关掉设置页签
          </Button>
          <Button disabled={step !== 'asked'} danger onClick={hostReturnsTrailingSlash}>
            3a. 宿主回 /dashboard/
          </Button>
          <Button disabled={step !== 'asked'} onClick={hostReturnsExactDashboard}>
            3b. 对照：宿主回 /dashboard
          </Button>
          <Button disabled={step !== 'mismatch'} onClick={hostReturnsExactDashboardAgain}>
            4. 再补一次精确 /dashboard
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
          关页确认已经按规范化比较：差一个斜杠也会删。3a 和 3b 结果应一致，页签栏只剩 /dashboard。
        </Typography.Paragraph>
      </Space>
    </PlaygroundPage>
  )
}
