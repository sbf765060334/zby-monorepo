import { RouterCoreProvider } from '@zby/router-core/react'
import { memo } from 'react'

import ProLayout from './ProLayout'
import type { ReactRouterProLayoutProps } from './types'

/**
 * React Router 版 ProLayout 装配入口。
 *
 * 调用方只传入在 React 树外创建的 router 实例。Provider 负责运行时回调、hydration，
 * 以及 React Router 的 location/navigate；ProLayoutCore 只负责 UI 与浏览器副作用。
 */
export function ReactRouterProLayout(props: ReactRouterProLayoutProps) {
  const { onStorageError, onTabClose, router, ...layoutProps } = props

  return (
    <RouterCoreProvider
      router={router}
      onStorageError={onStorageError}
      onTabClose={onTabClose}
    >
      <ProLayout {...layoutProps} />
    </RouterCoreProvider>
  )
}

export default memo(ReactRouterProLayout)
