import { memo, useLayoutEffect, useRef } from 'react'

import type { StoreApi } from 'zustand/vanilla'

import type { ProLayoutStoreState } from '../store'

export interface PathnameSyncEffectsProps {
  store: StoreApi<ProLayoutStoreState>
  pathname: string
}

interface BootstrapSnapshot {
  store: StoreApi<ProLayoutStoreState>
  pathname: string
}

/**
 * 把宿主 Router 的 pathname 转换为 ProLayout 的目录跳转、活动页签和页面状态。
 *
 * routes、权限和默认跳转地址都属于 Store 创建时固定的 Registry 快照；这里仅响应
 * 宿主 pathname 变化。bootstrap 不能只在首次挂载执行，因为浏览器前进后退或外部
 * 导航也可能在挂载后进入根路径或目录路由。
 */
function PathnameSyncEffects(props: PathnameSyncEffectsProps) {
  const { store, pathname } = props
  const lastBootstrapRef = useRef<BootstrapSnapshot | null>(null)

  useLayoutEffect(() => {
    store.getState().syncExternalDeps({ currentPathname: pathname })

    const previous = lastBootstrapRef.current
    if (
      previous?.store === store &&
      previous.pathname === pathname
    ) {
      // React StrictMode 会在开发环境重放 Effect。相同 Store 和 pathname 已经处理过时
      // 跳过重复导航；路由配置变化需要重新挂载 ProLayout 才能生效。
      return
    }

    lastBootstrapRef.current = { store, pathname }
    store.getState().bootstrapByPathname({ pathname })
  }, [pathname, store])

  useLayoutEffect(() => {
    // 根路径和目录会被 syncByPathname 安全忽略；叶子页在 Router 地址真正生效后才
    // 创建或激活页签与页面实例，避免 jumpTo 阶段提前渲染目标页面。
    store.getState().syncByPathname(pathname)
  }, [pathname, store])

  return null
}

export default memo(PathnameSyncEffects)
