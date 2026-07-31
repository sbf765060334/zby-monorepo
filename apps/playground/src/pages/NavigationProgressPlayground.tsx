import NProgress from 'nprogress'
import { Button, Space, Typography } from 'antd'
import React from 'react'

import { ProLayoutContentContainer } from '@zby/pro'

const { Text, Title } = Typography

const DISPLAY_DURATION = 2000

export default function NavigationProgressPlayground() {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isStarted, setIsStarted] = React.useState(false)

  const clearTimer = React.useCallback(() => {
    if (timerRef.current === null)
      return

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
    <ProLayoutContentContainer mode="stack">
      <ProLayoutContentContainer.Item>
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <header>
            <Title level={3} style={{ margin: 0 }}>
              Navigation Progress
            </Title>
            <Text type="secondary">Manual NProgress test</Text>
          </header>

          <Space wrap>
            <Button type="primary" onClick={startProgress}>
              Start for 2 seconds
            </Button>
            <Button onClick={stopProgress} disabled={!isStarted}>
              Stop now
            </Button>
          </Space>
        </Space>
      </ProLayoutContentContainer.Item>
    </ProLayoutContentContainer>
  )
}
