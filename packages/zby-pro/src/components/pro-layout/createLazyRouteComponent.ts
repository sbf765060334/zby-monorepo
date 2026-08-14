import { lazy } from 'react'

import type { ComponentType, LazyExoticComponent } from 'react'

export interface ProLayoutLazyRouteModule {
  default: ComponentType<Record<string, never>>
}

export type ProLayoutLazyRouteLoader = () => Promise<ProLayoutLazyRouteModule>

export type ProLayoutLazyRouteComponent = LazyExoticComponent<
  ComponentType<Record<string, never>>
> & {
  preload: () => Promise<void>
}

/** 创建可被 ProLayout 渲染、也可由菜单和页签提前加载的懒页面组件。 */
export function createLazyRouteComponent(
  loader: ProLayoutLazyRouteLoader,
): ProLayoutLazyRouteComponent {
  let modulePromise: Promise<ProLayoutLazyRouteModule> | undefined

  const load = () => {
    if (!modulePromise) {
      const pendingPromise: Promise<ProLayoutLazyRouteModule> = Promise.resolve()
        .then(loader)
        .catch((error: unknown) => {
          if (modulePromise === pendingPromise)
            modulePromise = undefined
          throw error
        })
      modulePromise = pendingPromise
    }

    return modulePromise
  }

  const Component = lazy(load) as ProLayoutLazyRouteComponent
  Component.preload = () => load().then(() => undefined)
  return Component
}
