import { RouterCoreProvider } from '@zby/router-core/react'
import { RouterCoreReactRouterAdapter } from '@zby/router-core/react-router'
import { memo } from 'react'

import ProLayout from './ProLayout'
import { FavoriteMenusProvider } from './favorites'
import { ProLayoutThemeProvider } from './theme'
import type { ReactRouterProLayoutProps } from './types'

/**
 * React Router 版 ProLayout 装配入口。
 *
 * 调用方只传入在 React 树外创建的 router 实例。Provider 负责运行时回调和 hydration，
 * Adapter 负责宿主 location/navigate；ProLayoutCore 只负责 UI 与浏览器副作用。
 */
export function ReactRouterProLayout(props: ReactRouterProLayoutProps) {
  const { onStorageError, onTabClose, router, ...layoutProps } = props

  return (
    <RouterCoreProvider
      router={router}
      onStorageError={onStorageError}
      onTabClose={onTabClose}
    >
      <RouterCoreReactRouterAdapter>
        <ProLayoutThemeProvider config={layoutProps.theme}>
          <FavoriteMenusProvider router={router}>
            <ProLayout {...layoutProps} />
          </FavoriteMenusProvider>
        </ProLayoutThemeProvider>
      </RouterCoreReactRouterAdapter>
    </RouterCoreProvider>
  )
}

export default memo(ReactRouterProLayout)
