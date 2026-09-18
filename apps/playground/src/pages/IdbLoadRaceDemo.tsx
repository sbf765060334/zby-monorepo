import { Button, Descriptions, Space, Typography } from 'antd'
import { useRef, useState } from 'react'
import { createRouterCore } from '@zby/router-core'

import { PlaygroundPage } from '../components/ComponentPlayground'

import type { RouterRoute, RouterStorageAdapter, RouterStorageState } from '@zby/router-core'

const demoRoutes: RouterRoute[] = [
  { path: '/dashboard', title: '首页', element: {} },
  { path: '/settings/profile', title: '设置', element: {} },
]

type DemoStep = 'empty' | 'raced' | 'flushed'

function formatFavs(paths: readonly string[]) {
  return paths.length ? paths.join(' ， ') : '（空）'
}

function copyDisk(disk: RouterStorageState): RouterStorageState {
  return {
    fixedTabs: [...disk.fixedTabs],
    fixedParamsPathMap: { ...disk.fixedParamsPathMap },
    favoriteRoutePaths: [...disk.favoriteRoutePaths],
  }
}

function createWriteQueue() {
  const tails = new Map<string, Promise<void>>()
  return (storageKey: string, action: () => Promise<void>) => {
    const previous = tails.get(storageKey) || Promise.resolve()
    const operation = previous.catch(() => undefined).then(action)
    tails.set(
      storageKey,
      operation.then(
        () => undefined,
        () => undefined,
      ),
    )
    return operation
  }
}

function createRaceStore(loadJoinsQueue: boolean) {
  const disk: RouterStorageState = {
    fixedTabs: [],
    fixedParamsPathMap: {},
    favoriteRoutePaths: [],
  }
  const events: string[] = []
  const enqueueWrite = createWriteQueue()
  let releaseWrites!: () => void
  const writeGate = new Promise<void>((resolve) => {
    releaseWrites = resolve
  })
  let markSaveWaiting!: () => void
  const saveWaiting = new Promise<void>((resolve) => {
    markSaveWaiting = resolve
  })

  const adapter: RouterStorageAdapter = {
    async load(storageKey) {
      if (!loadJoinsQueue) {
        events.push(`load 直读收藏 ${formatFavs(disk.favoriteRoutePaths)}`)
        return copyDisk(disk)
      }
      let loaded: RouterStorageState = copyDisk(disk)
      await enqueueWrite(storageKey, async () => {
        loaded = copyDisk(disk)
        events.push(`load 排队后读到收藏 ${formatFavs(loaded.favoriteRoutePaths)}`)
      })
      return loaded
    },
    update(storageKey, recipe) {
      const run = async () => {
        events.push(`update 排队，要写收藏 ${formatFavs(recipe(copyDisk(disk)).favoriteRoutePaths)}`)
        markSaveWaiting()
        await writeGate
        const next = recipe(copyDisk(disk))
        disk.fixedTabs = [...next.fixedTabs]
        disk.fixedParamsPathMap = { ...next.fixedParamsPathMap }
        disk.favoriteRoutePaths = [...next.favoriteRoutePaths]
        events.push(`update 落盘，收藏 ${formatFavs(disk.favoriteRoutePaths)}`)
      }
      return loadJoinsQueue ? enqueueWrite(storageKey, run) : run()
    },
  }

  return {
    adapter,
    disk,
    events,
    loadJoinsQueue,
    saveWaiting,
    releaseWrites,
  }
}

function createWindow(adapter: RouterStorageAdapter) {
  return createRouterCore({
    routes: demoRoutes,
    storageAdapter: adapter,
    storageKey: 'demo',
  })
}

type Session = ReturnType<typeof createRaceStore> & {
  windowA: ReturnType<typeof createRouterCore>
  windowB: ReturnType<typeof createRouterCore> | null
  hydrationB: Promise<void> | null
}

