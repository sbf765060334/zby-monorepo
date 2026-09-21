import { createElement, lazy } from 'react'

import type { ComponentType } from 'react'

export interface ProLayoutLazyPageModule {
  default: ComponentType<Record<string, never>>
}

export type ProLayoutLazyPageLoader = () => Promise<ProLayoutLazyPageModule>

export type ProLayoutLazyPage = ComponentType<Record<string, never>> & {
  preload: () => Promise<void>
}

const lazyPageResetters = new WeakMap<object, () => void>()

/** 错误边界重试时，为已经 rejected 的路由创建新的 React.lazy 实例。 */
export function resetLazyPage(component: unknown) {
  if (
    (typeof component === 'function' || typeof component === 'object') &&
    component !== null
  ) {
    lazyPageResetters.get(component)?.()
  }
}

/** 创建可被 ProLayout 渲染的懒页面组件；首次进入时才加载模块。 */
export function lazyPage(
  loader: ProLayoutLazyPageLoader,
): ProLayoutLazyPage {
  let modulePromise: Promise<ProLayoutLazyPageModule> | undefined
  let loadFailed = false
  let LazyComponent = lazy(load)

  function load() {
    if (!modulePromise) {
      loadFailed = false
      const pendingPromise: Promise<ProLayoutLazyPageModule> = Promise.resolve()
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

  const Component: ProLayoutLazyPage = Object.assign(
    () => createElement(LazyComponent),
    { preload: () => load().then(() => undefined) },
  )
  lazyPageResetters.set(Component, () => {
    if (!loadFailed)
      return
    loadFailed = false
    LazyComponent = lazy(load)
  })
  return Component
}
