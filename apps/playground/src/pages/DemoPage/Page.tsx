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
            playground 的默认页是 /dashboard。只剩这一个页签时，顶栏会收掉关闭按钮；
            下面这个按钮直接调 closeTab。关掉后会先去 /，再被送回首页，等于没关。
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
