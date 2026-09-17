import { Button, Space } from 'antd'
import NProgress from 'nprogress'
import * as React from 'react'

import { PlaygroundCase } from '../../../components/ComponentPlayground'

const DISPLAY_DURATION = 2000

export default function ManualProgressExample() {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isStarted, setIsStarted] = React.useState(false)

  const clearTimer = React.useCallback(() => {
    if (timerRef.current === null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const stopProgress = React.useCallback(() => {
    clearTimer()
    NProgress.done()
    setIsStarted(false)
  }, [clearTimer])

  const startProgress = React.useCallback(() => {
    clearTimer()
    NProgress.start()
    setIsStarted(true)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      NProgress.done()
      setIsStarted(false)
    }, DISPLAY_DURATION)
  }, [clearTimer])

  React.useEffect(() => stopProgress, [stopProgress])

  return (
    <PlaygroundCase
      title="手动触发"
      description="模拟路由切换时的顶部进度条，两秒后自动结束。"
    >
      <Space wrap>
        <Button type="primary" onClick={startProgress}>
          开始 2 秒
        </Button>
        <Button onClick={stopProgress} disabled={!isStarted}>
          立即结束
        </Button>
      </Space>
    </PlaygroundCase>
  )
}