function describeSession(session: Session) {
  return [
    {
      label: '磁盘上的收藏',
      children: formatFavs(session.disk.favoriteRoutePaths),
    },
    {
      label: '窗口 A 内存',
      children: formatFavs(session.windowA.getState().favoriteRoutePaths),
    },
    {
      label: '窗口 B 内存',
      children: session.windowB
        ? formatFavs(session.windowB.getState().favoriteRoutePaths)
        : '还没打开',
    },
    {
      label: '窗口 B 加载中',
      children: session.windowB?.getState().storageLoading ? '是，还在等队列' : '否',
    },
    {
      label: 'load 是否进队',
      children: session.loadJoinsQueue ? 'Adapter 自己也进队' : 'Adapter 不进队，Core 仍排队',
    },
    {
      label: '读写顺序',
      children: session.events.join(' → ') || '还没有',
    },
  ]
}

export default function IdbLoadRaceDemoPage() {
  const sessionRef = useRef<Session | null>(null)
  const [step, setStep] = useState<DemoStep>('empty')
  const [note, setNote] = useState(
    '还没开始。两个窗口共用一个 Adapter。Core 会把同一把钥匙的 load/update 排队。',
  )

  const session = sessionRef.current
  const items = session
    ? describeSession(session)
    : [
        { label: '磁盘上的收藏', children: '（空）' },
        { label: '窗口 A 内存', children: '还没打开' },
        { label: '窗口 B 内存', children: '还没打开' },
        { label: '窗口 B 加载中', children: '否' },
        { label: 'load 是否进队', children: '还没选' },
        { label: '读写顺序', children: '还没有' },
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

  async function runRace(loadJoinsQueue: boolean) {
    const store = createRaceStore(loadJoinsQueue)
    const windowA = createWindow(store.adapter)
    await windowA.hydrateStorage()
    windowA.toggleFavoriteRoute('/settings/profile')
    await Promise.resolve()
    await Promise.resolve()
    await store.saveWaiting

    const windowB = createWindow(store.adapter)
    const hydrationB = windowB.hydrateStorage()
    const session: Session = {
      ...store,
      windowA,
      windowB,
      hydrationB,
    }
    sessionRef.current = session

    refresh(
      loadJoinsQueue
        ? '窗口 A 已经收藏设置，update 还卡在队列里。窗口 B 的 load 也在等前面的 update。'
        : 'Adapter.load 自己不排队，但 Core 仍把 B 的 load 排在 A 的 update 后面。',
      'raced',
    )
  }

  async function flushWrites() {
    const current = sessionRef.current
    if (!current)
      return
    current.releaseWrites()
    await Promise.resolve()
    if (current.hydrationB)
      await current.hydrationB
    refresh(
      '写入放行后，B 等到 A 写完再读，两边内存和磁盘都是设置。',
      'flushed',
    )
  }

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title="IndexedDB 读写排队"
      description="这是一套独立的迷你 Core。同一 Adapter、同一把钥匙的 load 和 update 会排队；写的时候对着磁盘最新值改，不拿手里过期快照整表覆盖。"
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {note}
        </Typography.Paragraph>
        <Space wrap>
          <Button
            type="primary"
            disabled={step !== 'empty'}
            onClick={() => void runRace(true)}
          >
            2a. 现状：load 进写队列
          </Button>
          <Button
            disabled={step !== 'empty'}
            onClick={() => void runRace(false)}
          >
            2b. Adapter.load 不排队，Core 仍排队
          </Button>
          <Button
            disabled={step !== 'raced'}
            onClick={() => void flushWrites()}
          >
            3. 放行卡住的写入
          </Button>
          <Button onClick={resetDemo}>
            从头再来
          </Button>
        </Space>
        <Descriptions
          bordered
          size="small"
          column={1}
          title="这一步之后的账本和内存"
          items={items}
        />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          2a：Adapter.load 自己也进队。第 3 步之后两边都是设置。
          2b：Adapter.load 直读，但经 Core 调用时仍会排在 update 后面，结果一样。
        </Typography.Paragraph>
      </Space>
    </PlaygroundPage>
  )
}
