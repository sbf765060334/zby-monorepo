import { memo, useLayoutEffect } from 'react'

import type { StoreApi } from 'zustand/vanilla'

import type { ProLayoutExternalDeps, ProLayoutStoreState } from '../store'

/** Core 每次渲染后需要同步到稳定 Store 的外部依赖。 */
export type SyncExternalDepsEffectsProps = Omit<
  ProLayoutExternalDeps,
  'currentPathname' | 'registry'
> & {
  store: StoreApi<ProLayoutStoreState>
}

/**
 * 在浏览器绘制前把 React/Core 的最新依赖同步到生命周期稳定的 Zustand Store。
 *
 * Store 只在 ProLayout 首次渲染时创建一次，locale、回调与持久化来源则可能在后续
 * 渲染变化。集中在 layout effect 中一次同步，可以避免 UI 子组件先
 * 使用旧依赖绘制一帧，也避免每个消费者各自维护一套 prop 到 Store 的桥接逻辑。
 * Registry 和 pathname 由 PathnameSyncEffects 统一同步，确保路由派生状态只有一个入口。
 */
function SyncExternalDepsEffects(props: SyncExternalDepsEffectsProps) {
  const {
    afterTabClose,
    breadcrumbHeight,
    headerHeight,
    intl,
    maxFixedTabCount,
    messageApi,
    navigate,
    noBar,
    onPageDisplay,
    onStorageLoadError,
    renderLogo,
    showBreadcrumb,
    storageKey,
    store,
    systemList,
  } = props

  useLayoutEffect(() => {
    // intl 必须跟随 locale 更新；storageKey 使用挂载时固定的 Adapter 切换命名空间，
    // 并利用 generation 丢弃旧 key 晚到的异步结果。
    store.getState().syncExternalDeps({
      afterTabClose,
      breadcrumbHeight,
      headerHeight,
      intl,
      maxFixedTabCount,
      messageApi,
      navigate,
      noBar,
      onPageDisplay,
      onStorageLoadError,
      renderLogo,
      showBreadcrumb,
      storageKey,
      systemList,
    })
  }, [
    afterTabClose,
    breadcrumbHeight,
    headerHeight,
    intl,
    maxFixedTabCount,
    messageApi,
    navigate,
    noBar,
    onPageDisplay,
    onStorageLoadError,
    renderLogo,
    showBreadcrumb,
    storageKey,
    store,
    systemList,
  ])

  return null
}

export default memo(SyncExternalDepsEffects)
