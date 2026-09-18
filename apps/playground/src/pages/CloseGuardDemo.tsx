import { App, Button, Checkbox, Descriptions, Radio, Space, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useRouterCore, useRouterPage } from '@zby/router-core/react'

import { PlaygroundPage } from '../components/ComponentPlayground'

type DraftGuardMode = 'allow' | 'deny' | 'throw'

export default function CloseGuardDemoPage() {
  const router = useRouterCore()
  const page = useRouterPage()
  const { modal, message } = App.useApp()
  const [dirty, setDirty] = useState(true)
  const [enableDraftGuard, setEnableDraftGuard] = useState(true)
  const [draftGuardMode, setDraftGuardMode] = useState<DraftGuardMode>('allow')
  const [events, setEvents] = useState<string[]>([])
  const [lastCloseResult, setLastCloseResult] = useState('还没关')

  const dirtyRef = useRef(dirty)
  const enableDraftGuardRef = useRef(enableDraftGuard)
  const draftGuardModeRef = useRef(draftGuardMode)
  dirtyRef.current = dirty
  enableDraftGuardRef.current = enableDraftGuard
  draftGuardModeRef.current = draftGuardMode

  function log(text: string) {
    setEvents((current) => [...current, text])
  }

  const logRef = useRef(log)
  logRef.current = log

  useEffect(() => {
    async function dirtyGuard() {
      logRef.current('未保存守卫：开始')
      if (!dirtyRef.current) {
        logRef.current('未保存守卫：没有改动，放行')
        return true
      }
      logRef.current('未保存守卫：弹出确认')
      return await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: '表单还没保存',
          content: '确定关掉这个页签吗？',
          okText: '关掉',
          cancelText: '不关',
          onOk() {
            logRef.current('未保存守卫：用户点了关掉')
            resolve(true)
          },
          onCancel() {
            logRef.current('未保存守卫：用户点了不关')
            resolve(false)
          },
        })
      })
    }

    async function draftGuard() {
      logRef.current('草稿守卫：开始')
      if (!enableDraftGuardRef.current) {
        logRef.current('草稿守卫：未启用，放行')
        return true
      }
      if (draftGuardModeRef.current === 'throw') {
        logRef.current('草稿守卫：抛错')
        throw new Error('草稿守卫失败')
      }
      if (draftGuardModeRef.current === 'deny') {
        logRef.current('草稿守卫：拒绝关闭')
        return false
      }
      logRef.current('草稿守卫：已经把草稿发出去了')
      return true
    }

    router.addBeforeCloseHook(dirtyGuard, page.pathname)
    router.addBeforeCloseHook(draftGuard, page.pathname)
    return () => {
      router.clearBeforeCloseHook(page.pathname, dirtyGuard)
      router.clearBeforeCloseHook(page.pathname, draftGuard)
    }
  }, [modal, page.pathname, router])

  async function runClose(
    action: () => Promise<boolean>,
    skippedGuards: boolean,
  ) {
    try {
      const accepted = await action()
      setLastCloseResult(String(accepted))
      if (!accepted)
        void message.warning('关闭没有被接受，页签还在。')
      else if (skippedGuards)
        void message.success('已跳过守卫，关闭被接受。')
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      log(`closeTab 抛错：${reason}`)
      setLastCloseResult(`抛错：${reason}`)
      void message.error('守卫抛错，页签还在。')
    }
  }

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title="关闭门禁"
      description="这页挂在 playground 真实页签上。顶栏这个页签的 ×、下面的关闭按钮，走的是同一套 addBeforeCloseHook。两个守卫按注册顺序串行，前面说不关，后面不会跑。"
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Space wrap>
          <Checkbox
            checked={dirty}
            onChange={(event) => setDirty(event.target.checked)}
          >
            表单已改过（dirty）
          </Checkbox>
          <Checkbox
            checked={enableDraftGuard}
            onChange={(event) => setEnableDraftGuard(event.target.checked)}
          >
            启用第二个草稿守卫
          </Checkbox>
        </Space>
        <Radio.Group
          disabled={!enableDraftGuard}
          optionType="button"
          value={draftGuardMode}
          onChange={(event) => setDraftGuardMode(event.target.value)}
          options={[
            { label: '草稿放行', value: 'allow' },
            { label: '草稿拒绝', value: 'deny' },
            { label: '草稿抛错', value: 'throw' },
          ]}
        />
        <Space wrap>
          <Button
            onClick={() => {
              router.jumpTo('/dashboard')
            }}
          >
            先打开首页
          </Button>
          <Button
            type="primary"
            onClick={() => {
              void runClose(() => router.closeTab(page.tabKey), false)
            }}
          >
            关掉当前页签
          </Button>
          <Button
            onClick={() => {
              void runClose(
                () =>
                  router.closeThisTabOpenNewOne({
                    oldPath: page.pathname,
                    newPath: '/dashboard',
                  }),
                false,
              )
            }}
          >
            替换到首页（跑守卫）
          </Button>
          <Button
            onClick={() => {
              void runClose(
                () =>
                  router.closeThisTabOpenNewOne(
                    {
                      oldPath: page.pathname,
                      newPath: '/dashboard',
                    },
                    { skipBeforeClose: true },
                  ),
                true,
              )
            }}
          >
            替换到首页并跳过守卫
          </Button>
          <Button
            onClick={() => {
              setEvents([])
              setLastCloseResult('还没关')
            }}
          >
            清空日志
          </Button>
        </Space>
        <Descriptions
          bordered
          size="small"
          column={1}
          title="当前页"
          items={[
            { label: 'pathname', children: page.pathname },
            { label: '页签 key', children: page.tabKey },
            { label: '最近一次关闭', children: lastCloseResult },
            { label: '守卫日志', children: events.join(' → ') || '还没有' },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          只剩一个页签时关不掉，先点「打开首页」。dirty 打开时点 × 会先出确认框；点「不关」，日志里不应出现草稿守卫。
          切到首页后再关这个页签，keep-alive 下守卫仍然有效。
        </Typography.Paragraph>
      </Space>
    </PlaygroundPage>
  )
}
