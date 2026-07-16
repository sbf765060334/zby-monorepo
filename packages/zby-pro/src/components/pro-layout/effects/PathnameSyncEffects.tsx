import { memo, useLayoutEffect, useRef } from 'react'

import type { StoreApi } from 'zustand/vanilla'

import type { ProLayoutStoreState } from '../store'

export interface PathnameSyncEffectsProps {
  store: StoreApi<ProLayoutStoreState>
  pathname: string
  defaultRoute?: string | null
}

interface BootstrapSnapshot {
  store: StoreApi<ProLayoutStoreState>
  pathname: string
  defaultRoute?: string | null
}

/**
 * 把宿主 Router 的 pathname 转换为 ProLayout 的目录跳转、活动页签和页面状态。
 *
 * bootstrap 不能只在首次挂载执行：浏览器前进后退或外部导航也可能在挂载后进入根
 * 路径或目录路由。每个新 pathname 都先解析默认落点，再同步可以直接展示的叶子页。
 */
function PathnameSyncEffects(props: PathnameSyncEffectsProps) {
  const { store, pathname, defaultRoute } = props
  const lastBootstrapRef = useRef<BootstrapSnapshot | null>(null)

  useLayoutEffect(() => {
    const previous = lastBootstrapRef.current
    if (
      previous?.store === store &&
      previous.pathname === pathname &&
      previous.defaultRoute === defaultRoute
    ) {
      // React StrictMode 会在开发环境重放 Effect。相同输入已经处理过时跳过重复导航，
      // 但 pathname、defaultRoute 或 Store 任一变化都会重新执行目录解析。
      return
    }

    lastBootstrapRef.current = { store, pathname, defaultRoute }
    // Registry 在没有任何可访问页面时使用 `/` 表示“没有默认落点”。不能把它再次
    // 作为根路径的导航目标，否则宿主 Router 可能收到无意义的 `/ → /` 自导航。
    store.getState().bootstrapByPathname({
      pathname,
      defaultRoute: defaultRoute === '/' ? null : defaultRoute,
    })
  }, [defaultRoute, pathname, store])

  useLayoutEffect(() => {
    // 根路径和目录会被 syncByPathname 安全忽略；叶子页在 Router 地址真正生效后才
    // 创建或激活页签与页面实例，避免 jumpTo 阶段提前渲染目标页面。
    store.getState().syncByPathname(pathname)
  }, [pathname, store])

  return null
}

export default memo(PathnameSyncEffects)
