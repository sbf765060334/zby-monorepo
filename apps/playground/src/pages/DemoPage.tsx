import { useRouterCore } from '@zby/router-core/react'
import { useState } from 'react'

export default function DemoPage() {
  const [random] = useState(() => Math.random().toString())
  const router = useRouterCore()

  const handleJumpTo404Page = () => {
    router.jumpTo('/sample/input-range-input-123')
  }
  return (
    <div>
      <div>Demo Page: { random }</div>
      <div onClick={handleJumpTo404Page}>跳转到404页面</div>
    </div>
  )
}
