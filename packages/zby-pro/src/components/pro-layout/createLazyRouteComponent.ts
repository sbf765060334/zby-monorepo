import { createElement, lazy } from 'react'

import type { ComponentType } from 'react'

export interface ProLayoutLazyRouteModule {
  default: ComponentType<Record<string, never>>
}

export type ProLayoutLazyRouteLoader = () => Promise<ProLayoutLazyRouteModule>

export type ProLayoutLazyRouteComponent = ComponentType<Record<string, never>> & {
  preload: () => Promise<void>
}

const lazyRouteResetters = new WeakMap<object, () => void>()

/** 错误边界重试时，为已经 rejected 的路由创建新的 React.lazy 实例。 */
export function resetLazyRouteComponent(component: unknown) {
  if (
    (typeof component === 'function' || typeof component === 'object') &&
    component !== null
  ) {
    lazyRouteResetters.get(component)?.()
  }
}

/** 创建可被 ProLayout 渲染、也可由菜单和页签提前加载的懒页面组件。 */
export function createLazyRouteComponent(
  loader: ProLayoutLazyRouteLoader,
): ProLayoutLazyRouteComponent {
  let modulePromise: Promise<ProLayoutLazyRouteModule> | undefined
  let loadFailed = false
  let LazyComponent = lazy(load)

  function load() {
    if (!modulePromise) {
      loadFailed = false
      const pendingPromise: Promise<ProLayoutLazyRouteModule> = Promise.resolve()
        .then(loader)
        .catch((error: unknown) => {
          if (modulePromise === pendingPromise) {
            modulePromise = undefined
            loadFailed = true
          }
          throw error
        })
      modulePromise = pendingPromise
    }

    return modulePromise
  }

  const Component: ProLayoutLazyRouteComponent = Object.assign(
    () => createElement(LazyComponent),
    { preload: () => load().then(() => undefined) },
  )
  lazyRouteResetters.set(Component, () => {
    if (!loadFailed)
      return
    loadFailed = false
    LazyComponent = lazy(load)
  })
  return Component
}
