import { createContext, useContext, useEffect, useLayoutEffect } from 'react'

import type { ReactNode } from 'react'
import type {
  RouterCore,
  RouterCoreState,
  RouterRoute,
  RouterRuntimeOptions,
} from '../types'
import { useStoreSelector } from './useStoreSelector'
import type { RouterSelectorEqualityFn } from './useStoreSelector'

/**
 * React Context 只能保存一种静态泛型实例；真正的 Route 类型由消费 Hook 的泛型恢复。
 * Context 本身不公开，防止调用方绕过缺少 Provider 时的明确错误。
 */
const RouterCoreContext = createContext<unknown>(null)

/**
 * 把既有 RouterCore 实例接入 React 树时允许提供的参数。
 *
 * routes、hasAuth、keepAlive 和 storageAdapter 等固定配置只传给 createRouterCore，
 * Provider 不重复接收。这里的运行时参数可以随 React render 更新而不重建 core。
 */
export interface RouterCoreProviderProps<
  Route extends RouterRoute = RouterRoute,
> extends RouterRuntimeOptions {
  /** 在 React 树外创建并保持稳定引用的 RouterCore 实例。 */
  router: RouterCore<Route>
  /** 可以读取同一个 core 实例的后代 React 节点。 */
  children: ReactNode
}

/**
 * 向 React 子树提供 RouterCore，并同步可变化的运行时配置和持久化加载。
 *
 * Provider 不拥有 router 的生命周期，也不会在 render 中调用 createRouterCore。切换
 * router prop 会让后代改用新实例，并为新实例执行一次幂等 hydration；旧实例是否继续
 * 使用由调用方决定。
 */
export function RouterCoreProvider<Route extends RouterRoute>(
  props: RouterCoreProviderProps<Route>,
) {
  const {
    children,
    maxFixedTabCount,
    onStorageError,
    onTabClose,
    router,
    storageKey,
  } = props

  useLayoutEffect(() => {
    // 所有字段都显式传递，使移除回调 prop 时 core 也能清理旧回调引用。
    // storageKey/maxFixedTabCount 的 undefined 语义由 core 保持为“沿用当前值”。
    router.configureRuntime({
      maxFixedTabCount,
      onStorageError,
      onTabClose,
      storageKey,
    })
  }, [maxFixedTabCount, onStorageError, onTabClose, router, storageKey])

  useEffect(() => {
    // hydrateStorage 自身负责 StrictMode 重放、并发复用和已完成状态判断。
    void router.hydrateStorage()
  }, [router])

  // 不在 Context value 中混入 runtime props，避免回调或 storageKey 更新使所有消费者
  // 被动重渲染；需要观察的运行状态已经由 router.store 精确发布。
  return (
    <RouterCoreContext.Provider value={router}>
      {children}
    </RouterCoreContext.Provider>
  )
}

/**
 * 读取当前 React 子树绑定的 RouterCore 实例。
 *
 * @typeParam Route createRouterCore 创建时推导出的业务路由类型。
 * @throws 在 RouterCoreProvider 外调用时抛出明确错误，避免返回无副作用假实现掩盖配置问题。
 */
export function useRouterCore<
  Route extends RouterRoute = RouterRoute,
>(): RouterCore<Route> {
  const router = useContext(RouterCoreContext)
  if (!router)
    throw new Error('useRouterCore 必须在 RouterCoreProvider 内调用。')

  // Provider 与消费 Hook 跨越同一个无运行时类型信息的 React Context；Route 只影响
  // TypeScript 中保留的业务元数据，不改变 core 的运行时协议。
  return router as RouterCore<Route>
}

/**
 * 精确订阅 RouterCore 状态的一部分。
 *
 * 默认使用 Object.is 比较选择结果；选择对象或数组时可以传 equalityFn 复用等价结果。
 * 命令不会进入状态快照，需要调用命令时请使用 useRouterCore 获取稳定实例。
 */
export function useRouterCoreSelector<
  Route extends RouterRoute,
  Selected,
>(
  selector: (state: RouterCoreState<Route>) => Selected,
  equalityFn?: RouterSelectorEqualityFn<Selected>,
): Selected {
  const router = useRouterCore<Route>()
  return useStoreSelector(router.store, selector, equalityFn)
}
