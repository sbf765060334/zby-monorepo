/**
 * 文件职责：为每个 KeepAlive 页面建立独立 Context，保存它自己的地址和激活状态。
 *
 * 全局 Core 关心所有页签，这个文件只关心“当前这一页”。业务页面因此可以订阅自己的
 * pathname、location、active 等数据，而不会因其它页签变化被无意义地重新渲染。
 */
import { createContext, useContext, useLayoutEffect, useState } from 'react'
import { createStore } from 'zustand/vanilla'

import type { ReactNode } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type {
  RouterCore,
  RouterCurrentRoute,
  RouterLocationEventPayload,
  RouterPage,
  RouterRoute,
} from '../types'
import { useRouterCore } from './RouterCoreProvider'
import { useStoreSelector } from './useStoreSelector'
import type { RouterSelectorEqualityFn } from './useStoreSelector'

/** 单个 KeepAlive 页面实例向业务页面公开的 React 上下文。 */
export interface RouterPageContextValue<
  Route extends RouterRoute = RouterRoute,
> {
  /** 当前页面所属的 RouterCore；页面可以通过它调用 jumpTo、smartNavigate 等命令。 */
  readonly router: RouterCore<Route>
  /** 当前页面实例最后对应的真实 pathname。 */
  readonly pathname: string
  /** 页面实例与页签共享的稳定身份。 */
  readonly tabKey: string
  /** 当前页面 pathname 从根到叶子的路由层级。 */
  readonly currentRoutes: readonly RouterCurrentRoute<Route>[]
  /** 页面实例当前是否实际显示；晚挂载的业务组件也可以立即读取该快照。 */
  readonly active: boolean
  /** 当前页签最后生效的完整地址；尚未收到宿主 location 时为 null。 */
  readonly location: RouterLocationEventPayload | null
}

/** RouterPageProvider 接收的最小页面渲染信息。 */
export interface RouterPageProviderProps<
  Route extends RouterRoute = RouterRoute,
> {
  /** 直接来自 RouterCoreState.pages 的页面描述。 */
  page: RouterPage<Route>
  /** 当前页面实例是否实际显示。 */
  active: boolean
  /** 使用页面级 pathname、路由层级和当前状态的业务页面子树。 */
  children: ReactNode
}

/** 页面 Context 保存可精确订阅的独立 vanilla Store，而不是频繁变化的普通对象。 */
const RouterPageContext = createContext<unknown>(null)

/**
 * 为一个由上层 UI 渲染的 RouterPage 建立页面级 React 生命周期边界。
 *
 * 本组件不负责决定渲染哪些 pages，也不生成任何 DOM。ProLayout 或调用方可以遍历
 * RouterCoreState.pages，自行实现 KeepAlive 容器后用本 Provider 包裹实际业务页面。
 */
export function RouterPageProvider<Route extends RouterRoute>(
  props: RouterPageProviderProps<Route>,
) {
  const { active, children, page } = props
  const router = useRouterCore<Route>()
  const [pageStore] = useState(() =>
    createStore<RouterPageContextValue<Route>>(() => ({
      router,
      pathname: page.pathname,
      tabKey: page.key,
      currentRoutes: router.getCurrentRoutes(page.pathname),
      active,
      location: null,
    })),
  )
  const [handleLocation] = useState(
    () => (location: RouterLocationEventPayload) => {
      pageStore.setState((state) => {
        // core 在建立订阅和宿主重复同步时都可能交付相同地址。相同快照继续复用
        // 原 state，避免 StrictMode 重放或重复 location 触发页面订阅者更新。
        if (isSameLocation(state.location, location))
          return state

        return { ...state, location }
      })
    },
  )

  useLayoutEffect(() => {
    // 共享动态页签切换真实 pathname 时要在浏览器绘制前更新页面 Context，避免宿主
    // 地址已经变化而业务页面仍读取到旧 pathname 的中间帧。
    pageStore.setState((state) => {
      const pageIdentityChanged = state.router !== router || state.tabKey !== page.key

      return {
        ...state,
        router,
        pathname: page.pathname,
        tabKey: page.key,
        currentRoutes: router.getCurrentRoutes(page.pathname),
        // 新页面身份尚未收到宿主地址时不能继续暴露旧页面 location；同一共享动态
        // 页签只改变真实 pathname，不重置已经由 core 推送的新地址快照。
        location: pageIdentityChanged ? null : state.location,
      }
    })
  }, [page.key, page.pathname, pageStore, router])

  useLayoutEffect(
    () => router.subscribePageLocation(page.key, handleLocation),
    [handleLocation, page.key, router],
  )

  useLayoutEffect(() => {
    pageStore.setState((state) => {
      // active 是页面当前状态而不是一次性事件。相同值返回原快照，晚挂载组件则可以
      // 直接通过 useRouterPageSelector 读取已经保存的值。
      if (state.active === active)
        return state

      return { ...state, active }
    })
  }, [active, pageStore])

  return (
    <RouterPageContext.Provider value={pageStore}>
      {children}
    </RouterPageContext.Provider>
  )
}

/**
 * 读取当前页面实例的完整上下文。
 *
 * @throws 在 RouterPageProvider 外调用时抛出明确错误，避免页面错误地订阅全局地址。
 */
export function useRouterPage<
  Route extends RouterRoute = RouterRoute,
>(): RouterPageContextValue<Route> {
  const store = useRouterPageStore<Route>()
  return useStoreSelector(store, identity)
}

/** 精确订阅当前页面实例上下文的一部分。 */
export function useRouterPageSelector<
  Route extends RouterRoute,
  Selected,
>(
  selector: (context: RouterPageContextValue<Route>) => Selected,
  equalityFn?: RouterSelectorEqualityFn<Selected>,
): Selected {
  const store = useRouterPageStore<Route>()
  return useStoreSelector(store, selector, equalityFn)
}

/** Context 的泛型只在 Hook 边界恢复，不改变内部 Store 的运行时结构。 */
function useRouterPageStore<Route extends RouterRoute>() {
  const store = useContext(RouterPageContext)
  if (!store)
    throw new Error('页面路由 Hook 必须在 RouterPageProvider 内调用。')

  return store as StoreApi<RouterPageContextValue<Route>>
}

/** 完整上下文订阅直接返回 Store 快照，不创建额外对象。 */
function identity<Route extends RouterRoute>(context: RouterPageContextValue<Route>) {
  return context
}

/** 比较页面地址快照，避免相同 location 生成新的 Store 状态。 */
function isSameLocation(
  left: RouterLocationEventPayload | null,
  right: RouterLocationEventPayload,
) {
  return (
    left?.pathname === right.pathname &&
    left.search === right.search &&
    left.hash === right.hash
  )
}
