import { Button, Descriptions, Space, Typography } from 'antd'
import { useRef, useState } from 'react'
import { createRouterCore } from '@zby/router-core'

import { PlaygroundPage } from '../components/ComponentPlayground'

import type { RouterBeforeCloseHook, RouterRoute } from '@zby/router-core'

const demoRoutes: RouterRoute[] = [
  { path: '/dashboard', title: '首页', element: {} },
  { path: '/settings/profile', title: '设置', element: {} },
]

type DemoStep = 'empty' | 'waiting' | 'done'
type DemoMode = 'serial' | 'parallel'

function createGuards() {
  const events: string[] = []
  let resolveDirty: ((value: boolean) => void) | undefined

  const dirtyGuard: RouterBeforeCloseHook = () => {
    events.push('未保存守卫：弹窗已经出来了，等你点不关')
    return new Promise<boolean>((resolve) => {
      resolveDirty = resolve
    })
  }

  const autosaveGuard: RouterBeforeCloseHook = () => {
    events.push('草稿上报守卫：已经把草稿 POST 出去了')
    return true
  }

  return {
    events,
    dirtyGuard,
    autosaveGuard,
    rejectClose() {
      if (!resolveDirty)
        return
      events.push('用户点了不关')
      resolveDirty(false)
      resolveDirty = undefined
    },
  }
}

function createDemoRouter() {
  const router = createRouterCore({ routes: demoRoutes, storageAdapter: false })
  router.bindHost({
    navigate: () => undefined,
  })
  router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
  router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
  return router
}

type Session = ReturnType<typeof createGuards> & {
  router: ReturnType<typeof createRouterCore>
  mode: DemoMode
  closePromise: Promise<boolean>
  closeReturned?: string
}

function describeSession(session: Session) {
  const state = session.router.getState()
  return [
    {
      label: '跑法',
      children: session.mode === 'serial'
        ? '现状：Core 按注册顺序一个一个问'
        : '对照：旧的 Promise.all 一起问',
    },
    { label: '页签栏', children: state.tabs.map((tab) => tab.key).join(' ， ') || '（空）' },
    { label: '草稿已经上报', children: session.events.some((item) => item.includes('POST')) ? '是，发出去了' : '还没有' },
    { label: 'closeTab 返回值', children: session.closeReturned ?? '还在等未保存弹窗' },
    { label: '发生顺序', children: session.events.join(' → ') || '还没有' },
  ]
}

export default function ParallelCloseGuardsDemoPage() {
  const sessionRef = useRef<Session | null>(null)
  const [step, setStep] = useState<DemoStep>('empty')
  const [note, setNote] = useState(
    '还没开始。设置页挂了两个守卫：先问「未保存要不要关」，再「关之前上报草稿」。',
  )

  const session = sessionRef.current
  const items = session
    ? describeSession(session)
    : [
        { label: '跑法', children: '还没选' },
        { label: '页签栏', children: '（空）' },
        { label: '草稿已经上报', children: '还没有' },
        { label: 'closeTab 返回值', children: '还没关' },
        { label: '发生顺序', children: '还没有' },
      ]

  function refresh(nextNote: string, nextStep: DemoStep) {
    setNote(nextNote)
    setStep(nextStep)
  }

  function resetDemo() {
    sessionRef.current = null
    setNote('已清空。重新选 2a 或 2b。')
    setStep('empty')
  }

  function startSerial() {
    const router = createDemoRouter()
    const guards = createGuards()
    router.addBeforeCloseHook(guards.dirtyGuard, '/settings/profile')
    router.addBeforeCloseHook(guards.autosaveGuard, '/settings/profile')
    sessionRef.current = {
      ...guards,
      router,
      mode: 'serial',
      closePromise: router.closeTab('/settings/profile'),
    }
    refresh(
      '这是现在的 Core。未保存弹窗还没回答，后面的草稿上报根本没轮到。',
      'waiting',
    )
  }

  function startParallel() {
    const router = createDemoRouter()
    const guards = createGuards()
    sessionRef.current = {
      ...guards,
      router,
      mode: 'parallel',
      closePromise: Promise.all([
        Promise.resolve(guards.dirtyGuard()),
        Promise.resolve(guards.autosaveGuard()),
      ]).then((results) => results.every((result) => result === true)),
    }
    refresh(
      '这是改之前的对照，不是现在的 Core。两个守卫已经同时开工，草稿上报已经跑完了。',
      'waiting',
    )
  }

  async function sayNo() {
    const current = sessionRef.current
    if (!current)
      return
    current.rejectClose()
    current.closeReturned = String(await current.closePromise)
    refresh(
      current.mode === 'serial'
        ? '关闭被拒绝了，设置页签还在。草稿上报没被叫到，所以没发出去。'
        : '关闭被拒绝了，设置页签还在。可是草稿已经发出去了，拦不住。',
      'done',
    )
  }

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title="关闭守卫串行"
      description="这是一套独立的迷你 Core。同一页两个关闭守卫时，Core 按注册顺序一个一个问；前面说不关，后面的副作用不会跑。对照是改之前的 Promise.all。"
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {note}
        </Typography.Paragraph>
        <Space wrap>
          <Button
            type="primary"
            disabled={step !== 'empty'}
            onClick={startSerial}
          >
            2a. 现状：一个一个问
          </Button>
          <Button
            disabled={step !== 'empty'}
            onClick={startParallel}
          >
            2b. 对照：Promise.all 一起问
          </Button>
          <Button
            disabled={step !== 'waiting'}
            danger
            onClick={() => void sayNo()}
          >
            3. 未保存点「不关」
          </Button>
          <Button onClick={resetDemo}>
            从头再来
          </Button>
        </Space>
        <Descriptions
          bordered
          size="small"
          column={1}
          title="这一步之后发生了什么"
          items={items}
        />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          2a 点完发生顺序里只有未保存弹窗，草稿还没上报。3 之后 closeTab 是 false，草稿上报也不会出现。
          2b 一点就能看到草稿已经上报，那是旧行为。
        </Typography.Paragraph>
      </Space>
    </PlaygroundPage>
  )
}
