/**
 * 文件职责：把一个已经创建好的 RouterCore 放进 React Context，并接上 React Router。
 *
 * Provider 不会替调用方创建 Core；它同步可变化的回调、启动一次持久化加载，把
 * React Router 的 navigate/location 交给 Core，并让后代取得同一个稳定实例。
 */
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import type { ReactNode } from 'react'
import type {
  RouterCore,
  RouterCoreState,
  RouterHost,
  RouterNavigate,
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
 * routes、hasAuth、keepAlive、storageAdapter、storageKey 和 maxFixedTabCount 等
 * 固定配置只传给 createRouterCore，Provider 不重复接收。这里只同步允许随 React
 * render 更新的回调引用。
 *
 * 本组件必须位于 React Router（BrowserRouter、MemoryRouter 等）内部。
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
 * 向 React 子树提供 RouterCore，同步运行时回调和持久化加载，并接上 React Router。
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
    onStorageError,
    onTabClose,
    router,
  } = props
  const location = useLocation()
  const reactRouterNavigate = useNavigate()
  const navigateRef = useRef(reactRouterNavigate)
  const redirectRequestKeyRef = useRef(0)
  const handledRedirectRequestKeyRef = useRef(0)
  const [redirectRequest, setRedirectRequest] = useState<{
    key: number
    target: Parameters<RouterNavigate>[0]
    options: Parameters<RouterNavigate>[1]
  } | null>(null)

  useLayoutEffect(() => {
    // 两个字段都显式传递，使移除回调 prop 时 core 也能清理旧回调引用。
    router.configureRuntime({
      onStorageError,
      onTabClose,
    })
  }, [onStorageError, onTabClose, router])

  useLayoutEffect(() => {
    // BrowserRouter/MemoryRouter 的 useNavigate 引用可能随 pathname 变化。Host 代表的
    // 是 Provider 生命周期而不是单次地址快照，因此只更新底层函数，不重新解绑 Host。
    navigateRef.current = reactRouterNavigate
  }, [reactRouterNavigate])

  // Host 对象在 Provider 生命周期内保持同一引用，pathname 变化不会触发解绑再绑定。
  const host = useMemo<RouterHost>(() => {
    const navigate: RouterNavigate = (target, options) => {
      // React Router 6/7 都接受与 RouterNavigateTarget 兼容的 string 或 pathname 对象。
      // 返回的 Promise（仅部分 Data Router 实现存在）不属于 Core 的同步宿主契约。
      void navigateRef.current(target, options)
    }

    const redirect: RouterNavigate = (target, options) => {
      // navigate 不能在 BrowserRouter 子组件的首次 layout effect 中执行：此时父级的
      // history listener 尚未挂载。这里只记录明确的重定向请求，由下面的 effect 执行。
      redirectRequestKeyRef.current += 1
      setRedirectRequest({
        key: redirectRequestKeyRef.current,
        target,
        options,
      })
    }

    return { navigate, redirect }
  }, [])

  useLayoutEffect(() => {
    router.bindHost(host)

    return () => {
      // Provider 卸载后必须清除失效的 React Router navigate 闭包，避免业务命令继续向
      // 已经卸载的 Router 发起导航。一个 Core 实例应只挂载一个 Provider。
      router.bindHost(null)
    }
  }, [host, router])

  useLayoutEffect(() => {
    // 地址必须以 React Router 最终确认的 location 为准。Core 命令只负责请求导航，
    // 浏览器前进后退、外部跳转和命令导航都会在这里汇合成同一条状态同步链路。
    router.syncLocation({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    })
  }, [location.hash, location.pathname, location.search, router])

  useEffect(() => {
    if (
      !redirectRequest ||
      handledRedirectRequestKeyRef.current === redirectRequest.key
    ) {
      return
    }

    // React Router 自身的 <Navigate> 同样在 effect 中执行导航。请求 key 保证
    // StrictMode 重放同一个 effect 时不会重复提交重定向。
    handledRedirectRequestKeyRef.current = redirectRequest.key
    void navigateRef.current(redirectRequest.target, redirectRequest.options)
  }, [redirectRequest])

  useEffect(() => {
    // hydrateStorage 自身负责 StrictMode 重放、并发复用和已完成状态判断。
    void router.hydrateStorage()
  }, [router])

  // 不在 Context value 中混入回调，避免回调更新使所有消费者被动重渲染。
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
