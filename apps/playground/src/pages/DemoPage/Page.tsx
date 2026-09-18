import { Button, Space, Typography } from 'antd'
import { useRouterCore, useRouterPage } from '@zby/router-core/react'
import { useState } from 'react'

export default function DemoPage() {
  const [random] = useState(() => Math.random().toString())
  const router = useRouterCore()
  const page = useRouterPage()
  const isDashboard = page.pathname === '/dashboard'

  const handleJumpTo404Page = () => {
    router.jumpTo('/sample/input-range-input')
  }

  return (
    <div>
      <div>Demo Page: {random}</div>
      <div onClick={handleJumpTo404Page}>跳转到404页面</div>
      {isDashboard ? (
        <Space orientation="vertical" size={8} style={{ marginTop: 16 }}>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            只剩一个页签时 closeTab 会直接返回 false，不再绕到 / 再被默认页打开。
            顶栏本来就会收掉关闭按钮；下面这个按钮用来确认 Core 同样拒绝关闭。
          </Typography.Paragraph>
          <Button
            onClick={() => {
              void router.closeTab(page.tabKey)
            }}
          >
            关掉当前首页页签
          </Button>
        </Space>
      ) : null}
    </div>
  )
}
